import jwt from 'jsonwebtoken';
import { config } from '../config/index.ts';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'manager' | 'mentor' | 'buddy';
  domainRole: string;
  iat?: number;
  exp?: number;
}

export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  const secret = config.JWT_SECRET as string;
  const expiresIn = config.JWT_EXPIRES_IN as string;
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    const secret = config.JWT_SECRET as string;
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch (error) {
    return null;
  }
};