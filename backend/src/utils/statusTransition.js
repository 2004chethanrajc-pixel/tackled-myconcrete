const STATUS_TRANSITIONS = {
  CREATED: { next: 'PM_ASSIGNED', allowedRoles: ['admin', 'super_admin'] },
  PM_ASSIGNED: { next: 'VISIT_DONE', allowedRoles: ['project_manager', 'super_admin'] },
  VISIT_DONE: { next: 'REPORT_SUBMITTED', allowedRoles: ['site_incharge', 'super_admin'] },
  REPORT_SUBMITTED: { next: 'QUOTATION_GENERATED', allowedRoles: ['finance', 'super_admin'] },
  QUOTATION_GENERATED: { next: 'CUSTOMER_APPROVED', allowedRoles: ['customer', 'super_admin'] },
  CUSTOMER_APPROVED: { next: 'ADVANCE_PENDING', allowedRoles: ['customer', 'super_admin'] },
  ADVANCE_PENDING: { next: 'ADVANCE_PAID', allowedRoles: ['finance', 'super_admin'] },
  ADVANCE_PAID: { next: 'WORK_STARTED', allowedRoles: ['project_manager', 'super_admin'] },
  WORK_STARTED: { next: 'COMPLETED', allowedRoles: ['project_manager', 'super_admin'] },  // PM marks work completed
  COMPLETED: { next: 'FINAL_PAID', allowedRoles: ['finance', 'super_admin'] },  // Finance verifies final payment
  FINAL_PAID: { next: 'CLOSED', allowedRoles: ['admin', 'super_admin'] }  // Admin closes project
};

export const validateStatusTransition = (currentStatus, newStatus, userRole) => {
  const transition = STATUS_TRANSITIONS[currentStatus];

  if (!transition) {
    return { valid: false, message: `Invalid current status: ${currentStatus}` };
  }

  if (transition.next !== newStatus) {
    return { 
      valid: false, 
      message: `Cannot transition from ${currentStatus} to ${newStatus}. Expected: ${transition.next}` 
    };
  }

  if (!transition.allowedRoles.includes(userRole)) {
    return { 
      valid: false, 
      message: `Role ${userRole} is not authorized to perform this transition` 
    };
  }

  return { valid: true };
};

export const getNextStatus = (currentStatus) => {
  return STATUS_TRANSITIONS[currentStatus]?.next || null;
};
