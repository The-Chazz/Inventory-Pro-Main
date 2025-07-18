import { type User, type InsertUser } from "@shared/schema";

// Store settings type
export type StoreSettings = {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  thankYouMessage: string;
  storeLogo?: string; // Base64 data URL of the logo
  nextTransactionId: number;
};

// Storage interface specifying the required operations
// Implemented by file-based storage (FileStorage) in fileStorage.ts

export interface IStorage {
  // User methods
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | null>;
  deleteUser(id: number): Promise<boolean>;
  
  // Store settings methods
  getStoreSettings(): Promise<StoreSettings>;
  updateStoreSettings(updates: Partial<StoreSettings>): Promise<StoreSettings>;
  getNextTransactionId(): Promise<number>;
}

/**
 * @deprecated This class is no longer used and is kept for reference only.
 * Use the FileStorage implementation from fileStorage.ts instead.
 */
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    
    // Set session valid until (2 hours from creation)
    const now = new Date();
    const sessionValidUntil = new Date(now);
    sessionValidUntil.setHours(sessionValidUntil.getHours() + 2);
    
    const user: User = { 
      ...insertUser, 
      id,
      lastActive: now.toISOString(),
      sessionValidUntil: sessionValidUntil.toISOString()
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    
    if (!user) {
      return null;
    }
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Store settings implementation (now superseded by fileStorage.ts but kept for interface reference)
  private storeSettings: StoreSettings = {
    storeName: "Inventory Pro Store",
    storeAddress: "123 Main Street, City, State, 12345",
    storePhone: "(555) 123-4567",
    thankYouMessage: "Thank you for shopping with us!",
    nextTransactionId: 1
  };

  async getStoreSettings(): Promise<StoreSettings> {
    return this.storeSettings;
  }

  async updateStoreSettings(updates: Partial<StoreSettings>): Promise<StoreSettings> {
    this.storeSettings = { ...this.storeSettings, ...updates };
    return this.storeSettings;
  }

  async getNextTransactionId(): Promise<number> {
    const currentId = this.storeSettings.nextTransactionId;
    this.storeSettings.nextTransactionId = currentId + 1;
    return currentId;
  }
}

/**
 * @deprecated This storage instance is no longer used in the application.
 * The FileStorage implementation in fileStorage.ts is used instead.
 */
export const storage = new MemStorage();
