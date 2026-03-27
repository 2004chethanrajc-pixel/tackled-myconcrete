/**
 * Utility functions for displaying project status
 * Main status = Work progress only
 * Payment status = Derived from payments table (shown in Payment Summary)
 */

export const getWorkStatus = (status) => {
  switch (status) {
    case 'CREATED':
      return 'Created';
    case 'PM_ASSIGNED':
      return 'PM Assigned';
    case 'VISIT_DONE':
      return 'Visit Done';
    case 'REPORT_SUBMITTED':
      return 'Report Submitted';
    case 'QUOTATION_GENERATED':
      return 'Quotation Generated';
    case 'CUSTOMER_APPROVED':
      return 'Approved';
    case 'WORK_STARTED':
      return 'In Progress';
    case 'COMPLETED':
      return 'Completed';
    case 'FINAL_PAID':
      return 'Final Paid';
    case 'CLOSED':
      return 'Closed';
    default:
      return status ? status.replace(/_/g, ' ') : 'Unknown';
  }
};

export const getPaymentStatusFromPayments = (payments) => {
  if (!payments || payments.length === 0) {
    return 'No Payment';
  }

  const advancePayment = payments.find(p => p.type === 'advance');
  const finalPayment = payments.find(p => p.type === 'final');

  const advanceCompleted = advancePayment && advancePayment.status === 'completed';
  const advancePending = advancePayment && advancePayment.status === 'pending';
  const finalCompleted = finalPayment && finalPayment.status === 'completed';
  const finalPending = finalPayment && finalPayment.status === 'pending';

  if (finalCompleted) {
    return 'Fully Paid';
  } else if (finalPending) {
    return 'Final Pending';
  } else if (advanceCompleted) {
    return 'Advance Paid';
  } else if (advancePending) {
    return 'Advance Pending';
  }

  return 'No Payment';
};

export const getCombinedStatus = (status, payments) => {
  const work = getWorkStatus(status);
  const payment = getPaymentStatusFromPayments(payments);
  return `Work: ${work} | Payment: ${payment}`;
};

export const getShortCombinedStatus = (status, payments) => {
  const work = getWorkStatus(status);
  const payment = getPaymentStatusFromPayments(payments);
  
  // Shorter version for cards
  const shortWork = work === 'In Progress' ? 'In Progress' :
                    work === 'Completed' ? 'Completed' :
                    work === 'Closed' ? 'Closed' : work;
  
  const shortPayment = payment === 'No Payment' ? 'No Payment' : 
                       payment === 'Advance Pending' ? 'Adv. Pending' :
                       payment === 'Advance Paid' ? 'Adv. Paid' :
                       payment === 'Final Pending' ? 'Final Pending' :
                       payment === 'Fully Paid' ? 'Fully Paid' : payment;
  
  return `${shortWork} | ${shortPayment}`;
};
