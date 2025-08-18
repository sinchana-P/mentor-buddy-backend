import jwt from 'jsonwebtoken';
import { config } from '../config/index.ts';

// In-memory token blacklist
// In production, this should be stored in Redis or a database
class TokenBlacklist {
  private blacklistedTokens: Set<string> = new Set();
  private tokenExpiryMap: Map<string, number> = new Map();

  constructor() {
    // Clean up expired tokens every hour
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000); // 1 hour
  }

  // Add token to blacklist
  blacklistToken(token: string): void {
    try {
      // Decode token to get expiry time
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const expiryTime = decoded.exp * 1000; // Convert to milliseconds
        this.blacklistedTokens.add(token);
        this.tokenExpiryMap.set(token, expiryTime);
        
        console.log('Token blacklisted successfully');
      }
    } catch (error) {
      console.error('Error blacklisting token:', error);
    }
  }

  // Check if token is blacklisted
  isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  // Clean up expired tokens from blacklist
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    const expiredTokens: string[] = [];

    this.tokenExpiryMap.forEach((expiryTime, token) => {
      if (expiryTime < now) {
        expiredTokens.push(token);
      }
    });

    expiredTokens.forEach(token => {
      this.blacklistedTokens.delete(token);
      this.tokenExpiryMap.delete(token);
    });

    if (expiredTokens.length > 0) {
      console.log(`Cleaned up ${expiredTokens.length} expired tokens from blacklist`);
    }
  }

  // Get blacklist stats (for debugging)
  getStats(): { total: number; active: number } {
    const now = Date.now();
    let activeTokens = 0;

    this.tokenExpiryMap.forEach((expiryTime) => {
      if (expiryTime >= now) {
        activeTokens++;
      }
    });

    return {
      total: this.blacklistedTokens.size,
      active: activeTokens
    };
  }
}

export const tokenBlacklist = new TokenBlacklist();