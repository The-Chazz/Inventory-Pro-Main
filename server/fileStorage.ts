import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { IStorage } from './storage';
import { User, InsertUser } from '../shared/schema';

// Get the directory name properly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define types for our data structures
type InventoryItem = {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  priceUnit: string;
  costPrice?: number; // Added: Cost price for profit tracking
  profitMargin?: number; // Added: Profit margin percentage
  profitType?: 'percentage' | 'fixed'; // Added: Whether profit is calculated as percentage or fixed amount
  threshold: number;
  status: string;
  image?: string;    // URL or base64 encoded image data
  barcode?: string;  // Barcode value for scanning
};

type SaleItem = {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  unit: string;
  subtotal: number;
};

type Sale = {
  id: string;
  cashier: string;
  date: string;
  amount: number;
  status: string;
  items: SaleItem[];
  refundedBy?: string;
  refundDate?: string;
};

type Stats = {
  totalInventoryItems: number;
  todaySales: number;
  lowStockItems: number;
  activeUsers: number;
  totalInventoryValue: number;
  todayRefunds?: number;
  netSales?: number;
};

type StoreSettings = {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  thankYouMessage: string;
  storeLogo?: string; // Base64 data URL of the logo
  nextTransactionId: number;
};

// Product popularity type
type ProductPopularity = {
  productId: number;
  salesCount: number;
  lastUpdated: string;
};

// Generic type for our JSON data files
type LossItem = {
  id: string;
  inventoryItemId: number;
  itemName: string;
  quantity: number;
  reason: string;
  date: string;
  recordedBy: string;
  value: number;
};

type DataFile<T> = {
  [key: string]: T[];
};

export class FileStorage implements IStorage {
  private dataDir: string;

  /**
   * Initialize the storage system
   */
  constructor() {
    // Set the data directory path
    this.dataDir = path.join(__dirname, 'data');
    
    // Initialize the data directory
    this.initDataDir();
  }
  
  /**
   * Ensures all necessary data files exist in the data directory
   * Creates them with default data if they don't exist
   */
  private async ensureDataFiles() {
    const files = {
      'users.json': JSON.stringify({ users: [
        {
          id: 1,
          name: "Admin User",
          username: "admin",
          pin: "1234",
          role: "admin",
          lastActive: new Date().toISOString(),
          status: "active"
        },
        {
          id: 2,
          name: "Sarah Johnson",
          username: "sarah",
          pin: "5678",
          role: "cashier",
          lastActive: new Date().toISOString(),
          status: "active"
        }
      ]}),
      'inventory.json': JSON.stringify({ items: [] }),
      'sales.json': JSON.stringify({ sales: [] }),
      'losses.json': JSON.stringify({ losses: [] }),
      'stats.json': JSON.stringify({ 
        stats: {
          totalInventoryItems: 0,
          todaySales: 0,
          lowStockItems: 0,
          activeUsers: 2,
          totalInventoryValue: 0,
          todayRefunds: 0,
          netSales: 0
        }
      }),
      'settings.json': JSON.stringify({
        settings: {
          storeName: "Inventory Pro Store",
          storeAddress: "123 Main Street, City, State, 12345",
          storePhone: "(555) 123-4567",
          thankYouMessage: "Thank you for shopping with us!",
          nextTransactionId: 1
        }
      }),
      'popularity.json': JSON.stringify({
        popularity: []
      })
    };

    for (const [fileName, content] of Object.entries(files)) {
      const filePath = path.join(this.dataDir, fileName);
      try {
        await fs.access(filePath);
        console.log(`File exists: ${filePath}`);
      } catch (error) {
        // File doesn't exist, create it
        console.log(`Creating file: ${filePath}`);
        await fs.writeFile(filePath, content, 'utf8');
      }
    }
  }

  /**
   * Initialize the data directory for the application
   */
  private async initDataDir() {
    try {
      // Create the data directory if it doesn't exist
      await fs.access(this.dataDir).catch(async () => {
        await fs.mkdir(this.dataDir, { recursive: true });
        console.log(`Created data directory: ${this.dataDir}`);
      });
      
      // Initialize the data files
      await this.ensureDataFiles();
      
      console.log(`Using data directory: ${this.dataDir}`);
    } catch (error) {
      console.error(`Failed to initialize data directory: ${error}`);
    }
  }

  // Generic function to read data from a JSON file
  async readData<T>(fileName: string, key: string): Promise<T[]> {
    try {
      const filePath = path.join(this.dataDir, fileName);
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data) as DataFile<T>;
      return parsed[key] || [];
    } catch (error) {
      console.error(`Error reading ${fileName}:`, error);
      return [];
    }
  }

  // Generic function to write data to a JSON file
  private async writeData<T>(fileName: string, key: string, data: T[]): Promise<boolean> {
    try {
      const filePath = path.join(this.dataDir, fileName);
      const fileContent = JSON.stringify({ [key]: data }, null, 2);
      await fs.writeFile(filePath, fileContent, 'utf8');
      return true;
    } catch (error) {
      console.error(`Error writing ${fileName}:`, error);
      return false;
    }
  }

  // User methods required by IStorage interface
  async getUsers(): Promise<User[]> {
    return this.readData<User>('users.json', 'users');
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const users = await this.readData<User>('users.json', 'users');
    return users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await this.readData<User>('users.json', 'users');
    return users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const users = await this.readData<User>('users.json', 'users');
    const newId = Math.max(0, ...users.map(user => user.id)) + 1;
    
    // Create a new user with all the required fields
    // Set session valid until default (2 hours from now)
    const now = new Date();
    const sessionValidUntil = new Date(now);
    sessionValidUntil.setHours(sessionValidUntil.getHours() + 2);
    
    const newUser: User = { 
      ...insertUser, 
      id: newId,
      lastActive: now.toISOString(),
      sessionValidUntil: sessionValidUntil.toISOString(),
      status: insertUser.status || 'Active' // Ensure status is set
    };
    
    users.push(newUser);
    await this.writeData('users.json', 'users', users);
    return newUser;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | null> {
    const users = await this.readData<User>('users.json', 'users');
    const userIndex = users.findIndex(user => user.id === id);
    
    if (userIndex === -1) {
      return null;
    }
    
    // Update the user with new values
    const updatedUser = {
      ...users[userIndex],
      ...updates
    };
    
    users[userIndex] = updatedUser;
    await this.writeData('users.json', 'users', users);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      const users = await this.readData<User>('users.json', 'users');
      const initialLength = users.length;
      
      // Filter out the user to delete
      const filteredUsers = users.filter(user => user.id !== id);
      
      if (filteredUsers.length === initialLength) {
        // No user was removed
        return false;
      }
      
      // Write the updated users array
      await this.writeData('users.json', 'users', filteredUsers);
      return true;
    } catch (error) {
      console.error(`Error deleting user with id ${id}:`, error);
      return false;
    }
  }

  // Additional methods for inventory, sales, and stats

  // Inventory methods
  async getInventory(): Promise<InventoryItem[]> {
    return this.readData<InventoryItem>('inventory.json', 'items');
  }

  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const items = await this.readData<InventoryItem>('inventory.json', 'items');
    return items.find(item => item.id === id);
  }

  async updateInventoryItem(id: number, updates: Partial<InventoryItem>): Promise<InventoryItem | null> {
    const items = await this.readData<InventoryItem>('inventory.json', 'items');
    const index = items.findIndex(item => item.id === id);
    
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      await this.writeData('inventory.json', 'items', items);
      return items[index];
    }
    
    return null;
  }

  async addInventoryItem(item: Omit<InventoryItem, 'id' | 'status'>): Promise<InventoryItem> {
    const items = await this.readData<InventoryItem>('inventory.json', 'items');
    const newId = Math.max(0, ...items.map(item => item.id)) + 1;
    
    const newItem: InventoryItem = { 
      ...item as any, // Type cast to avoid TypeScript errors
      id: newId,
      status: item.stock < item.threshold ? 'Low Stock' : 'In Stock'
    };
    
    items.push(newItem);
    await this.writeData('inventory.json', 'items', items);
    return newItem;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const items = await this.readData<InventoryItem>('inventory.json', 'items');
    const newItems = items.filter(item => item.id !== id);
    
    if (newItems.length !== items.length) {
      await this.writeData('inventory.json', 'items', newItems);
      return true;
    }
    
    return false;
  }

  // Sales methods
  async getSales(): Promise<Sale[]> {
    return this.readData<Sale>('sales.json', 'sales');
  }

  async getSale(id: string): Promise<Sale | undefined> {
    const sales = await this.readData<Sale>('sales.json', 'sales');
    return sales.find(sale => sale.id === id);
  }

  async addSale(sale: Omit<Sale, 'id' | 'date'>): Promise<Sale> {
    const sales = await this.readData<Sale>('sales.json', 'sales');
    
    // Get the current date
    const date = new Date();
    const formattedDate = date.toISOString().split('T')[0].replace(/-/g, '');
    
    // Get settings to retrieve last transaction ID
    const settings = await this.getStoreSettings();
    
    // Extract current date in format YYYYMMDD
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateFormatted = `${year}${month}${day}`;
    
    // Find the highest transaction number for today
    let todayMaxNumber = 0;
    
    // Look through existing sales to find the highest transaction number for today
    for (const existingSale of sales) {
      // Check if it's from today - format TRX-20250516-1234
      if (existingSale.id.startsWith(`TRX-${dateFormatted}`)) {
        try {
          // Extract the number part from the ID
          const parts = existingSale.id.split('-');
          if (parts.length === 3) {
            const number = parseInt(parts[2], 10);
            if (!isNaN(number) && number > todayMaxNumber) {
              todayMaxNumber = number;
            }
          }
        } catch (error) {
          console.error('Error parsing transaction ID', existingSale.id, error);
        }
      }
    }
    
    // Increment for the next transaction
    const nextTransactionNumber = todayMaxNumber + 1;
    
    // Create transaction ID in format TRX-YYYYMMDD-####
    const transactionId = `TRX-${dateFormatted}-${nextTransactionNumber}`;
    
    // Create the new sale
    const newSale: Sale = { 
      ...sale as any, // Type cast to avoid TypeScript errors
      id: transactionId,
      date: date.toISOString()
    };
    
    sales.push(newSale);
    await this.writeData('sales.json', 'sales', sales);
    
    // Update product popularity data for dynamic POS arrangement
    await this.updateProductPopularity(newSale.items);
    
    return newSale;
  }
  
  /**
   * Update a sale record (e.g., for refunds)
   * 
   * @param id The ID of the sale to update
   * @param updates Partial updates to apply to the sale
   * @returns The updated sale, or null if not found
   */
  async updateSale(id: string, updates: Partial<Sale>): Promise<Sale | null> {
    const sales = await this.readData<Sale>('sales.json', 'sales');
    const index = sales.findIndex(sale => sale.id === id);
    
    if (index === -1) {
      return null;
    }
    
    // Update the sale with new values
    const updatedSale = {
      ...sales[index],
      ...updates
    };
    
    sales[index] = updatedSale;
    await this.writeData('sales.json', 'sales', sales);
    return updatedSale;
  }
  
  /**
   * Process a refund for a sale
   * 
   * @param id The ID of the sale to refund
   * @param refundedBy Username of the person who processed the refund
   * @returns The updated sale with refunded status, or null if not found
   */
  async refundSale(id: string, refundedBy: string): Promise<Sale | null> {
    const sale = await this.getSale(id);
    
    if (!sale || sale.status === 'Refunded') {
      return null;
    }
    
    // Update inventory stock (add the refunded quantities back)
    for (const item of sale.items) {
      const inventoryItem = await this.getInventoryItem(item.productId);
      if (inventoryItem) {
        const newStock = inventoryItem.stock + item.quantity;
        await this.updateInventoryItem(item.productId, { 
          stock: newStock 
        });
        
        // Check if this change affects low stock status
        if (inventoryItem.stock <= inventoryItem.threshold && newStock > inventoryItem.threshold) {
          // Item just went above threshold, decrement lowStockItems
          const stats = await this.getStats();
          await this.updateStats({ 
            lowStockItems: Math.max(0, stats.lowStockItems - 1)  // Ensure we don't go below 0
          });
        }
      }
    }
    
    // Update sales statistics for today's refunds
    const saleDate = new Date(sale.date);
    const today = new Date();
    
    if (
      saleDate.getFullYear() === today.getFullYear() &&
      saleDate.getMonth() === today.getMonth() &&
      saleDate.getDate() === today.getDate()
    ) {
      const stats = await this.getStats();
      const currentRefunds = stats.todayRefunds || 0;
      const updatedRefunds = currentRefunds + sale.amount;
      const netSales = stats.todaySales - updatedRefunds;
      
      await this.updateStats({
        todayRefunds: updatedRefunds,
        netSales: netSales
      });
    }
    
    // Mark the sale as refunded
    const timestamp = new Date().toISOString();
    const updatedSale = await this.updateSale(id, { 
      status: 'Refunded',
      refundedBy: refundedBy,
      refundDate: timestamp
    });
    
    return updatedSale;
  }

  // Stats methods
  async getStats(): Promise<Stats> {
    try {
      // Get base stats from file
      const filePath = path.join(this.dataDir, 'stats.json');
      const data = await fs.readFile(filePath, 'utf8');
      const stats = JSON.parse(data);
      
      // Handle both nested and flat structure for backwards compatibility
      const baseStats = stats.stats || stats;
      
      // Calculate total inventory value in real-time
      const inventory = await this.getInventory();
      const totalInventoryValue = inventory.reduce((total, item) => {
        return total + (item.price * item.stock);
      }, 0);
      
      // Calculate total inventory items in real-time
      const totalInventoryItems = inventory.length;
      
      // Calculate low stock items in real-time
      const lowStockItems = inventory.filter(item => item.stock <= item.threshold).length;
      
      // Get active users count in real-time
      const users = await this.readData<User>('users.json', 'users');
      const activeUsers = users.filter(user => user.status === 'Active').length;
      
      // Ensure refund stats are initialized
      if (typeof baseStats.todayRefunds === 'undefined') {
        baseStats.todayRefunds = 0;
      }
      
      // Calculate net sales
      const netSales = Math.max(0, (baseStats.todaySales || 0) - (baseStats.todayRefunds || 0));
      
      // Return stats with real-time calculated values
      return {
        ...baseStats,
        totalInventoryValue,
        totalInventoryItems,
        lowStockItems,
        activeUsers,
        netSales
      } as Stats;
    } catch (error) {
      console.error('Error reading stats.json:', error);
      return {
        totalInventoryItems: 0,
        todaySales: 0,
        lowStockItems: 0,
        activeUsers: 0,
        totalInventoryValue: 0,
        todayRefunds: 0,
        netSales: 0
      };
    }
  }

  async updateStats(updates: Partial<Stats>): Promise<Stats | null> {
    try {
      const filePath = path.join(this.dataDir, 'stats.json');
      const data = await fs.readFile(filePath, 'utf8');
      const stats = JSON.parse(data);
      
      // Handle both nested and flat structure for backwards compatibility
      const baseStats = stats.stats || stats;
      
      // Initialize fields if they don't exist in original stats
      if (!baseStats.totalInventoryValue) {
        baseStats.totalInventoryValue = 0;
      }
      
      if (typeof baseStats.todayRefunds === 'undefined') {
        baseStats.todayRefunds = 0;
      }
      
      if (typeof baseStats.netSales === 'undefined') {
        baseStats.netSales = baseStats.todaySales || 0;
      }
      
      const updatedStats: Stats = { 
        ...baseStats, 
        ...updates 
      };
      
      // Recalculate net sales if not explicitly provided but components changed
      if ((updates.todaySales || updates.todayRefunds) && !updates.netSales) {
        updatedStats.netSales = Math.max(0, updatedStats.todaySales - (updatedStats.todayRefunds || 0));
      }
      
      // Only persist non-computed fields like totalInventoryValue, totalInventoryItems, lowStockItems, activeUsers
      const { totalInventoryValue, totalInventoryItems, lowStockItems, activeUsers, ...persistentFields } = updatedStats;
      
      await fs.writeFile(filePath, JSON.stringify(persistentFields, null, 2), 'utf8');
      
      // Return the full stats including computed values
      return updatedStats;
    } catch (error) {
      console.error('Error updating stats.json:', error);
      return null;
    }
  }

  // Losses Management
  async getLosses(): Promise<LossItem[]> {
    try {
      return await this.readData<LossItem>('losses.json', 'losses');
    } catch (error) {
      console.error("Error reading losses:", error);
      return [];
    }
  }

  async getLoss(id: string): Promise<LossItem | undefined> {
    try {
      const losses = await this.getLosses();
      return losses.find(loss => loss.id === id);
    } catch (error) {
      console.error("Error fetching loss:", error);
      return undefined;
    }
  }

  async addLoss(lossData: Omit<LossItem, 'id' | 'date'>): Promise<LossItem> {
    try {
      const losses = await this.getLosses();
      
      // Generate a unique ID for the loss transaction
      const id = `LOSS-${new Date().toISOString().slice(0, 10)}-${String(losses.length + 1).padStart(3, '0')}`;
      
      // Create new loss record
      const newLoss: LossItem = {
        ...lossData as any, // Type cast to avoid TypeScript errors
        id,
        date: new Date().toISOString(),
      };
      
      // Update inventory stock
      await this.updateInventoryFromLoss(newLoss);
      
      // Add the new loss to the collection
      losses.push(newLoss);
      
      // Write the updated losses to file
      await this.writeData<LossItem>('losses.json', 'losses', losses);
      
      return newLoss;
    } catch (error) {
      // Re-throw error for proper handling at the API layer
      throw error;
    }
  }

  private async updateInventoryFromLoss(loss: LossItem): Promise<void> {
    try {
      // Get the inventory item
      const item = await this.getInventoryItem(loss.inventoryItemId);
      if (!item) {
        throw new Error(`Inventory item with ID ${loss.inventoryItemId} not found`);
      }
      
      // Calculate new stock
      const newStock = Math.max(0, item.stock - loss.quantity);
      
      // Update the inventory item's stock
      await this.updateInventoryItem(loss.inventoryItemId, { stock: newStock });
      
      // Update stats if needed
      const stats = await this.getStats();
      if (newStock <= item.threshold && item.stock > item.threshold) {
        // Item has fallen below threshold, increment lowStockItems
        await this.updateStats({ lowStockItems: stats.lowStockItems + 1 });
      }
    } catch (error) {
      // Re-throw error for proper handling in calling method
      throw error;
    }
  }
  
  /**
   * Update a loss record
   * 
   * @param id The ID of the loss record to update
   * @param updates Partial updates to apply to the loss record
   * @returns The updated loss record, or null if not found
   */
  async updateLoss(id: string, updates: Partial<LossItem>): Promise<LossItem | null> {
    try {
      // Get all loss records
      const losses = await this.getLosses();
      
      // Find the index of the loss to update
      const index = losses.findIndex(loss => loss.id === id);
      if (index === -1) {
        return null;
      }
      
      // Get original loss for comparison
      const originalLoss = losses[index];
      
      // Create updated loss record
      const updatedLoss: LossItem = {
        ...originalLoss,
        ...updates
      };
      
      // Handle inventory adjustments if quantity has changed
      if (updates.quantity !== undefined && updates.quantity !== originalLoss.quantity) {
        const inventoryItem = await this.getInventoryItem(originalLoss.inventoryItemId);
        if (inventoryItem) {
          // Calculate the quantity difference (positive means more loss, negative means less)
          const quantityDifference = updates.quantity - originalLoss.quantity;
          
          // Get current inventory stock
          const currentStock = inventoryItem.stock;
          
          // Calculate new stock (add back the original quantity, then subtract the new quantity)
          const newStock = Math.max(0, currentStock - quantityDifference);
          
          // Update inventory
          await this.updateInventoryItem(originalLoss.inventoryItemId, { stock: newStock });
          
          // Update stats if threshold status changed
          const stats = await this.getStats();
          if (currentStock > inventoryItem.threshold && newStock <= inventoryItem.threshold) {
            // Item just went below threshold
            await this.updateStats({ lowStockItems: stats.lowStockItems + 1 });
          } else if (currentStock <= inventoryItem.threshold && newStock > inventoryItem.threshold) {
            // Item moved above threshold
            await this.updateStats({ lowStockItems: Math.max(0, stats.lowStockItems - 1) });
          }
          
          // Update value if not explicitly provided
          if (updates.value === undefined) {
            updatedLoss.value = updates.quantity * inventoryItem.price;
          }
        }
      }
      
      // Update loss record
      losses[index] = updatedLoss;
      await this.writeData<LossItem>('losses.json', 'losses', losses);
      
      return updatedLoss;
    } catch (error) {
      // Simply re-throw for consistent error handling at API level
      throw error;
    }
  }

  /**
   * Get the store settings
   */
  async getStoreSettings(): Promise<StoreSettings> {
    try {
      const data = await this.readData<StoreSettings>('settings.json', 'settings');
      if (data && data.length > 0) {
        return data[0];
      }
      // Return default settings if none found
      return {
        storeName: "Inventory Pro Store",
        storeAddress: "123 Main Street, City, State, 12345",
        storePhone: "(555) 123-4567",
        thankYouMessage: "Thank you for shopping with us!",
        nextTransactionId: 1
      };
    } catch (error) {
      // Re-throw for handling at API level
      throw error;
    }
  }

  /**
   * Update the store settings
   */
  async updateStoreSettings(updates: Partial<StoreSettings>): Promise<StoreSettings> {
    try {
      const currentSettings = await this.getStoreSettings();
      const updatedSettings = { ...currentSettings, ...updates };
      
      await this.writeData('settings.json', 'settings', [updatedSettings]);
      return updatedSettings;
    } catch (error) {
      // Re-throw for handling at API level
      throw error;
    }
  }

  /**
   * Get the next transaction ID and increment it
   */
  async getNextTransactionId(): Promise<number> {
    try {
      const settings = await this.getStoreSettings();
      const currentId = settings.nextTransactionId;
      
      // Increment the transaction ID for next time
      await this.updateStoreSettings({ nextTransactionId: currentId + 1 });
      
      return currentId;
    } catch (error) {
      // Re-throw for handling at API level
      throw error;
    }
  }

  /**
   * Get product popularity data
   */
  async getProductPopularity(): Promise<ProductPopularity[]> {
    try {
      const data = await this.readData<ProductPopularity>('popularity.json', 'popularity');
      return data || [];
    } catch (error) {
      // Return empty array for data not found - fallback for non-critical data
      return [];
    }
  }
  
  /**
   * Update product popularity when a sale is completed
   */
  async updateProductPopularity(items: SaleItem[]): Promise<void> {
    try {
      const popularityData = await this.getProductPopularity();
      const currentDate = new Date().toISOString();
      
      // Update counts for each product in the sale
      for (const item of items) {
        const productId = item.productId;
        const existingIndex = popularityData.findIndex(p => p.productId === productId);
        
        if (existingIndex >= 0) {
          // Update existing product popularity
          popularityData[existingIndex].salesCount += item.quantity;
          popularityData[existingIndex].lastUpdated = currentDate;
        } else {
          // Add new product popularity entry
          popularityData.push({
            productId,
            salesCount: item.quantity,
            lastUpdated: currentDate
          });
        }
      }
      
      // Sort by sales count (most popular first)
      popularityData.sort((a, b) => b.salesCount - a.salesCount);
      
      // Save updated popularity data
      await this.writeData('popularity.json', 'popularity', popularityData);
    } catch (error) {
      // Silently fail for non-critical popularity data
      // Product popularity is non-essential and shouldn't break the application
    }
  }
  
  /**
   * Get inventory sorted by popularity
   */
  async getInventoryByPopularity(): Promise<InventoryItem[]> {
    try {
      const inventory = await this.getInventory();
      const popularity = await this.getProductPopularity();
      
      // Create a map of productId to popularity for quick lookup
      const popularityMap = new Map<number, number>();
      popularity.forEach(item => {
        popularityMap.set(item.productId, item.salesCount);
      });
      
      // Sort inventory by popularity (higher first), then alphabetically for items with same popularity
      return inventory.sort((a, b) => {
        const aPopularity = popularityMap.get(a.id) || 0;
        const bPopularity = popularityMap.get(b.id) || 0;
        
        if (bPopularity !== aPopularity) {
          return bPopularity - aPopularity;
        }
        
        // If popularity is the same, sort alphabetically by name
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      // Return regular inventory as fallback if sorting by popularity fails
      return this.getInventory();
    }
  }
}

export const fileStorage = new FileStorage();