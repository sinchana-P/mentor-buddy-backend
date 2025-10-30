/**
 * Permission Middleware
 * Enforces role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { hasPermission, PERMISSIONS, permissionDeniedResponse } from '../config/permissions.ts';

// Extend Request type to include user info
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    domainRole?: string;
  };
}

/**
 * Generic permission check middleware
 */
export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!hasPermission(req.user.role, permission)) {
      console.log(`[PERMISSION DENIED] User ${req.user.email} (${req.user.role}) tried to access ${permission}`);
      return res.status(403).json(permissionDeniedResponse());
    }

    next();
  };
}

/**
 * Check if user can create mentor
 */
export const canCreateMentor = requirePermission(PERMISSIONS.CAN_CREATE_MENTOR);

/**
 * Check if user can edit mentor
 */
export const canEditMentor = requirePermission(PERMISSIONS.CAN_EDIT_MENTOR);

/**
 * Check if user can delete mentor
 */
export const canDeleteMentor = requirePermission(PERMISSIONS.CAN_DELETE_MENTOR);

/**
 * Check if user can create buddy
 */
export const canCreateBuddy = requirePermission(PERMISSIONS.CAN_CREATE_BUDDY);

/**
 * Check if user can delete buddy
 */
export const canDeleteBuddy = requirePermission(PERMISSIONS.CAN_DELETE_BUDDY);

/**
 * Check if user can create task
 */
export const canCreateTask = requirePermission(PERMISSIONS.CAN_CREATE_TASK);

/**
 * Check if user can create resource
 */
export const canCreateResource = requirePermission(PERMISSIONS.CAN_CREATE_RESOURCE);

/**
 * Check if user can edit resource
 */
export const canEditResource = requirePermission(PERMISSIONS.CAN_EDIT_RESOURCE);

/**
 * Check if user can delete resource
 */
export const canDeleteResource = requirePermission(PERMISSIONS.CAN_DELETE_RESOURCE);

/**
 * Check if user can create topic
 */
export const canCreateTopic = requirePermission(PERMISSIONS.CAN_CREATE_TOPIC);

/**
 * Check if user can edit topic
 */
export const canEditTopic = requirePermission(PERMISSIONS.CAN_EDIT_TOPIC);

/**
 * Check if user can delete topic
 */
export const canDeleteTopic = requirePermission(PERMISSIONS.CAN_DELETE_TOPIC);

/**
 * Check if user can view analytics
 */
export const canViewAnalytics = requirePermission(PERMISSIONS.CAN_VIEW_ANALYTICS);
