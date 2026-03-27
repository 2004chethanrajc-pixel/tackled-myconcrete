import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';
import { validateStatusTransition } from '../../utils/statusTransition.js';
import * as notificationService from '../../services/notificationService.js';


export const createPayment = async (paymentData, customerId) => {
  const { projectId, amount, type, paymentMethod, upiId } = paymentData;
  const db = getDB();

  // Verify project exists
  const [projects] = await db.execute(
    'SELECT id, name, customer_id, status FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Verify customer owns this project
  if (project.customer_id !== customerId) {
    throw new ApiError(403, 'You can only create payments for your own projects');
  }

  // Validate amount
  if (!amount || amount <= 0) {
    throw new ApiError(400, 'Amount must be greater than 0');
  }

  // Validate payment method
  if (!paymentMethod || !['cash', 'bank'].includes(paymentMethod)) {
    throw new ApiError(400, 'Payment method must be either cash or bank');
  }

  // If bank payment, upiId is required
  if (paymentMethod === 'bank' && !upiId) {
    throw new ApiError(400, 'UPI ID is required for bank payments');
  }

  // Handle advance payment
  if (type === 'advance') {
    // Verify project status is CUSTOMER_APPROVED
    if (project.status !== 'CUSTOMER_APPROVED') {
      throw new ApiError(400, 'Advance payment can only be created when project status is CUSTOMER_APPROVED');
    }

    // Check for duplicate advance payment
    const [existingAdvance] = await db.execute(
      'SELECT id FROM payments WHERE project_id = ? AND type = ?',
      [projectId, 'advance']
    );

    if (existingAdvance.length > 0) {
      throw new ApiError(400, 'Advance payment already exists for this project');
    }

    // Create payment
    const paymentId = uuidv4();
    await db.execute(
      `INSERT INTO payments (id, project_id, amount, type, payment_method, upi_id, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [paymentId, projectId, amount, type, paymentMethod, upiId || null]
    );

    // Update project status to ADVANCE_PENDING
    await db.execute(
      'UPDATE projects SET status = ? WHERE id = ?',
      ['ADVANCE_PENDING', projectId]
    );

    // Log action
    await logAudit('CREATE_PAYMENT', customerId, paymentId, `Created ${type} payment of ${amount} via ${paymentMethod} for project ${project.name}`);

    // Notify everyone about payment made (Finance, PM, Admin, Customer)
    try {
      await notificationService.notifyPaymentMade(
        projectId,
        project.name,
        'Advance',
        amount
      );
    } catch (error) {
      console.error('Error sending payment made notification:', error);
    }

    // Fetch created payment
    const [payments] = await db.execute(
      'SELECT id, project_id, amount, type, payment_method, upi_id, status, verified_by, verified_at, created_at FROM payments WHERE id = ?',
      [paymentId]
    );

    return payments[0];
  }

  // Handle final payment
  if (type === 'final') {
    // Verify project status allows final payment (WORK_STARTED or COMPLETED)
    if (project.status !== 'WORK_STARTED' && project.status !== 'COMPLETED') {
      throw new ApiError(400, 'Final payment can only be created when project status is WORK_STARTED or COMPLETED');
    }

    // Check for duplicate final payment
    const [existingFinal] = await db.execute(
      'SELECT id FROM payments WHERE project_id = ? AND type = ? AND status = ?',
      [projectId, 'final', 'completed']
    );

    if (existingFinal.length > 0) {
      throw new ApiError(400, 'Final payment already completed for this project');
    }

    // Fetch quotation to get total cost
    const [quotations] = await db.execute(
      'SELECT total_cost FROM quotations WHERE project_id = ?',
      [projectId]
    );

    if (quotations.length === 0) {
      throw new ApiError(404, 'Quotation not found for this project');
    }

    const totalCost = parseFloat(quotations[0].total_cost) || 0;

    // Calculate total paid (completed payments only, excluding extra charges)
    const [paymentSums] = await db.execute(
      'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE project_id = ? AND status = ? AND type != ?',
      [projectId, 'completed', 'extra']
    );

    const regularPaid = parseFloat(paymentSums[0].total_paid) || 0;

    // Calculate total verified extra charges
    const [extraChargesSums] = await db.execute(
      'SELECT COALESCE(SUM(amount), 0) as total_extra FROM payments WHERE project_id = ? AND type = ? AND status = ?',
      [projectId, 'extra', 'completed']
    );

    const totalExtraCharges = parseFloat(extraChargesSums[0].total_extra) || 0;

    // Total with extra charges
    const totalWithExtra = totalCost + totalExtraCharges;
    
    // Total already paid (regular + extra charges paid)
    const totalAlreadyPaid = regularPaid + totalExtraCharges;

    // Final amount = (Total Cost + Extra Charges) - (Regular Paid + Extra Paid)
    const remainingAmount = totalWithExtra - totalAlreadyPaid;

    // Validate amount equals remaining amount
    if (Math.abs(amount - remainingAmount) > 0.01) {
      throw new ApiError(400, `Final payment amount must be ${remainingAmount.toFixed(2)}. Total cost: ${totalCost.toFixed(2)}, Extra charges: ${totalExtraCharges.toFixed(2)}, Total with extra: ${totalWithExtra.toFixed(2)}, Regular paid: ${regularPaid.toFixed(2)}, Extra paid: ${totalExtraCharges.toFixed(2)}, Total already paid: ${totalAlreadyPaid.toFixed(2)}`);
    }

    if (remainingAmount <= 0) {
      throw new ApiError(400, 'No remaining amount to pay. All payments including extra charges have been completed.');
    }

    // Create payment (no status change yet)
    const paymentId = uuidv4();
    await db.execute(
      `INSERT INTO payments (id, project_id, amount, type, payment_method, upi_id, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [paymentId, projectId, amount, type, paymentMethod, upiId || null]
    );

    // Log action
    await logAudit('CREATE_PAYMENT', customerId, paymentId, `Created ${type} payment of ${amount} via ${paymentMethod} for project ${project.name} (Total: ${totalWithExtra.toFixed(2)}, Already paid: ${totalAlreadyPaid.toFixed(2)}, Extra charges: ${totalExtraCharges.toFixed(2)})`);

    // Notify everyone about final payment made (Finance, PM, Admin, Customer)
    try {
      await notificationService.notifyPaymentMade(
        projectId,
        project.name,
        'Final',
        amount
      );
    } catch (error) {
      console.error('Error sending payment made notification:', error);
    }

    // Fetch created payment
    const [payments] = await db.execute(
      'SELECT id, project_id, amount, type, payment_method, upi_id, status, verified_by, verified_at, created_at FROM payments WHERE id = ?',
      [paymentId]
    );

    return payments[0];
  }

  // Handle extra charge payment
  if (type === 'extra') {
    // Verify project status allows extra payment (not closed)
    if (project.status === 'CLOSED') {
      throw new ApiError(400, 'Cannot pay extra charges for a closed project');
    }

    // Create payment (no status change)
    const paymentId = uuidv4();
    await db.execute(
      `INSERT INTO payments (id, project_id, amount, type, payment_method, upi_id, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [paymentId, projectId, amount, type, paymentMethod, upiId || null]
    );

    // Log action
    await logAudit('CREATE_PAYMENT', customerId, paymentId, `Created ${type} payment of ${amount} via ${paymentMethod} for project ${project.name}`);

    // Fetch created payment
    const [payments] = await db.execute(
      'SELECT id, project_id, amount, type, payment_method, upi_id, status, verified_by, verified_at, created_at FROM payments WHERE id = ?',
      [paymentId]
    );

    return payments[0];
  }

  throw new ApiError(400, 'Invalid payment type. Must be advance, final, or extra');
};

export const verifyPayment = async (paymentId, financeId) => {
  const db = getDB();

  // Fetch payment
  const [payments] = await db.execute(
    'SELECT id, project_id, amount, type, status FROM payments WHERE id = ?',
    [paymentId]
  );

  if (payments.length === 0) {
    throw new ApiError(404, 'Payment not found');
  }

  const payment = payments[0];

  // Check if already verified
  if (payment.status === 'completed') {
    throw new ApiError(400, 'Payment is already verified');
  }

  // Verify payment status is pending
  if (payment.status !== 'pending') {
    throw new ApiError(400, 'Only pending payments can be verified');
  }

  // Fetch project
  const [projects] = await db.execute(
    'SELECT id, name, status FROM projects WHERE id = ?',
    [payment.project_id]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Update payment status
  await db.execute(
    'UPDATE payments SET status = ?, verified_by = ?, verified_at = NOW() WHERE id = ?',
    ['completed', financeId, paymentId]
  );

  // Update project status based on payment type
  if (payment.type === 'advance') {
    // Change status to ADVANCE_PAID
    await db.execute(
      'UPDATE projects SET status = ? WHERE id = ?',
      ['ADVANCE_PAID', payment.project_id]
    );
  } else if (payment.type === 'final') {
    // Change status to FINAL_PAID (from WORK_STARTED)
    await db.execute(
      'UPDATE projects SET status = ? WHERE id = ?',
      ['FINAL_PAID', payment.project_id]
    );
  }

  // Log action
  await logAudit('VERIFY_PAYMENT', financeId, paymentId, `Verified ${payment.type} payment of ${payment.amount} for project ${project.name}`);

  // Notify customer about payment verification
  try {
    const [projectDetails] = await db.execute(
      'SELECT customer_id FROM projects WHERE id = ?',
      [payment.project_id]
    );
    
    if (projectDetails.length > 0 && projectDetails[0].customer_id) {
      const paymentTypeMap = {
        'advance': 'Advance',
        'final': 'Final',
        'extra': 'Extra Charge'
      };
      await notificationService.notifyPaymentVerified(
        projectDetails[0].customer_id,
        project.name,
        paymentTypeMap[payment.type] || payment.type,
        payment.project_id
      );
    }
  } catch (error) {
    console.error('Error sending payment verified notification:', error);
  }

  // Fetch updated payment
  const [updatedPayments] = await db.execute(
    'SELECT id, project_id, amount, type, payment_method, upi_id, status, verified_by, verified_at, created_at FROM payments WHERE id = ?',
    [paymentId]
  );

  return updatedPayments[0];
};

export const getPaymentById = async (paymentId, userRole, userId) => {
  const db = getDB();

  // Fetch payment
  const [payments] = await db.execute(
    `SELECT id, project_id, amount, type, payment_method, upi_id, status, verified_by, verified_at, created_at 
     FROM payments 
     WHERE id = ?`,
    [paymentId]
  );

  if (payments.length === 0) {
    throw new ApiError(404, 'Payment not found');
  }

  const payment = payments[0];

  // Fetch project to verify access
  const [projects] = await db.execute(
    'SELECT id, pm_id, customer_id FROM projects WHERE id = ?',
    [payment.project_id]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Role-based access control
  if (userRole === 'super_admin' || userRole === 'admin' || userRole === 'finance') {
    // Can see all payments
  } else if (userRole === 'project_manager') {
    if (project.pm_id !== userId) {
      throw new ApiError(403, 'You can only view payments for your assigned projects');
    }
  } else if (userRole === 'customer') {
    if (project.customer_id !== userId) {
      throw new ApiError(403, 'You can only view payments for your projects');
    }
  } else {
    throw new ApiError(403, 'Not authorized to view this payment');
  }

  // Fetch related quotation
  const [quotations] = await db.execute(
    `SELECT id, project_id, material_cost, labour_cost, transport_cost, other_cost, total_cost, generated_by, approved, approved_at, created_at 
     FROM quotations 
     WHERE project_id = ?`,
    [payment.project_id]
  );

  const quotation = quotations.length > 0 ? quotations[0] : null;

  return {
    payment,
    quotation
  };
};

export const getPaymentsByProject = async (projectId, userRole, userId) => {
  const db = getDB();

  // Verify project exists
  const [projects] = await db.execute(
    'SELECT id, pm_id, customer_id FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Role-based access control
  if (userRole === 'super_admin' || userRole === 'admin' || userRole === 'finance') {
    // Can see all payments
  } else if (userRole === 'project_manager') {
    if (project.pm_id !== userId) {
      throw new ApiError(403, 'You can only view payments for your assigned projects');
    }
  } else if (userRole === 'customer') {
    if (project.customer_id !== userId) {
      throw new ApiError(403, 'You can only view payments for your projects');
    }
  } else {
    throw new ApiError(403, 'Not authorized to view payments');
  }

  // Fetch payments for the project
  const [payments] = await db.execute(
    `SELECT id, project_id, amount, type, payment_method, upi_id, status, verified_by, verified_at, created_at 
     FROM payments 
     WHERE project_id = ? 
     ORDER BY created_at DESC`,
    [projectId]
  );

  return payments;
};


// Finance creates extra charges/additional payments
export const createExtraCharge = async (chargeData, financeId) => {
  const { projectId, amount, description } = chargeData;
  const db = getDB();

  // Verify project exists
  const [projects] = await db.execute(
    'SELECT id, name, status FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Cannot add extra charges after project is closed
  if (project.status === 'CLOSED') {
    throw new ApiError(400, 'Cannot add extra charges to a closed project');
  }

  // Validate amount
  if (!amount || amount <= 0) {
    throw new ApiError(400, 'Amount must be greater than 0');
  }

  // Validate description
  if (!description || description.trim() === '') {
    throw new ApiError(400, 'Description is required for extra charges');
  }

  // Create extra charge payment (type = 'extra', status = 'pending', payment_method = NULL initially)
  const paymentId = uuidv4();
  
  // Try to insert with description and created_by columns
  try {
    await db.execute(
      `INSERT INTO payments (id, project_id, amount, type, payment_method, upi_id, status, description, created_by, created_at) 
       VALUES (?, ?, ?, 'extra', NULL, NULL, 'pending', ?, ?, NOW())`,
      [paymentId, projectId, amount, description.trim(), financeId]
    );
  } catch (err) {
    // If columns don't exist, use basic insert
    console.error('Error inserting with description/created_by, trying basic insert:', err.message);
    await db.execute(
      `INSERT INTO payments (id, project_id, amount, type, payment_method, status, created_at) 
       VALUES (?, ?, ?, 'extra', NULL, 'pending', NOW())`,
      [paymentId, projectId, amount]
    );
  }

  // Log action
  await logAudit('CREATE_EXTRA_CHARGE', financeId, paymentId, `Created extra charge of ${amount} for project ${project.name}: ${description}`);

  // Fetch created payment (handle case where description/created_by columns might not exist)
  try {
    const [payments] = await db.execute(
      'SELECT id, project_id, amount, type, payment_method, upi_id, status, description, created_by, verified_by, verified_at, created_at FROM payments WHERE id = ?',
      [paymentId]
    );
    return payments[0];
  } catch (err) {
    // If columns don't exist, fetch without them
    const [payments] = await db.execute(
      'SELECT id, project_id, amount, type, payment_method, upi_id, status, verified_by, verified_at, created_at FROM payments WHERE id = ?',
      [paymentId]
    );
    return payments[0];
  }
};


// Customer pays an extra charge
export const payExtraCharge = async (paymentId, paymentData, customerId) => {
  const { paymentMethod, upiId } = paymentData;
  const db = getDB();

  // Fetch payment
  const [payments] = await db.execute(
    'SELECT id, project_id, amount, type, status FROM payments WHERE id = ?',
    [paymentId]
  );

  if (payments.length === 0) {
    throw new ApiError(404, 'Payment not found');
  }

  const payment = payments[0];

  // Verify it's an extra charge
  if (payment.type !== 'extra') {
    throw new ApiError(400, 'This endpoint is only for extra charges');
  }

  // Verify payment is pending
  if (payment.status !== 'pending') {
    throw new ApiError(400, 'This extra charge has already been paid');
  }

  // Fetch project to verify customer ownership
  const [projects] = await db.execute(
    'SELECT id, name, customer_id, status FROM projects WHERE id = ?',
    [payment.project_id]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Verify customer owns this project
  if (project.customer_id !== customerId) {
    throw new ApiError(403, 'You can only pay extra charges for your own projects');
  }

  // Validate payment method
  if (!paymentMethod || !['cash', 'bank'].includes(paymentMethod)) {
    throw new ApiError(400, 'Payment method must be either cash or bank');
  }

  // If bank payment, upiId is required
  if (paymentMethod === 'bank' && !upiId) {
    throw new ApiError(400, 'UPI ID is required for bank payments');
  }

  // Update payment with payment method and UPI
  await db.execute(
    'UPDATE payments SET payment_method = ?, upi_id = ? WHERE id = ?',
    [paymentMethod, upiId || null, paymentId]
  );

  // Log action
  await logAudit('PAY_EXTRA_CHARGE', customerId, paymentId, `Paid extra charge of ${payment.amount} via ${paymentMethod} for project ${project.name}`);

  // Notify everyone about extra charge payment made (Finance, PM, Admin, Customer)
  try {
    await notificationService.notifyPaymentMade(
      payment.project_id,
      project.name,
      'Extra Charge',
      payment.amount
    );
  } catch (error) {
    console.error('Error sending payment made notification:', error);
  }

  // Fetch updated payment (handle case where description/created_by columns might not exist)
  try {
    const [updatedPayments] = await db.execute(
      'SELECT id, project_id, amount, type, payment_method, upi_id, status, description, created_by, verified_by, verified_at, created_at FROM payments WHERE id = ?',
      [paymentId]
    );
    return updatedPayments[0];
  } catch (err) {
    // If columns don't exist, fetch without them
    const [updatedPayments] = await db.execute(
      'SELECT id, project_id, amount, type, payment_method, upi_id, status, verified_by, verified_at, created_at FROM payments WHERE id = ?',
      [paymentId]
    );
    return updatedPayments[0];
  }
};
