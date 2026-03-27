import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';
import * as notificationService from '../../services/notificationService.js';

const generateOrderNumber = async (db) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [rows] = await db.execute(`SELECT COUNT(*) as cnt FROM orders WHERE DATE(created_at) = CURDATE()`);
  const seq = String(rows[0].cnt + 1).padStart(4, '0');
  return `ORD-${dateStr}-${seq}`;
};

// Notify finance users about a payment event
const notifyFinance = async (db, title, body, data) => {
  try {
    const [finance] = await db.execute(`SELECT id FROM users WHERE role = 'finance' AND is_active = 1`);
    const ids = finance.map(f => f.id);
    if (ids.length > 0) {
      await notificationService.sendPushNotification(ids, title, body, data);
    }
  } catch (e) { console.error('Finance notification error:', e); }
};

// Notify admins
const notifyAdmins = async (db, title, body, data) => {
  try {
    const [admins] = await db.execute(`SELECT id FROM users WHERE role IN ('admin','super_admin') AND is_active = 1`);
    const ids = admins.map(a => a.id);
    if (ids.length > 0) {
      await notificationService.sendPushNotification(ids, title, body, data);
    }
  } catch (e) { console.error('Admin notification error:', e); }
};

// Notify all stakeholders of an order (deduped, excluding specified ids)
const notifyOrderStakeholders = async (db, order, title, body, data, excludeIds = []) => {
  try {
    const [admins] = await db.execute(`SELECT id FROM users WHERE role IN ('admin','super_admin') AND is_active = 1`);
    const recipients = new Set();
    if (order.customer_id && !excludeIds.includes(order.customer_id)) recipients.add(order.customer_id);
    if (order.assigned_pm && !excludeIds.includes(order.assigned_pm)) recipients.add(order.assigned_pm);
    if (order.assigned_finance && !excludeIds.includes(order.assigned_finance)) recipients.add(order.assigned_finance);
    admins.forEach(a => { if (!excludeIds.includes(a.id)) recipients.add(a.id); });
    const ids = [...recipients];
    if (ids.length > 0) {
      await notificationService.sendPushNotification(ids, title, body, data);
    }
  } catch (e) { console.error('Order stakeholder notification error:', e); }
};

// Get all orders
export const getOrders = async (userRole, userId) => {
  const db = getDB();
  let query = `
    SELECT o.*,
      u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
      f.name AS assigned_finance_name,
      pm.name AS assigned_pm_name,
      p.name AS project_name
    FROM orders o
    LEFT JOIN users u ON o.customer_id = u.id
    LEFT JOIN users f ON o.assigned_finance = f.id
    LEFT JOIN users pm ON o.assigned_pm = pm.id
    LEFT JOIN projects p ON o.project_id = p.id
  `;
  const params = [];
  if (userRole === 'customer') {
    query += ' WHERE o.customer_id = ?';
    params.push(userId);
  } else if (userRole === 'finance') {
    query += ' WHERE o.assigned_finance = ?';
    params.push(userId);
  } else if (userRole === 'project_manager') {
    query += ' WHERE o.assigned_pm = ?';
    params.push(userId);
  }
  query += ' ORDER BY o.created_at DESC';
  const [rows] = await db.execute(query, params);
  return rows;
};

// Get single order
export const getOrderById = async (orderId, userRole, userId) => {
  const db = getDB();
  const [rows] = await db.execute(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
      f.name AS assigned_finance_name, pm.name AS assigned_pm_name,
      p.name AS project_name
     FROM orders o
     LEFT JOIN users u ON o.customer_id = u.id
     LEFT JOIN users f ON o.assigned_finance = f.id
     LEFT JOIN users pm ON o.assigned_pm = pm.id
     LEFT JOIN projects p ON o.project_id = p.id
     WHERE o.id = ?`,
    [orderId]
  );
  if (rows.length === 0) throw new ApiError(404, 'Order not found');
  const order = rows[0];
  if (userRole === 'customer' && order.customer_id !== userId) throw new ApiError(403, 'Access denied');
  if (userRole === 'project_manager' && order.assigned_pm !== userId) throw new ApiError(403, 'Access denied');
  return order;
};

// Create order
// - Admin: status = 'placed', can set amounts immediately
// - Customer: status = 'pending_approval', no amounts (admin sets later)
export const createOrder = async (data, createdBy, creatorRole) => {
  const db = getDB();
  const {
    customerId, productType, productDescription, quantity, unit,
    deliveryAddress, floor, notes, unitPrice, totalAmount, advanceAmount,
    assignedFinance, assignedPm, driverName, driverPhone, vehicleNumber, projectId,
  } = data;

  const targetCustomerId = creatorRole === 'customer' ? createdBy : customerId;

  const [customers] = await db.execute('SELECT id, name FROM users WHERE id = ? AND role = ?', [targetCustomerId, 'customer']);
  if (customers.length === 0) throw new ApiError(404, 'Customer not found');

  const orderId = uuidv4();
  const orderNumber = await generateOrderNumber(db);
  const isAdmin = ['admin', 'super_admin'].includes(creatorRole);
  const initialStatus = isAdmin ? 'placed' : 'pending_approval';

  await db.execute(
    `INSERT INTO orders
      (id, order_number, customer_id, created_by, product_type, product_description,
       quantity, unit, unit_price, total_amount, advance_amount,
       delivery_address, floor, driver_name, driver_phone, vehicle_number, project_id,
       notes, status, assigned_finance, assigned_pm, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      orderId, orderNumber, targetCustomerId, createdBy,
      productType, productDescription || null,
      quantity, unit || 'units',
      isAdmin && unitPrice ? unitPrice : null,
      isAdmin && totalAmount ? totalAmount : null,
      isAdmin && advanceAmount ? advanceAmount : null,
      deliveryAddress || null,
      floor || null,
      driverName || null,
      driverPhone || null,
      vehicleNumber || null,
      projectId || null,
      notes || null,
      initialStatus,
      isAdmin && assignedFinance ? assignedFinance : null,
      isAdmin && assignedPm ? assignedPm : null,
    ]
  );

  await logAudit('CREATE_ORDER', createdBy, orderId, `Created order ${orderNumber}`);

  if (creatorRole === 'customer') {
    // Notify admins that a new order needs approval
    await notifyAdmins(db, 'New Order - Approval Needed',
      `Order ${orderNumber} by ${customers[0].name} needs your approval`,
      { type: 'order', orderId, action: 'view_orders' }
    );
  } else {
    // Admin created order — notify the customer
    try {
      await notificationService.sendPushNotification(
        [targetCustomerId],
        'New Order Placed',
        `Order ${orderNumber} has been placed for you. Advance: ₹${advanceAmount || 0}`,
        { type: 'order', orderId, action: 'view_orders' }
      );
    } catch (e) { console.error('Customer order notification error:', e); }
    // Also notify assigned PM and finance if set
    if (isAdmin && assignedPm) {
      try {
        await notificationService.sendPushNotification(
          [assignedPm],
          'Order Assigned to You',
          `Order ${orderNumber} has been assigned to you`,
          { type: 'order', orderId, action: 'view_orders' }
        );
      } catch (e) { console.error('PM order notification error:', e); }
    }
    if (isAdmin && assignedFinance) {
      try {
        await notificationService.sendPushNotification(
          [assignedFinance],
          'Order Assigned to You',
          `Order ${orderNumber} has been assigned to you for finance management`,
          { type: 'order', orderId, action: 'view_orders' }
        );
      } catch (e) { console.error('Finance order notification error:', e); }
    }
  }

  const [created] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  return created[0];
};

// Admin approves a customer order and sets amounts
export const approveOrder = async (orderId, data, adminId) => {
  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (rows.length === 0) throw new ApiError(404, 'Order not found');
  const order = rows[0];

  if (order.status !== 'pending_approval') throw new ApiError(400, 'Order is not pending approval');

  const { unitPrice, totalAmount, advanceAmount, notes } = data;
  if (!totalAmount) throw new ApiError(400, 'Total amount is required to approve');
  if (!advanceAmount) throw new ApiError(400, 'Advance amount is required to approve');

  const fields = [
    'status = ?', 'total_amount = ?', 'advance_amount = ?', 'updated_at = NOW()',
  ];
  const params = ['placed', totalAmount, advanceAmount];

  if (unitPrice) { fields.splice(3, 0, 'unit_price = ?'); params.splice(3, 0, unitPrice); }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }

  params.push(orderId);
  await db.execute(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, params);
  await logAudit('APPROVE_ORDER', adminId, orderId, `Approved order ${order.order_number}`);

  // Notify customer + all stakeholders
  try {
    const [updated] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    await notifyOrderStakeholders(db, updated[0],
      'Order Approved',
      `Order ${order.order_number} has been approved. Advance required: ₹${advanceAmount}`,
      { type: 'order', orderId, action: 'view_orders' },
      [adminId]
    );
  } catch (e) { console.error('Notification error:', e); }

  const [updated] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  return updated[0];
};

// Admin/PM updates order: admin can update amounts+status, PM can only update status
export const updateOrder = async (orderId, data, adminId, userRole) => {
  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (rows.length === 0) throw new ApiError(404, 'Order not found');
  const order = rows[0];

  const isPM = userRole === 'project_manager';
  if (isPM && order.assigned_pm !== adminId) throw new ApiError(403, 'Access denied');

  const { unitPrice, totalAmount, advanceAmount, status, notes, productDescription, quantity, unit, deliveryAddress, assignedPm, assignedFinance, customerId, floor, driverName, driverPhone, vehicleNumber, projectId } = data;
  const fields = [];
  const params = [];

  // PM can only change status + driver/vehicle/project fields
  if (!isPM) {
    if (customerId !== undefined) {
      // Validate customer exists
      const [cust] = await db.execute('SELECT id FROM users WHERE id = ? AND role = ?', [customerId, 'customer']);
      if (cust.length === 0) throw new ApiError(404, 'Customer not found');
      fields.push('customer_id = ?'); params.push(customerId);
    }
    if (unitPrice !== undefined) { fields.push('unit_price = ?'); params.push(unitPrice); }
    if (totalAmount !== undefined) { fields.push('total_amount = ?'); params.push(totalAmount); }
    if (advanceAmount !== undefined) { fields.push('advance_amount = ?'); params.push(advanceAmount); }
    if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
    if (productDescription !== undefined) { fields.push('product_description = ?'); params.push(productDescription); }
    if (quantity !== undefined) { fields.push('quantity = ?'); params.push(quantity); }
    if (unit !== undefined) { fields.push('unit = ?'); params.push(unit); }
    if (deliveryAddress !== undefined) { fields.push('delivery_address = ?'); params.push(deliveryAddress); }
    if (floor !== undefined) { fields.push('floor = ?'); params.push(floor || null); }
    if (assignedFinance !== undefined) { fields.push('assigned_finance = ?'); params.push(assignedFinance || null); }
    if (assignedPm !== undefined) { fields.push('assigned_pm = ?'); params.push(assignedPm || null); }
  }

  // Both admin and PM can update driver/vehicle/project fields
  if (driverName !== undefined) { fields.push('driver_name = ?'); params.push(driverName || null); }
  if (driverPhone !== undefined) { fields.push('driver_phone = ?'); params.push(driverPhone || null); }
  if (vehicleNumber !== undefined) { fields.push('vehicle_number = ?'); params.push(vehicleNumber || null); }
  if (projectId !== undefined) { fields.push('project_id = ?'); params.push(projectId || null); }

  if (status && status !== order.status) {
    const validTransitions = {
      pending_approval: ['placed', 'cancelled'],
      placed: ['assigned', 'cancelled'],
      assigned: ['dispatched', 'cancelled'],
      dispatched: ['delivered'],
      delivered: ['invoiced'],
      invoiced: [],
      cancelled: [],
    };
    if (!validTransitions[order.status]?.includes(status)) {
      throw new ApiError(400, `Cannot transition from ${order.status} to ${status}`);
    }
    fields.push('status = ?'); params.push(status);
    if (status === 'dispatched') fields.push('dispatched_at = NOW()');
    if (status === 'delivered') fields.push('delivered_at = NOW()');
    if (status === 'invoiced') fields.push('invoiced_at = NOW()');
  }

  if (fields.length === 0) throw new ApiError(400, 'No fields to update');
  fields.push('updated_at = NOW()');
  params.push(orderId);

  await db.execute(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, params);
  await logAudit('UPDATE_ORDER', adminId, orderId, `Updated order ${order.order_number}`);

  // Notify on status change — all stakeholders
  if (status && status !== order.status) {
    try {
      const statusLabels = {
        placed: 'Placed',
        assigned: 'Assigned',
        dispatched: 'Dispatched',
        delivered: 'Delivered',
        invoiced: 'Invoiced',
        cancelled: 'Cancelled',
      };
      const [updatedOrder] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
      await notifyOrderStakeholders(db, updatedOrder[0],
        'Order Status Updated',
        `Order ${order.order_number} is now ${statusLabels[status] || status}`,
        { type: 'order', orderId, action: 'view_orders' },
        [adminId]
      );
    } catch (e) { console.error('Notification error:', e); }
  }

  // Notify newly assigned PM
  if (!isPM && assignedPm && assignedPm !== order.assigned_pm) {
    try {
      await notificationService.sendPushNotification(
        [assignedPm],
        'Order Assigned to You',
        `Order ${order.order_number} has been assigned to you`,
        { type: 'order', orderId, action: 'view_orders' }
      );
    } catch (e) { console.error('PM assignment notification error:', e); }
  }

  // Notify newly assigned finance
  if (!isPM && assignedFinance && assignedFinance !== order.assigned_finance) {
    try {
      await notificationService.sendPushNotification(
        [assignedFinance],
        'Order Assigned to You',
        `Order ${order.order_number} has been assigned to you for finance management`,
        { type: 'order', orderId, action: 'view_orders' }
      );
    } catch (e) { console.error('Finance assignment notification error:', e); }
  }

  const [updated] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  return updated[0];
};

// Customer pays advance — notifies finance
export const payAdvance = async (orderId, data, customerId) => {
  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (rows.length === 0) throw new ApiError(404, 'Order not found');
  const order = rows[0];

  if (order.customer_id !== customerId) throw new ApiError(403, 'Access denied');
  if (order.advance_paid) throw new ApiError(400, 'Advance already paid');
  if (!order.advance_amount) throw new ApiError(400, 'Advance amount not set by admin yet');
  if (order.status === 'pending_approval') throw new ApiError(400, 'Order not yet approved by admin');

  const { paymentMethod, upiId } = data;
  if (!['cash', 'bank'].includes(paymentMethod)) throw new ApiError(400, 'Invalid payment method');
  if (paymentMethod === 'bank' && !upiId) throw new ApiError(400, 'UPI ID required for bank payment');

  await db.execute(
    `UPDATE orders SET advance_paid = 1, advance_paid_at = NOW(), advance_payment_method = ?, advance_upi_id = ?, updated_at = NOW() WHERE id = ?`,
    [paymentMethod, upiId || null, orderId]
  );

  await logAudit('ORDER_ADVANCE_PAID', customerId, orderId, `Advance paid for order ${order.order_number}`);

  // Notify finance to verify
  const financeTargets = order.assigned_finance ? [order.assigned_finance] : null;
  if (financeTargets) {
    await notificationService.sendPushNotification(
      financeTargets,
      'Order Advance Payment - Verify',
      `Advance of ₹${order.advance_amount} paid for order ${order.order_number}. Please verify.`,
      { type: 'order_payment', orderId, paymentType: 'advance', action: 'view_orders' }
    );
  } else {
    await notifyFinance(db,
      'Order Advance Payment - Verify',
      `Advance of ₹${order.advance_amount} paid for order ${order.order_number}. Please verify.`,
      { type: 'order_payment', orderId, paymentType: 'advance', action: 'view_orders' }
    );
  }
  // Also notify admins and PM
  await notifyAdmins(db,
    'Order Advance Paid',
    `Advance of ₹${order.advance_amount} paid for order ${order.order_number}`,
    { type: 'order', orderId, action: 'view_orders' }
  );
  if (order.assigned_pm) {
    try {
      await notificationService.sendPushNotification(
        [order.assigned_pm],
        'Order Advance Paid',
        `Advance of ₹${order.advance_amount} paid for order ${order.order_number}`,
        { type: 'order', orderId, action: 'view_orders' }
      );
    } catch (e) { console.error('PM advance notification error:', e); }
  }

  const [updated] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  return updated[0];
};

// Customer pays balance — notifies finance
export const payBalance = async (orderId, data, customerId) => {
  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (rows.length === 0) throw new ApiError(404, 'Order not found');
  const order = rows[0];

  if (order.customer_id !== customerId) throw new ApiError(403, 'Access denied');
  if (order.balance_paid) throw new ApiError(400, 'Balance already paid');
  if (!order.total_amount) throw new ApiError(400, 'Total amount not set by admin yet');
  if (!order.advance_paid) throw new ApiError(400, 'Please pay advance first');

  const { paymentMethod, upiId } = data;
  if (!['cash', 'bank'].includes(paymentMethod)) throw new ApiError(400, 'Invalid payment method');
  if (paymentMethod === 'bank' && !upiId) throw new ApiError(400, 'UPI ID required for bank payment');

  await db.execute(
    `UPDATE orders SET balance_paid = 1, balance_paid_at = NOW(), balance_payment_method = ?, balance_upi_id = ?, updated_at = NOW() WHERE id = ?`,
    [paymentMethod, upiId || null, orderId]
  );

  await logAudit('ORDER_BALANCE_PAID', customerId, orderId, `Balance paid for order ${order.order_number}`);

  // Notify finance to verify
  const financeTargets = order.assigned_finance ? [order.assigned_finance] : null;
  if (financeTargets) {
    await notificationService.sendPushNotification(
      financeTargets,
      'Order Balance Payment - Verify',
      `Balance payment for order ${order.order_number}. Please verify.`,
      { type: 'order_payment', orderId, paymentType: 'balance', action: 'view_orders' }
    );
  } else {
    await notifyFinance(db,
      'Order Balance Payment - Verify',
      `Balance payment for order ${order.order_number}. Please verify.`,
      { type: 'order_payment', orderId, paymentType: 'balance', action: 'view_orders' }
    );
  }
  // Also notify admins and PM
  await notifyAdmins(db,
    'Order Balance Paid',
    `Balance payment made for order ${order.order_number}`,
    { type: 'order', orderId, action: 'view_orders' }
  );
  if (order.assigned_pm) {
    try {
      await notificationService.sendPushNotification(
        [order.assigned_pm],
        'Order Balance Paid',
        `Balance payment made for order ${order.order_number}`,
        { type: 'order', orderId, action: 'view_orders' }
      );
    } catch (e) { console.error('PM balance notification error:', e); }
  }

  const [updated] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  return updated[0];
};

// Finance verifies advance or balance payment
export const verifyPayment = async (orderId, paymentType, financeId) => {
  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (rows.length === 0) throw new ApiError(404, 'Order not found');
  const order = rows[0];

  if (paymentType === 'advance') {
    if (!order.advance_paid) throw new ApiError(400, 'Advance not paid yet');
    if (order.advance_verified) throw new ApiError(400, 'Advance already verified');
    await db.execute(
      `UPDATE orders SET advance_verified = 1, advance_verified_at = NOW(), advance_verified_by = ?, updated_at = NOW() WHERE id = ?`,
      [financeId, orderId]
    );
    await logAudit('VERIFY_ORDER_ADVANCE', financeId, orderId, `Advance verified for order ${order.order_number}`);
  } else if (paymentType === 'balance') {
    if (!order.balance_paid) throw new ApiError(400, 'Balance not paid yet');
    if (order.balance_verified) throw new ApiError(400, 'Balance already verified');
    await db.execute(
      `UPDATE orders SET balance_verified = 1, balance_verified_at = NOW(), balance_verified_by = ?, updated_at = NOW() WHERE id = ?`,
      [financeId, orderId]
    );
    await logAudit('VERIFY_ORDER_BALANCE', financeId, orderId, `Balance verified for order ${order.order_number}`);
  } else {
    throw new ApiError(400, 'Invalid payment type');
  }

  // Notify all stakeholders about payment verification
  try {
    const [updatedOrder] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    const paymentLabel = paymentType === 'advance' ? 'Advance' : 'Balance';
    await notifyOrderStakeholders(db, updatedOrder[0],
      `Order ${paymentLabel} Payment Verified`,
      `${paymentLabel} payment for order ${order.order_number} has been verified`,
      { type: 'order', orderId, action: 'view_orders' },
      [financeId]
    );
  } catch (e) { console.error('Notification error:', e); }

  const [updated] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  return updated[0];
};

// Cancel order
export const cancelOrder = async (orderId, userId, userRole) => {
  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (rows.length === 0) throw new ApiError(404, 'Order not found');
  const order = rows[0];

  if (userRole === 'customer' && order.customer_id !== userId) throw new ApiError(403, 'Access denied');
  if (['delivered', 'invoiced'].includes(order.status)) throw new ApiError(400, 'Cannot cancel a delivered or invoiced order');

  await db.execute(`UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ?`, [orderId]);
  await logAudit('CANCEL_ORDER', userId, orderId, `Cancelled order ${order.order_number}`);

  // Notify all stakeholders about cancellation
  try {
    const [updatedOrder] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    await notifyOrderStakeholders(db, updatedOrder[0],
      'Order Cancelled',
      `Order ${order.order_number} has been cancelled`,
      { type: 'order', orderId, action: 'view_orders' },
      [userId]
    );
  } catch (e) { console.error('Cancel notification error:', e); }

  const [updated] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  return updated[0];
};
