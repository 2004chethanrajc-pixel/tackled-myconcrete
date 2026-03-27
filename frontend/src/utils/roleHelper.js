export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  SITE_INCHARGE: 'site_incharge',
  CUSTOMER: 'customer',
  FINANCE: 'finance',
};

export const getHomeScreenForRole = (role) => {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return 'SuperAdminHome';
    case ROLES.ADMIN:
      return 'AdminHome';
    case ROLES.PROJECT_MANAGER:
      return 'PMHome';
    case ROLES.SITE_INCHARGE:
      return 'SiteHome';
    case ROLES.CUSTOMER:
      return 'CustomerHome';
    case ROLES.FINANCE:
      return 'FinanceHome';
    default:
      return 'Login';
  }
};

export const hasRole = (userRole, allowedRoles) => {
  return allowedRoles.includes(userRole);
};
