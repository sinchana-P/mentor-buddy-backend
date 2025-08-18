import { type User, type InsertUser } from '../shared/schema.ts';
import { nanoid } from 'nanoid';

// In-memory user storage for testing authentication
// This will be replaced with real database operations once schema is updated
export class MockUserStorage {
  private users: Map<string, User> = new Map();
  private emailToId: Map<string, string> = new Map();

  constructor() {
    // Pre-populate with test users for each role
    this.createTestUsers();
  }

  private createTestUsers() {
    const testUsers = [
      {
        email: 'manager@example.com',
        name: 'John Manager',
        password: '$2b$12$udVrMpDhnzsxVNB2Cn98PeOJL20n555X9cX/zmUE1pxO2r4IqJVXC', // Password123!
        role: 'manager' as const,
        domainRole: 'fullstack' as const,
        isActive: true
      },
      {
        email: 'mentor@example.com',
        name: 'Sarah Mentor',
        password: '$2b$12$udVrMpDhnzsxVNB2Cn98PeOJL20n555X9cX/zmUE1pxO2r4IqJVXC', // Password123!
        role: 'mentor' as const,
        domainRole: 'frontend' as const,
        isActive: true
      },
      {
        email: 'buddy@example.com',
        name: 'Mike Buddy',
        password: '$2b$12$udVrMpDhnzsxVNB2Cn98PeOJL20n555X9cX/zmUE1pxO2r4IqJVXC', // Password123!
        role: 'buddy' as const,
        domainRole: 'backend' as const,
        isActive: true
      }
    ];

    testUsers.forEach(userData => {
      const user: User = {
        id: nanoid(),
        ...userData,
        avatarUrl: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.users.set(user.id, user);
      this.emailToId.set(user.email, user.id);
    });

    console.log('Mock users created:', Array.from(this.emailToId.keys()));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const userId = this.emailToId.get(email);
    if (!userId) return undefined;
    
    const user = this.users.get(userId);
    if (!user) return undefined;

    // Return user without password for security
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async getUserByEmailWithPassword(email: string): Promise<User | undefined> {
    const userId = this.emailToId.get(email);
    if (!userId) return undefined;
    
    return this.users.get(userId);
  }

  async getUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    // Return user without password for security
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Check if user already exists
    if (this.emailToId.has(userData.email)) {
      throw new Error('User with this email already exists');
    }

    const user: User = {
      id: nanoid(),
      ...userData,
      avatarUrl: userData.avatarUrl || null,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(user.id, user);
    this.emailToId.set(user.email, user.id);

    console.log('Mock user created:', user.email, 'Role:', user.role);

    // Return user without password for security
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };

    // Update email mapping if email changed
    if (updates.email && updates.email !== user.email) {
      this.emailToId.delete(user.email);
      this.emailToId.set(updates.email, id);
    }

    this.users.set(id, updatedUser);

    // Return user without password for security
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as User;
  }

  async updateLastLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLoginAt = new Date();
      this.users.set(id, user);
    }
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });
  }

  // List all mock users for testing
  listMockUsers() {
    return Array.from(this.emailToId.entries()).map(([email, id]) => {
      const user = this.users.get(id);
      return {
        email,
        name: user?.name,
        role: user?.role,
        password: 'Password123!' // All test users have this password
      };
    });
  }
}

export const mockUserStorage = new MockUserStorage();