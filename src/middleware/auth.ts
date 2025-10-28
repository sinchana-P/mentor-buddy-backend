import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt.ts';
import { tokenBlacklist } from '../lib/tokenBlacklist.ts';

// Extend Express Request type to include user and token
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      token?: string;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  console.log('[AUTH] authenticateToken called for:', req.method, req.path);
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  console.log('[AUTH] Auth header present:', !!authHeader);
  console.log('[AUTH] Token present:', !!token);

  if (!token) {
    console.log('[AUTH] No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }

  // Check if token is blacklisted
  if (tokenBlacklist.isTokenBlacklisted(token)) {
    console.log('[AUTH] Token is blacklisted');
    return res.status(401).json({ message: 'Token has been revoked' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    req.token = token; // Store token for potential logout
    console.log('[AUTH] Token verified successfully for user:', decoded.userId, 'role:', decoded.role);
    next();
  } catch (error) {
    console.log('[AUTH] Token verification failed:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

// Specific role middleware functions
export const requireManager = requireRole(['manager']);
export const requireMentor = requireRole(['manager', 'mentor']);
export const requireBuddy = requireRole(['manager', 'mentor', 'buddy']);

// Domain-specific access control
export const requireDomainAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Managers can access all domains
  if (req.user.role === 'manager') {
    return next();
  }

  // For mentors and buddies, check domain-specific access
  const requestedDomain = req.params.domain || req.query.domain;
  if (requestedDomain && req.user.domainRole !== requestedDomain) {
    return res.status(403).json({ 
      message: 'Domain access denied',
      userDomain: req.user.domainRole,
      requestedDomain
    });
  }

  next();
};

// Optional authentication - sets user if token is present but doesn't require it
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch (error) {
      // Ignore token errors for optional auth
    }
  }

  next();
};