import { Expo } from 'expo-server-sdk';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/db.js';

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notification to specific users
 */
export const sendPushNotification = async (userIds, title, body, data = {}) => {
  try {
    const db = getDB();
    
    // Ensure userIds is an array
    const userIdArray = Array.isArray(userIds) ? userIds : [userIds];
    
    // Get push tokens for users
    const [tokens] = await db.execute(
      `SELECT push_token, user_id FROM push_tokens WHERE user_id IN (${userIdArray.map(() => '?').join(',')})`,
      userIdArray
    );
    
    if (tokens.length === 0) {
      console.log('No push tokens found for users:', userIdArray);
      return { success: true, sent: 0 };
    }
    
    // Create messages
    const messages = [];
    for (const tokenData of tokens) {
      // Check that the token is valid
      if (!Expo.isExpoPushToken(tokenData.push_token)) {
        console.error(`Push token ${tokenData.push_token} is not a valid Expo push token`);
        continue;
      }
      
      const message = {
        to: tokenData.push_token,
        sound: 'default',
        title: title,
        body: body,
        data: data,
        priority: 'high',
        channelId: 'default',
      };
      
      messages.push(message);
      
      // Enhanced logging to verify notification content
      console.log('📤 Preparing notification:', {
        userId: tokenData.user_id,
        title: title,
        body: body,
        dataType: data.type
      });
    }
    
    if (messages.length === 0) {
      console.log('No valid push tokens to send to');
      return { success: true, sent: 0 };
    }
    
    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }
    
    // Store notification in database
    for (const userId of userIdArray) {
      const notificationId = uuidv4();
      await db.execute(
        `INSERT INTO notifications (id, user_id, title, body, data, created_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [notificationId, userId, title, body, JSON.stringify(data)]
      );
    }
    
    console.log(`✅ Successfully sent ${tickets.length} push notifications`);
    console.log(`📊 Notification Summary: Title="${title}", Recipients=${userIdArray.length}`);
    return { success: true, sent: tickets.length, tickets };
    
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
    throw error;
  }
};

/**
 * Send notification when PM is assigned
 * Sends to: PM (assigned), Admin, Customer
 */
export const notifyPMAssigned = async (pmId, projectName, projectId) => {
  const db = getDB();
  
  // Get project details to find customer and admins
  const [projects] = await db.execute(
    'SELECT customer_id FROM projects WHERE id = ?',
    [projectId]
  );
  
  // Get all admins
  const [admins] = await db.execute(
    'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
  );
  
  const recipients = [pmId];
  
  // Add customer
  if (projects.length > 0 && projects[0].customer_id) {
    recipients.push(projects[0].customer_id);
  }
  
  // Add all admins
  admins.forEach(admin => recipients.push(admin.id));
  
  await sendPushNotification(
    recipients,
    'New Project Assigned',
    `Project Manager has been assigned to "${projectName}"`,
    { type: 'PM_ASSIGNED', action: 'view_projects', projectId }
  );
};

/**
 * Send notification when Site Incharge is assigned
 * Sends to: Site Incharge (work-related), Customer, PM, Admin
 */
export const notifySiteAssigned = async (siteId, projectName, projectId) => {
  const db = getDB();
  
  // Get project details to find customer, PM, and admins
  const [projects] = await db.execute(
    'SELECT customer_id, pm_id FROM projects WHERE id = ?',
    [projectId]
  );
  
  // Get all admins
  const [admins] = await db.execute(
    'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
  );
  
  const recipients = [siteId]; // Site Incharge (work-related)
  
  // Add customer
  if (projects.length > 0 && projects[0].customer_id) {
    recipients.push(projects[0].customer_id);
  }
  
  // Add PM
  if (projects.length > 0 && projects[0].pm_id) {
    recipients.push(projects[0].pm_id);
  }
  
  // Add all admins
  admins.forEach(admin => recipients.push(admin.id));
  
  await sendPushNotification(
    recipients,
    'Site Incharge Assigned',
    `Site Incharge has been assigned to "${projectName}"`,
    { type: 'SITE_ASSIGNED', action: 'view_projects', projectId }
  );
};

/**
 * Send notification when Finance is assigned
 * Sends to: Finance (work-related only)
 */
export const notifyFinanceAssigned = async (financeId, projectName, projectId) => {
  const db = getDB();
  
  // Get project details to find customer, PM, and other stakeholders
  const [projects] = await db.execute(
    'SELECT customer_id, pm_id FROM projects WHERE id = ?',
    [projectId]
  );
  
  // Get all admins and super admins
  const [admins] = await db.execute(
    'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
  );
  
  const recipients = [financeId]; // Start with the assigned finance user
  
  // Add customer if exists
  if (projects.length > 0 && projects[0].customer_id) {
    recipients.push(projects[0].customer_id);
  }
  
  // Add project manager if exists
  if (projects.length > 0 && projects[0].pm_id) {
    recipients.push(projects[0].pm_id);
  }
  
  // Add all admins and super admins
  admins.forEach(admin => recipients.push(admin.id));
  
  // Remove duplicates
  const uniqueRecipients = [...new Set(recipients)];
  
  await sendPushNotification(
    uniqueRecipients,
    'Finance Manager Assigned',
    `Finance Manager has been assigned to "${projectName}"`,
    { type: 'FINANCE_ASSIGNED', action: 'view_projects', projectId }
  );
};

/**
 * Send notification when payment needs verification
 * Sends to: Finance (work-related only)
 */
export const notifyPaymentVerification = async (financeId, projectName, paymentType, projectId) => {
  await sendPushNotification(
    financeId,
    'Payment Verification Required',
    `New ${paymentType} payment for "${projectName}" needs verification`,
    { type: 'PAYMENT_VERIFICATION', action: 'verify_payments', projectId }
  );
};

/**
 * Send notification when payment is made by customer
 * Sends to: Finance, PM, Admin, Customer
 */
export const notifyPaymentMade = async (projectId, projectName, paymentType, amount) => {
  const db = getDB();
  
  // Get project details
  const [projects] = await db.execute(
    'SELECT customer_id, pm_id, finance_id FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (projects.length === 0) return;
  
  const project = projects[0];
  
  // Get all admins
  const [admins] = await db.execute(
    'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
  );
  
  const recipients = [];
  
  // Add finance (work-related)
  if (project.finance_id) {
    recipients.push(project.finance_id);
  }
  
  // Add PM
  if (project.pm_id) {
    recipients.push(project.pm_id);
  }
  
  // Add customer
  if (project.customer_id) {
    recipients.push(project.customer_id);
  }
  
  // Add all admins
  admins.forEach(admin => recipients.push(admin.id));
  
  if (recipients.length > 0) {
    await sendPushNotification(
      recipients,
      'Payment Made',
      `${paymentType} payment of ₹${amount} has been made for "${projectName}"`,
      { type: 'PAYMENT_MADE', action: 'view_project', projectId }
    );
  }
};

/**
 * Send notification when payment is verified
 * Sends to: Customer, Admin, PM
 */
export const notifyPaymentVerified = async (customerId, projectName, paymentType, projectId) => {
  const db = getDB();
  
  // Get project details to find PM
  const [projects] = await db.execute(
    'SELECT pm_id FROM projects WHERE id = ?',
    [projectId]
  );
  
  // Get all admins
  const [admins] = await db.execute(
    'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
  );
  
  const recipients = [customerId];
  
  // Add PM
  if (projects.length > 0 && projects[0].pm_id) {
    recipients.push(projects[0].pm_id);
  }
  
  // Add all admins
  admins.forEach(admin => recipients.push(admin.id));
  
  await sendPushNotification(
    recipients,
    'Payment Verified',
    `${paymentType} payment for "${projectName}" has been verified`,
    { type: 'PAYMENT_VERIFIED', action: 'view_project', projectId }
  );
};

/**
 * Send notification when project status changes
 * Sends to: Admin, PM, Customer (NOT to finance or site - they get specific notifications)
 */
export const notifyStatusChange = async (projectId, projectName, newStatus) => {
  const db = getDB();
  
  // Get project details
  const [projects] = await db.execute(
    'SELECT customer_id, pm_id FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (projects.length === 0) return;
  
  const project = projects[0];
  
  // Get all admins
  const [admins] = await db.execute(
    'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
  );
  
  const recipients = [];
  
  // Add customer
  if (project.customer_id) {
    recipients.push(project.customer_id);
  }
  
  // Add PM
  if (project.pm_id) {
    recipients.push(project.pm_id);
  }
  
  // Add all admins
  admins.forEach(admin => recipients.push(admin.id));
  
  const statusMessages = {
    'PM_ASSIGNED': 'Project Manager has been assigned',
    'SITE_ASSIGNED': 'Site Incharge has been assigned',
    'VISIT_SCHEDULED': 'Site visit has been scheduled',
    'VISIT_DONE': 'Site visit has been completed',
    'REPORT_SUBMITTED': 'Site report has been submitted',
    'ADVANCE_PAID': 'Advance payment has been verified',
    'WORK_STARTED': 'Work has started',
    'COMPLETED': 'Work has been completed',
    'FINAL_PAID': 'Final payment has been verified',
    'CLOSED': 'Project has been closed',
  };
  
  if (recipients.length > 0) {
    await sendPushNotification(
      recipients,
      'Project Status Updated',
      `"${projectName}" - ${statusMessages[newStatus] || newStatus}`,
      { type: 'STATUS_CHANGE', status: newStatus, action: 'view_project', projectId }
    );
  }
};

/**
 * Send notification when visit is scheduled
 * Sends to: Site Incharge (work-related), Customer, PM, Admin
 */
export const notifyVisitScheduled = async (projectId, projectName, visitDate, visitTime) => {
  const db = getDB();
  
  // Get project details
  const [projects] = await db.execute(
    'SELECT customer_id, pm_id, site_id FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (projects.length === 0) return;
  
  const project = projects[0];
  
  // Get all admins
  const [admins] = await db.execute(
    'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
  );
  
  const recipients = [];
  
  // Add site incharge (work-related)
  if (project.site_id) {
    recipients.push(project.site_id);
  }
  
  // Add customer
  if (project.customer_id) {
    recipients.push(project.customer_id);
  }
  
  // Add PM
  if (project.pm_id) {
    recipients.push(project.pm_id);
  }
  
  // Add all admins
  admins.forEach(admin => recipients.push(admin.id));
  
  if (recipients.length > 0) {
    await sendPushNotification(
      recipients,
      'Site Visit Scheduled',
      `Visit scheduled for "${projectName}" on ${visitDate} at ${visitTime}`,
      { type: 'VISIT_SCHEDULED', action: 'view_project', projectId }
    );
  }
};

/**
 * Send notification when report is submitted
 * Sends to: PM, Customer, Admin
 */
export const notifyReportSubmitted = async (projectId, projectName) => {
  const db = getDB();
  
  // Get project details
  const [projects] = await db.execute(
    'SELECT customer_id, pm_id FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (projects.length === 0) return;
  
  const project = projects[0];
  
  // Get all admins
  const [admins] = await db.execute(
    'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
  );
  
  const recipients = [];
  
  // Add PM
  if (project.pm_id) {
    recipients.push(project.pm_id);
  }
  
  // Add customer
  if (project.customer_id) {
    recipients.push(project.customer_id);
  }
  
  // Add all admins
  admins.forEach(admin => recipients.push(admin.id));
  
  if (recipients.length > 0) {
    await sendPushNotification(
      recipients,
      'Report Submitted',
      `Site report has been submitted for "${projectName}"`,
      { type: 'REPORT_SUBMITTED', action: 'view_reports', projectId }
    );
  }
};

/**
 * Send notification when project is completed
 * Sends to: Customer, PM, Admin (NOT finance - they get payment notifications)
 */
export const notifyProjectCompleted = async (projectId, projectName) => {
  const db = getDB();
  
  // Get project details
  const [projects] = await db.execute(
    'SELECT customer_id, pm_id FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (projects.length === 0) return;
  
  const project = projects[0];
  
  // Get all admins
  const [admins] = await db.execute(
    'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
  );
  
  const recipients = [];
  
  // Add customer
  if (project.customer_id) {
    recipients.push(project.customer_id);
  }
  
  // Add PM
  if (project.pm_id) {
    recipients.push(project.pm_id);
  }
  
  // Add all admins
  admins.forEach(admin => recipients.push(admin.id));
  
  if (recipients.length > 0) {
    await sendPushNotification(
      recipients,
      'Project Completed',
      `"${projectName}" has been marked as completed`,
      { type: 'PROJECT_COMPLETED', action: 'view_project', projectId }
    );
  }
};

/**
 * Send notification when project is closed
 * Sends to: Customer, PM, Admin
 */
export const notifyProjectClosed = async (projectId, projectName) => {
  const db = getDB();
  
  // Get project details
  const [projects] = await db.execute(
    'SELECT customer_id, pm_id FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (projects.length === 0) return;
  
  const project = projects[0];
  
  // Get all admins
  const [admins] = await db.execute(
    'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
  );
  
  const recipients = [];
  
  // Add customer
  if (project.customer_id) {
    recipients.push(project.customer_id);
  }
  
  // Add PM
  if (project.pm_id) {
    recipients.push(project.pm_id);
  }
  
  // Add all admins
  admins.forEach(admin => recipients.push(admin.id));
  
  if (recipients.length > 0) {
    await sendPushNotification(
      recipients,
      'Project Closed',
      `"${projectName}" has been successfully closed`,
      { type: 'PROJECT_CLOSED', action: 'view_projects', projectId }
    );
  }
};

/**
 * Send notification when user account is deactivated
 * Sends to: The deactivated user only
 */
export const notifyAccountDeactivated = async (userId, userName) => {
  await sendPushNotification(
    userId,
    'Account Deactivated',
    `Your account has been deactivated by the administrators. You have been logged out of your account.`,
    { type: 'ACCOUNT_DEACTIVATED', action: 'logout' }
  );
};

/**
 * Send notification when user account is activated
 * Sends to: The activated user only
 */
export const notifyAccountActivated = async (userId, userName) => {
  await sendPushNotification(
    userId,
    'Account Activated',
    `Your account has been activated. Please login back to access the application.`,
    { type: 'ACCOUNT_ACTIVATED', action: 'login' }
  );
};

/**
 * Send notification when site plan is uploaded
 * Sends to: PM, Customer, Finance Manager, All Admins
 */
export const notifySitePlanUploaded = async (projectId, projectName, uploaderName) => {
  console.log('=== SITE PLAN NOTIFICATION START ===');
  console.log('Project ID:', projectId);
  console.log('Project Name:', projectName);
  console.log('Uploader Name:', uploaderName);
  
  const db = getDB();
  
  try {
    // Get project details
    const [projects] = await db.execute(
      'SELECT customer_id, pm_id, finance_id FROM projects WHERE id = ?',
      [projectId]
    );
    
    console.log('Project query result:', projects);
    
    if (projects.length === 0) {
      console.log('No project found, returning');
      return;
    }
    
    const project = projects[0];
    console.log('Project details:', project);
    
    // Get all admins
    const [admins] = await db.execute(
      'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
    );
    
    console.log('Admins found:', admins);
    
    const recipients = [];
    
    // Add PM
    if (project.pm_id) {
      recipients.push(project.pm_id);
      console.log('Added PM to recipients:', project.pm_id);
    }
    
    // Add customer
    if (project.customer_id) {
      recipients.push(project.customer_id);
      console.log('Added customer to recipients:', project.customer_id);
    }
    
    // Add finance manager
    if (project.finance_id) {
      recipients.push(project.finance_id);
      console.log('Added finance manager to recipients:', project.finance_id);
    }
    
    // Add all admins
    admins.forEach(admin => {
      recipients.push(admin.id);
      console.log('Added admin to recipients:', admin.id);
    });
    
    console.log('Final recipients list:', recipients);
    
    if (recipients.length > 0) {
      console.log('Sending push notification...');
      await sendPushNotification(
        recipients,
        'Site Plan Uploaded',
        `${uploaderName} uploaded a site plan for "${projectName}"`,
        { type: 'SITE_PLAN_UPLOADED', action: 'view_site_plans', projectId }
      );
      console.log('Push notification sent successfully');
    } else {
      console.log('No recipients found, skipping notification');
    }
    
    console.log('=== SITE PLAN NOTIFICATION END ===');
  } catch (error) {
    console.error('Error in notifySitePlanUploaded:', error);
    throw error;
  }
};

/**
 * Send notification when visit is rejected
 * Sends to: PM, Customer, Finance Manager, All Admins (excluding the person who rejected)
 */
export const notifyVisitRejected = async (projectId, projectName, rejectorName, rejectionReason, rejectedBy) => {
  console.log('=== VISIT REJECTION NOTIFICATION START ===');
  console.log('Project ID:', projectId);
  console.log('Project Name:', projectName);
  console.log('Rejector Name:', rejectorName);
  console.log('Rejection Reason:', rejectionReason);
  console.log('Rejected By:', rejectedBy);
  
  const db = getDB();
  
  try {
    // Get project details
    const [projects] = await db.execute(
      'SELECT customer_id, pm_id, finance_id FROM projects WHERE id = ?',
      [projectId]
    );
    
    console.log('Project query result:', projects);
    
    if (projects.length === 0) {
      console.log('No project found, returning');
      return;
    }
    
    const project = projects[0];
    console.log('Project details:', project);
    
    // Get all admins
    const [admins] = await db.execute(
      'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
    );
    
    console.log('Admins found:', admins);
    
    const recipients = [];
    
    // Add PM (if not the one who rejected)
    if (project.pm_id && project.pm_id !== rejectedBy) {
      recipients.push(project.pm_id);
      console.log('Added PM to recipients:', project.pm_id);
    }
    
    // Add customer (if not the one who rejected)
    if (project.customer_id && project.customer_id !== rejectedBy) {
      recipients.push(project.customer_id);
      console.log('Added customer to recipients:', project.customer_id);
    }
    
    // Add finance manager (if not the one who rejected)
    if (project.finance_id && project.finance_id !== rejectedBy) {
      recipients.push(project.finance_id);
      console.log('Added finance manager to recipients:', project.finance_id);
    }
    
    // Add all admins (excluding the one who rejected)
    admins.forEach(admin => {
      if (admin.id !== rejectedBy) {
        recipients.push(admin.id);
        console.log('Added admin to recipients:', admin.id);
      }
    });
    
    console.log('Final recipients list:', recipients);
    
    if (recipients.length > 0) {
      console.log('Sending push notification...');
      await sendPushNotification(
        recipients,
        'Visit Rejected',
        `${rejectorName} rejected a visit for "${projectName}". Reason: ${rejectionReason}`,
        { type: 'VISIT_REJECTED', action: 'view_projects', projectId }
      );
      console.log('Push notification sent successfully');
    } else {
      console.log('No recipients found, skipping notification');
    }
    
    console.log('=== VISIT REJECTION NOTIFICATION END ===');
  } catch (error) {
    console.error('Error in notifyVisitRejected:', error);
    throw error;
  }
};

/**
 * Send notification when worklog is created
 * Sends to: PM, Customer, Finance Manager, All Admins (excluding the site incharge who created it)
 */
export const notifyWorklogCreated = async (projectId, projectName, siteInchargeName, floorNumber, createdBy) => {
  const db = getDB();
  
  try {
    // Get project details
    const [projects] = await db.execute(
      'SELECT customer_id, pm_id, finance_id FROM projects WHERE id = ?',
      [projectId]
    );
    
    if (projects.length === 0) return;
    
    const project = projects[0];
    
    // Get all admins
    const [admins] = await db.execute(
      'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
    );
    
    const recipients = [];
    
    // Add PM (if not the one who created)
    if (project.pm_id && project.pm_id !== createdBy) {
      recipients.push(project.pm_id);
    }
    
    // Add customer (if not the one who created)
    if (project.customer_id && project.customer_id !== createdBy) {
      recipients.push(project.customer_id);
    }
    
    // Add finance manager (if not the one who created)
    if (project.finance_id && project.finance_id !== createdBy) {
      recipients.push(project.finance_id);
    }
    
    // Add all admins (excluding the one who created)
    admins.forEach(admin => {
      if (admin.id !== createdBy) {
        recipients.push(admin.id);
      }
    });
    
    if (recipients.length > 0) {
      await sendPushNotification(
        recipients,
        'Work Log Added',
        `${siteInchargeName} added a work log for Floor ${floorNumber} in "${projectName}"`,
        { type: 'WORKLOG_CREATED', action: 'view_projects', projectId }
      );
    }
  } catch (error) {
    console.error('Error in notifyWorklogCreated:', error);
    throw error;
  }
};

/**
 * Send notification when worklog images are added
 * Sends to: PM, Customer, Finance Manager, All Admins (excluding the site incharge who added them)
 */
export const notifyWorklogImagesAdded = async (projectId, projectName, siteInchargeName, floorNumber, imageCount, createdBy) => {
  const db = getDB();
  
  try {
    // Get project details
    const [projects] = await db.execute(
      'SELECT customer_id, pm_id, finance_id FROM projects WHERE id = ?',
      [projectId]
    );
    
    if (projects.length === 0) return;
    
    const project = projects[0];
    
    // Get all admins
    const [admins] = await db.execute(
      'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
    );
    
    const recipients = [];
    
    // Add PM (if not the one who added images)
    if (project.pm_id && project.pm_id !== createdBy) {
      recipients.push(project.pm_id);
    }
    
    // Add customer (if not the one who added images)
    if (project.customer_id && project.customer_id !== createdBy) {
      recipients.push(project.customer_id);
    }
    
    // Add finance manager (if not the one who added images)
    if (project.finance_id && project.finance_id !== createdBy) {
      recipients.push(project.finance_id);
    }
    
    // Add all admins (excluding the one who added images)
    admins.forEach(admin => {
      if (admin.id !== createdBy) {
        recipients.push(admin.id);
      }
    });
    
    if (recipients.length > 0) {
      const imageText = imageCount === 1 ? 'image' : 'images';
      await sendPushNotification(
        recipients,
        'Work Log Images Added',
        `${siteInchargeName} added ${imageCount} ${imageText} to Floor ${floorNumber} work log in "${projectName}"`,
        { type: 'WORKLOG_IMAGES_ADDED', action: 'view_projects', projectId }
      );
    }
  } catch (error) {
    console.error('Error in notifyWorklogImagesAdded:', error);
    throw error;
  }
};

/**
 * Send notification when worklog image is removed
 * Sends to: PM, Customer, Finance Manager, All Admins (excluding the site incharge who removed it)
 */
export const notifyWorklogImageRemoved = async (projectId, projectName, siteInchargeName, floorNumber, removedBy) => {
  const db = getDB();
  
  try {
    // Get project details
    const [projects] = await db.execute(
      'SELECT customer_id, pm_id, finance_id FROM projects WHERE id = ?',
      [projectId]
    );
    
    if (projects.length === 0) return;
    
    const project = projects[0];
    
    // Get all admins
    const [admins] = await db.execute(
      'SELECT id FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1'
    );
    
    const recipients = [];
    
    // Add PM (if not the one who removed image)
    if (project.pm_id && project.pm_id !== removedBy) {
      recipients.push(project.pm_id);
    }
    
    // Add customer (if not the one who removed image)
    if (project.customer_id && project.customer_id !== removedBy) {
      recipients.push(project.customer_id);
    }
    
    // Add finance manager (if not the one who removed image)
    if (project.finance_id && project.finance_id !== removedBy) {
      recipients.push(project.finance_id);
    }
    
    // Add all admins (excluding the one who removed image)
    admins.forEach(admin => {
      if (admin.id !== removedBy) {
        recipients.push(admin.id);
      }
    });
    
    if (recipients.length > 0) {
      await sendPushNotification(
        recipients,
        'Work Log Image Removed',
        `${siteInchargeName} removed an image from Floor ${floorNumber} work log in "${projectName}"`,
        { type: 'WORKLOG_IMAGE_REMOVED', action: 'view_projects', projectId }
      );
    }
  } catch (error) {
    console.error('Error in notifyWorklogImageRemoved:', error);
    throw error;
  }
};
