/**
 * Permission Management System
 * Defines all permissions and role-based access control
 */

// Permission constants
export const PERMISSIONS = {
  // Mentor Management
  CAN_CREATE_MENTOR: 'can_create_mentor',
  CAN_EDIT_MENTOR: 'can_edit_mentor',
  CAN_DELETE_MENTOR: 'can_delete_mentor',
  CAN_VIEW_MENTORS: 'can_view_mentors',

  // Buddy Management
  CAN_CREATE_BUDDY: 'can_create_buddy',
  CAN_EDIT_BUDDY_ALL: 'can_edit_buddy_all',
  CAN_EDIT_BUDDY_NAME: 'can_edit_buddy_name',
  CAN_EDIT_BUDDY_ROLE: 'can_edit_buddy_role',
  CAN_EDIT_BUDDY_STATUS: 'can_edit_buddy_status',
  CAN_EDIT_BUDDY_MENTOR: 'can_edit_buddy_mentor',
  CAN_DELETE_BUDDY: 'can_delete_buddy',
  CAN_VIEW_BUDDIES: 'can_view_buddies',
  CAN_VIEW_OWN_PROFILE: 'can_view_own_profile',

  // Task Management
  CAN_CREATE_TASK: 'can_create_task',
  CAN_EDIT_OWN_TASK: 'can_edit_own_task',
  CAN_EDIT_ANY_TASK: 'can_edit_any_task',
  CAN_DELETE_OWN_TASK: 'can_delete_own_task',
  CAN_DELETE_ANY_TASK: 'can_delete_any_task',
  CAN_UPDATE_TASK_STATUS: 'can_update_task_status',
  CAN_VIEW_TASKS: 'can_view_tasks',

  // Progress Management
  CAN_UPDATE_OWN_PROGRESS: 'can_update_own_progress',
  CAN_UPDATE_ASSIGNED_BUDDY_PROGRESS: 'can_update_assigned_buddy_progress',
  CAN_UPDATE_ANY_PROGRESS: 'can_update_any_progress',
  CAN_VIEW_PROGRESS: 'can_view_progress',

  // Portfolio Management
  CAN_CREATE_OWN_PORTFOLIO: 'can_create_own_portfolio',
  CAN_EDIT_OWN_PORTFOLIO: 'can_edit_own_portfolio',
  CAN_DELETE_OWN_PORTFOLIO: 'can_delete_own_portfolio',
  CAN_EDIT_ANY_PORTFOLIO: 'can_edit_any_portfolio',
  CAN_VIEW_PORTFOLIOS: 'can_view_portfolios',

  // Resource Management
  CAN_CREATE_RESOURCE: 'can_create_resource',
  CAN_EDIT_RESOURCE: 'can_edit_resource',
  CAN_DELETE_RESOURCE: 'can_delete_resource',
  CAN_VIEW_RESOURCES: 'can_view_resources',

  // Topic Management
  CAN_CREATE_TOPIC: 'can_create_topic',
  CAN_EDIT_TOPIC: 'can_edit_topic',
  CAN_DELETE_TOPIC: 'can_delete_topic',
  CAN_VIEW_TOPICS: 'can_view_topics',

  // Dashboard & Analytics
  CAN_VIEW_DASHBOARD: 'can_view_dashboard',
  CAN_VIEW_ANALYTICS: 'can_view_analytics',
} as const;

// Role-based permission mapping
export const ROLE_PERMISSIONS = {
  manager: [
    // Full access to everything
    PERMISSIONS.CAN_CREATE_MENTOR,
    PERMISSIONS.CAN_EDIT_MENTOR,
    PERMISSIONS.CAN_DELETE_MENTOR,
    PERMISSIONS.CAN_VIEW_MENTORS,

    PERMISSIONS.CAN_CREATE_BUDDY,
    PERMISSIONS.CAN_EDIT_BUDDY_ALL,
    PERMISSIONS.CAN_EDIT_BUDDY_NAME,
    PERMISSIONS.CAN_EDIT_BUDDY_ROLE,
    PERMISSIONS.CAN_EDIT_BUDDY_STATUS,
    PERMISSIONS.CAN_EDIT_BUDDY_MENTOR,
    PERMISSIONS.CAN_DELETE_BUDDY,
    PERMISSIONS.CAN_VIEW_BUDDIES,

    PERMISSIONS.CAN_CREATE_TASK,
    PERMISSIONS.CAN_EDIT_ANY_TASK,
    PERMISSIONS.CAN_DELETE_ANY_TASK,
    PERMISSIONS.CAN_UPDATE_TASK_STATUS,
    PERMISSIONS.CAN_VIEW_TASKS,

    PERMISSIONS.CAN_UPDATE_ANY_PROGRESS,
    PERMISSIONS.CAN_VIEW_PROGRESS,

    PERMISSIONS.CAN_EDIT_ANY_PORTFOLIO,
    PERMISSIONS.CAN_VIEW_PORTFOLIOS,

    PERMISSIONS.CAN_CREATE_RESOURCE,
    PERMISSIONS.CAN_EDIT_RESOURCE,
    PERMISSIONS.CAN_DELETE_RESOURCE,
    PERMISSIONS.CAN_VIEW_RESOURCES,

    PERMISSIONS.CAN_CREATE_TOPIC,
    PERMISSIONS.CAN_EDIT_TOPIC,
    PERMISSIONS.CAN_DELETE_TOPIC,
    PERMISSIONS.CAN_VIEW_TOPICS,

    PERMISSIONS.CAN_VIEW_DASHBOARD,
    PERMISSIONS.CAN_VIEW_ANALYTICS,
  ],

  mentor: [
    // Cannot create/delete mentors or buddies
    PERMISSIONS.CAN_VIEW_MENTORS,

    // Can only edit buddy's domain role
    PERMISSIONS.CAN_EDIT_BUDDY_ROLE,
    PERMISSIONS.CAN_VIEW_BUDDIES,

    // Can create tasks and edit own tasks
    PERMISSIONS.CAN_CREATE_TASK,
    PERMISSIONS.CAN_EDIT_OWN_TASK,
    PERMISSIONS.CAN_DELETE_OWN_TASK,
    PERMISSIONS.CAN_VIEW_TASKS,

    // Can update progress for assigned buddies
    PERMISSIONS.CAN_UPDATE_ASSIGNED_BUDDY_PROGRESS,
    PERMISSIONS.CAN_VIEW_PROGRESS,

    // Can view portfolios
    PERMISSIONS.CAN_VIEW_PORTFOLIOS,

    // Can create/edit resources
    PERMISSIONS.CAN_CREATE_RESOURCE,
    PERMISSIONS.CAN_EDIT_RESOURCE,
    PERMISSIONS.CAN_VIEW_RESOURCES,

    PERMISSIONS.CAN_VIEW_TOPICS,
    PERMISSIONS.CAN_VIEW_DASHBOARD,
    PERMISSIONS.CAN_VIEW_ANALYTICS,
  ],

  buddy: [
    // Can only view own profile
    PERMISSIONS.CAN_VIEW_OWN_PROFILE,
    PERMISSIONS.CAN_EDIT_BUDDY_NAME, // Can edit only their own name

    // Can update status of assigned tasks
    PERMISSIONS.CAN_UPDATE_TASK_STATUS,
    PERMISSIONS.CAN_VIEW_TASKS,

    // Can update own progress
    PERMISSIONS.CAN_UPDATE_OWN_PROGRESS,
    PERMISSIONS.CAN_VIEW_PROGRESS,

    // Can manage own portfolio
    PERMISSIONS.CAN_CREATE_OWN_PORTFOLIO,
    PERMISSIONS.CAN_EDIT_OWN_PORTFOLIO,
    PERMISSIONS.CAN_DELETE_OWN_PORTFOLIO,
    PERMISSIONS.CAN_VIEW_PORTFOLIOS,

    PERMISSIONS.CAN_VIEW_RESOURCES,
    PERMISSIONS.CAN_VIEW_TOPICS,
    PERMISSIONS.CAN_VIEW_DASHBOARD,
  ],
} as const;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: string): boolean {
  const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  return rolePerms ? rolePerms.includes(permission as any) : false;
}

/**
 * Check if a user can edit a specific buddy field
 */
export function canEditBuddyField(
  userRole: string,
  userId: string,
  buddyUserId: string,
  field: 'name' | 'email' | 'domainRole' | 'status' | 'assignedMentorId'
): boolean {
  // Manager can edit everything except buddy's email
  if (userRole === 'manager') {
    if (field === 'email') return false; // Email cannot be changed
    return hasPermission(userRole, PERMISSIONS.CAN_EDIT_BUDDY_ALL);
  }

  // Mentor can only edit domain role
  if (userRole === 'mentor') {
    return field === 'domainRole' && hasPermission(userRole, PERMISSIONS.CAN_EDIT_BUDDY_ROLE);
  }

  // Buddy can only edit their own name
  if (userRole === 'buddy' && userId === buddyUserId) {
    return field === 'name' && hasPermission(userRole, PERMISSIONS.CAN_EDIT_BUDDY_NAME);
  }

  return false;
}

/**
 * Check if a user can update a buddy's progress
 * ONLY assigned mentor and the buddy themselves can edit progress
 */
export function canUpdateBuddyProgress(
  userRole: string,
  userId: string,
  buddyId: string,
  assignedMentorId?: string
): boolean {
  // Mentor can update progress ONLY of their assigned buddies
  if (userRole === 'mentor' && assignedMentorId && userId === assignedMentorId) {
    return hasPermission(userRole, PERMISSIONS.CAN_UPDATE_ASSIGNED_BUDDY_PROGRESS);
  }

  // Buddy can update their own progress
  if (userRole === 'buddy' && userId === buddyId) {
    return hasPermission(userRole, PERMISSIONS.CAN_UPDATE_OWN_PROGRESS);
  }

  // Managers and unassigned mentors CANNOT edit progress
  return false;
}

/**
 * Check if a user can edit a task
 */
export function canEditTask(
  userRole: string,
  userId: string,
  taskMentorId: string
): boolean {
  // Manager can edit any task
  if (userRole === 'manager' && hasPermission(userRole, PERMISSIONS.CAN_EDIT_ANY_TASK)) {
    return true;
  }

  // Mentor can edit only tasks they created
  if (userRole === 'mentor' && userId === taskMentorId) {
    return hasPermission(userRole, PERMISSIONS.CAN_EDIT_OWN_TASK);
  }

  return false;
}

/**
 * Check if a user can update task status
 */
export function canUpdateTaskStatus(
  userRole: string,
  userId: string,
  taskBuddyId: string,
  taskMentorId: string
): boolean {
  // Manager and mentor who created the task can update
  if (userRole === 'manager') return true;
  if (userRole === 'mentor' && userId === taskMentorId) return true;

  // Buddy can update status of their assigned tasks
  if (userRole === 'buddy' && userId === taskBuddyId) {
    return hasPermission(userRole, PERMISSIONS.CAN_UPDATE_TASK_STATUS);
  }

  return false;
}

/**
 * Check if a user can manage a portfolio
 */
export function canManagePortfolio(
  userRole: string,
  userId: string,
  portfolioBuddyId: string,
  action: 'create' | 'edit' | 'delete'
): boolean {
  // Manager can do anything
  if (userRole === 'manager' && hasPermission(userRole, PERMISSIONS.CAN_EDIT_ANY_PORTFOLIO)) {
    return true;
  }

  // Buddy can manage their own portfolio
  if (userRole === 'buddy' && userId === portfolioBuddyId) {
    if (action === 'create') return hasPermission(userRole, PERMISSIONS.CAN_CREATE_OWN_PORTFOLIO);
    if (action === 'edit') return hasPermission(userRole, PERMISSIONS.CAN_EDIT_OWN_PORTFOLIO);
    if (action === 'delete') return hasPermission(userRole, PERMISSIONS.CAN_DELETE_OWN_PORTFOLIO);
  }

  return false;
}

// Export permission response helper
export function permissionDeniedResponse(message?: string) {
  return {
    success: false,
    message: message || 'You do not have permission to perform this action',
    code: 'PERMISSION_DENIED'
  };
}
