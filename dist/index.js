// server/config.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var rootDir = path.join(__dirname, "..");
function loadEnvFile() {
  try {
    const envPath = path.join(rootDir, ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const envLines = envContent.split("\n");
      for (const line of envLines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("#")) continue;
        const [key, value] = trimmedLine.split("=");
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
      }
    }
  } catch (error) {
  }
}
loadEnvFile();
var config = {
  useFileStorage: true,
  // Always use file storage
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  sessionSecret: process.env.SESSION_SECRET || "inventory-pro-secret-key-1234",
  sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || "7200000", 10)
  // 2 hours in milliseconds
};
console.log("App configuration:");
console.log("- File storage mode: enabled (always)");
console.log("- Environment:", config.nodeEnv);
console.log("- Port:", config.port);
console.log("- Session max age:", config.sessionMaxAge, "ms");

// server/index.ts
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// server/fileStorage.ts
import fs2 from "fs/promises";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { dirname } from "path";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname(__filename2);
var FileStorage = class {
  dataDir;
  /**
   * Initialize the storage system
   */
  constructor() {
    this.dataDir = path2.join(__dirname2, "data");
    this.initDataDir();
  }
  /**
   * Ensures all necessary data files exist in the data directory
   * Creates them with default data if they don't exist
   */
  async ensureDataFiles() {
    const files = {
      "users.json": JSON.stringify({ users: [
        {
          id: 1,
          name: "Admin User",
          username: "admin",
          pin: "1234",
          role: "admin",
          lastActive: (/* @__PURE__ */ new Date()).toISOString(),
          status: "active"
        },
        {
          id: 2,
          name: "Sarah Johnson",
          username: "sarah",
          pin: "5678",
          role: "cashier",
          lastActive: (/* @__PURE__ */ new Date()).toISOString(),
          status: "active"
        }
      ] }),
      "inventory.json": JSON.stringify({ items: [] }),
      "sales.json": JSON.stringify({ sales: [] }),
      "losses.json": JSON.stringify({ losses: [] }),
      "stats.json": JSON.stringify({
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
      "settings.json": JSON.stringify({
        settings: {
          storeName: "Inventory Pro Store",
          storeAddress: "123 Main Street, City, State, 12345",
          storePhone: "(555) 123-4567",
          thankYouMessage: "Thank you for shopping with us!",
          nextTransactionId: 1
        }
      }),
      "popularity.json": JSON.stringify({
        popularity: []
      })
    };
    for (const [fileName, content] of Object.entries(files)) {
      const filePath = path2.join(this.dataDir, fileName);
      try {
        await fs2.access(filePath);
        console.log(`File exists: ${filePath}`);
      } catch (error) {
        console.log(`Creating file: ${filePath}`);
        await fs2.writeFile(filePath, content, "utf8");
      }
    }
  }
  /**
   * Initialize the data directory for the application
   */
  async initDataDir() {
    try {
      await fs2.access(this.dataDir).catch(async () => {
        await fs2.mkdir(this.dataDir, { recursive: true });
        console.log(`Created data directory: ${this.dataDir}`);
      });
      await this.ensureDataFiles();
      console.log(`Using data directory: ${this.dataDir}`);
    } catch (error) {
      console.error(`Failed to initialize data directory: ${error}`);
    }
  }
  // Generic function to read data from a JSON file
  async readData(fileName, key) {
    try {
      const filePath = path2.join(this.dataDir, fileName);
      const data = await fs2.readFile(filePath, "utf8");
      const parsed = JSON.parse(data);
      return parsed[key] || [];
    } catch (error) {
      console.error(`Error reading ${fileName}:`, error);
      return [];
    }
  }
  // Generic function to write data to a JSON file
  async writeData(fileName, key, data) {
    try {
      const filePath = path2.join(this.dataDir, fileName);
      const fileContent = JSON.stringify({ [key]: data }, null, 2);
      await fs2.writeFile(filePath, fileContent, "utf8");
      return true;
    } catch (error) {
      console.error(`Error writing ${fileName}:`, error);
      return false;
    }
  }
  // User methods required by IStorage interface
  async getUsers() {
    return this.readData("users.json", "users");
  }
  async getUser(id) {
    const users = await this.readData("users.json", "users");
    return users.find((user) => user.id === id);
  }
  async getUserByUsername(username) {
    const users = await this.readData("users.json", "users");
    return users.find((user) => user.username === username);
  }
  async createUser(insertUser) {
    const users = await this.readData("users.json", "users");
    const newId = Math.max(0, ...users.map((user) => user.id)) + 1;
    const now = /* @__PURE__ */ new Date();
    const sessionValidUntil = new Date(now);
    sessionValidUntil.setHours(sessionValidUntil.getHours() + 2);
    const newUser = {
      ...insertUser,
      id: newId,
      lastActive: now.toISOString(),
      sessionValidUntil: sessionValidUntil.toISOString(),
      status: insertUser.status || "Active"
      // Ensure status is set
    };
    users.push(newUser);
    await this.writeData("users.json", "users", users);
    return newUser;
  }
  async updateUser(id, updates) {
    const users = await this.readData("users.json", "users");
    const userIndex = users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      return null;
    }
    const updatedUser = {
      ...users[userIndex],
      ...updates
    };
    users[userIndex] = updatedUser;
    await this.writeData("users.json", "users", users);
    return updatedUser;
  }
  async deleteUser(id) {
    try {
      const users = await this.readData("users.json", "users");
      const initialLength = users.length;
      const filteredUsers = users.filter((user) => user.id !== id);
      if (filteredUsers.length === initialLength) {
        return false;
      }
      await this.writeData("users.json", "users", filteredUsers);
      return true;
    } catch (error) {
      console.error(`Error deleting user with id ${id}:`, error);
      return false;
    }
  }
  // Additional methods for inventory, sales, and stats
  // Inventory methods
  async getInventory() {
    return this.readData("inventory.json", "items");
  }
  async getInventoryItem(id) {
    const items = await this.readData("inventory.json", "items");
    return items.find((item) => item.id === id);
  }
  async updateInventoryItem(id, updates) {
    const items = await this.readData("inventory.json", "items");
    const index = items.findIndex((item) => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      await this.writeData("inventory.json", "items", items);
      return items[index];
    }
    return null;
  }
  async addInventoryItem(item) {
    const items = await this.readData("inventory.json", "items");
    const newId = Math.max(0, ...items.map((item2) => item2.id)) + 1;
    const newItem = {
      ...item,
      // Type cast to avoid TypeScript errors
      id: newId,
      status: item.stock < item.threshold ? "Low Stock" : "In Stock"
    };
    items.push(newItem);
    await this.writeData("inventory.json", "items", items);
    return newItem;
  }
  async deleteInventoryItem(id) {
    const items = await this.readData("inventory.json", "items");
    const newItems = items.filter((item) => item.id !== id);
    if (newItems.length !== items.length) {
      await this.writeData("inventory.json", "items", newItems);
      return true;
    }
    return false;
  }
  // Sales methods
  async getSales() {
    return this.readData("sales.json", "sales");
  }
  async getSale(id) {
    const sales = await this.readData("sales.json", "sales");
    return sales.find((sale) => sale.id === id);
  }
  async addSale(sale) {
    const sales = await this.readData("sales.json", "sales");
    const date = /* @__PURE__ */ new Date();
    const formattedDate = date.toISOString().split("T")[0].replace(/-/g, "");
    const settings = await this.getStoreSettings();
    const today = /* @__PURE__ */ new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const dateFormatted = `${year}${month}${day}`;
    let todayMaxNumber = 0;
    for (const existingSale of sales) {
      if (existingSale.id.startsWith(`TRX-${dateFormatted}`)) {
        try {
          const parts = existingSale.id.split("-");
          if (parts.length === 3) {
            const number = parseInt(parts[2], 10);
            if (!isNaN(number) && number > todayMaxNumber) {
              todayMaxNumber = number;
            }
          }
        } catch (error) {
          console.error("Error parsing transaction ID", existingSale.id, error);
        }
      }
    }
    const nextTransactionNumber = todayMaxNumber + 1;
    const transactionId = `TRX-${dateFormatted}-${nextTransactionNumber}`;
    const newSale = {
      ...sale,
      // Type cast to avoid TypeScript errors
      id: transactionId,
      date: date.toISOString()
    };
    sales.push(newSale);
    await this.writeData("sales.json", "sales", sales);
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
  async updateSale(id, updates) {
    const sales = await this.readData("sales.json", "sales");
    const index = sales.findIndex((sale) => sale.id === id);
    if (index === -1) {
      return null;
    }
    const updatedSale = {
      ...sales[index],
      ...updates
    };
    sales[index] = updatedSale;
    await this.writeData("sales.json", "sales", sales);
    return updatedSale;
  }
  /**
   * Process a refund for a sale
   * 
   * @param id The ID of the sale to refund
   * @param refundedBy Username of the person who processed the refund
   * @returns The updated sale with refunded status, or null if not found
   */
  async refundSale(id, refundedBy) {
    const sale = await this.getSale(id);
    if (!sale || sale.status === "Refunded") {
      return null;
    }
    for (const item of sale.items) {
      const inventoryItem = await this.getInventoryItem(item.productId);
      if (inventoryItem) {
        const newStock = inventoryItem.stock + item.quantity;
        await this.updateInventoryItem(item.productId, {
          stock: newStock
        });
        if (inventoryItem.stock <= inventoryItem.threshold && newStock > inventoryItem.threshold) {
          const stats = await this.getStats();
          await this.updateStats({
            lowStockItems: Math.max(0, stats.lowStockItems - 1)
            // Ensure we don't go below 0
          });
        }
      }
    }
    const saleDate = new Date(sale.date);
    const today = /* @__PURE__ */ new Date();
    if (saleDate.getFullYear() === today.getFullYear() && saleDate.getMonth() === today.getMonth() && saleDate.getDate() === today.getDate()) {
      const stats = await this.getStats();
      const currentRefunds = stats.todayRefunds || 0;
      const updatedRefunds = currentRefunds + sale.amount;
      const netSales = stats.todaySales - updatedRefunds;
      await this.updateStats({
        todayRefunds: updatedRefunds,
        netSales
      });
    }
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const updatedSale = await this.updateSale(id, {
      status: "Refunded",
      refundedBy,
      refundDate: timestamp
    });
    return updatedSale;
  }
  // Stats methods
  async getStats() {
    try {
      const filePath = path2.join(this.dataDir, "stats.json");
      const data = await fs2.readFile(filePath, "utf8");
      const stats = JSON.parse(data);
      const baseStats = stats.stats || stats;
      const inventory = await this.getInventory();
      const totalInventoryValue = inventory.reduce((total, item) => {
        return total + item.price * item.stock;
      }, 0);
      const totalInventoryItems = inventory.length;
      const lowStockItems = inventory.filter((item) => item.stock <= item.threshold).length;
      const users = await this.readData("users.json", "users");
      const activeUsers = users.filter((user) => user.status === "Active").length;
      if (typeof baseStats.todayRefunds === "undefined") {
        baseStats.todayRefunds = 0;
      }
      const netSales = Math.max(0, (baseStats.todaySales || 0) - (baseStats.todayRefunds || 0));
      return {
        ...baseStats,
        totalInventoryValue,
        totalInventoryItems,
        lowStockItems,
        activeUsers,
        netSales
      };
    } catch (error) {
      console.error("Error reading stats.json:", error);
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
  async updateStats(updates) {
    try {
      const filePath = path2.join(this.dataDir, "stats.json");
      const data = await fs2.readFile(filePath, "utf8");
      const stats = JSON.parse(data);
      const baseStats = stats.stats || stats;
      if (!baseStats.totalInventoryValue) {
        baseStats.totalInventoryValue = 0;
      }
      if (typeof baseStats.todayRefunds === "undefined") {
        baseStats.todayRefunds = 0;
      }
      if (typeof baseStats.netSales === "undefined") {
        baseStats.netSales = baseStats.todaySales || 0;
      }
      const updatedStats = {
        ...baseStats,
        ...updates
      };
      if ((updates.todaySales || updates.todayRefunds) && !updates.netSales) {
        updatedStats.netSales = Math.max(0, updatedStats.todaySales - (updatedStats.todayRefunds || 0));
      }
      const { totalInventoryValue, totalInventoryItems, lowStockItems, activeUsers, ...persistentFields } = updatedStats;
      await fs2.writeFile(filePath, JSON.stringify(persistentFields, null, 2), "utf8");
      return updatedStats;
    } catch (error) {
      console.error("Error updating stats.json:", error);
      return null;
    }
  }
  // Losses Management
  async getLosses() {
    try {
      return await this.readData("losses.json", "losses");
    } catch (error) {
      console.error("Error reading losses:", error);
      return [];
    }
  }
  async getLoss(id) {
    try {
      const losses = await this.getLosses();
      return losses.find((loss) => loss.id === id);
    } catch (error) {
      console.error("Error fetching loss:", error);
      return void 0;
    }
  }
  async addLoss(lossData) {
    try {
      const losses = await this.getLosses();
      const id = `LOSS-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}-${String(losses.length + 1).padStart(3, "0")}`;
      const newLoss = {
        ...lossData,
        // Type cast to avoid TypeScript errors
        id,
        date: (/* @__PURE__ */ new Date()).toISOString()
      };
      await this.updateInventoryFromLoss(newLoss);
      losses.push(newLoss);
      await this.writeData("losses.json", "losses", losses);
      return newLoss;
    } catch (error) {
      throw error;
    }
  }
  async updateInventoryFromLoss(loss) {
    try {
      const item = await this.getInventoryItem(loss.inventoryItemId);
      if (!item) {
        throw new Error(`Inventory item with ID ${loss.inventoryItemId} not found`);
      }
      const newStock = Math.max(0, item.stock - loss.quantity);
      await this.updateInventoryItem(loss.inventoryItemId, { stock: newStock });
      const stats = await this.getStats();
      if (newStock <= item.threshold && item.stock > item.threshold) {
        await this.updateStats({ lowStockItems: stats.lowStockItems + 1 });
      }
    } catch (error) {
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
  async updateLoss(id, updates) {
    try {
      const losses = await this.getLosses();
      const index = losses.findIndex((loss) => loss.id === id);
      if (index === -1) {
        return null;
      }
      const originalLoss = losses[index];
      const updatedLoss = {
        ...originalLoss,
        ...updates
      };
      if (updates.quantity !== void 0 && updates.quantity !== originalLoss.quantity) {
        const inventoryItem = await this.getInventoryItem(originalLoss.inventoryItemId);
        if (inventoryItem) {
          const quantityDifference = updates.quantity - originalLoss.quantity;
          const currentStock = inventoryItem.stock;
          const newStock = Math.max(0, currentStock - quantityDifference);
          await this.updateInventoryItem(originalLoss.inventoryItemId, { stock: newStock });
          const stats = await this.getStats();
          if (currentStock > inventoryItem.threshold && newStock <= inventoryItem.threshold) {
            await this.updateStats({ lowStockItems: stats.lowStockItems + 1 });
          } else if (currentStock <= inventoryItem.threshold && newStock > inventoryItem.threshold) {
            await this.updateStats({ lowStockItems: Math.max(0, stats.lowStockItems - 1) });
          }
          if (updates.value === void 0) {
            updatedLoss.value = updates.quantity * inventoryItem.price;
          }
        }
      }
      losses[index] = updatedLoss;
      await this.writeData("losses.json", "losses", losses);
      return updatedLoss;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Get the store settings
   */
  async getStoreSettings() {
    try {
      const data = await this.readData("settings.json", "settings");
      if (data && data.length > 0) {
        return data[0];
      }
      return {
        storeName: "Inventory Pro Store",
        storeAddress: "123 Main Street, City, State, 12345",
        storePhone: "(555) 123-4567",
        thankYouMessage: "Thank you for shopping with us!",
        nextTransactionId: 1
      };
    } catch (error) {
      throw error;
    }
  }
  /**
   * Update the store settings
   */
  async updateStoreSettings(updates) {
    try {
      const currentSettings = await this.getStoreSettings();
      const updatedSettings = { ...currentSettings, ...updates };
      await this.writeData("settings.json", "settings", [updatedSettings]);
      return updatedSettings;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Get the next transaction ID and increment it
   */
  async getNextTransactionId() {
    try {
      const settings = await this.getStoreSettings();
      const currentId = settings.nextTransactionId;
      await this.updateStoreSettings({ nextTransactionId: currentId + 1 });
      return currentId;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Get product popularity data
   */
  async getProductPopularity() {
    try {
      const data = await this.readData("popularity.json", "popularity");
      return data || [];
    } catch (error) {
      return [];
    }
  }
  /**
   * Update product popularity when a sale is completed
   */
  async updateProductPopularity(items) {
    try {
      const popularityData = await this.getProductPopularity();
      const currentDate = (/* @__PURE__ */ new Date()).toISOString();
      for (const item of items) {
        const productId = item.productId;
        const existingIndex = popularityData.findIndex((p) => p.productId === productId);
        if (existingIndex >= 0) {
          popularityData[existingIndex].salesCount += item.quantity;
          popularityData[existingIndex].lastUpdated = currentDate;
        } else {
          popularityData.push({
            productId,
            salesCount: item.quantity,
            lastUpdated: currentDate
          });
        }
      }
      popularityData.sort((a, b) => b.salesCount - a.salesCount);
      await this.writeData("popularity.json", "popularity", popularityData);
    } catch (error) {
    }
  }
  /**
   * Get inventory sorted by popularity
   */
  async getInventoryByPopularity() {
    try {
      const inventory = await this.getInventory();
      const popularity = await this.getProductPopularity();
      const popularityMap = /* @__PURE__ */ new Map();
      popularity.forEach((item) => {
        popularityMap.set(item.productId, item.salesCount);
      });
      return inventory.sort((a, b) => {
        const aPopularity = popularityMap.get(a.id) || 0;
        const bPopularity = popularityMap.get(b.id) || 0;
        if (bPopularity !== aPopularity) {
          return bPopularity - aPopularity;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      return this.getInventory();
    }
  }
};
var fileStorage = new FileStorage();

// server/logStorage.ts
import fs3 from "fs";
import path3 from "path";
var FileLogStorage = class {
  logsCache = /* @__PURE__ */ new Map();
  nextId = 1;
  constructor() {
    this.loadLogsFromFile();
  }
  async loadLogsFromFile() {
    try {
      const logsDir = path3.join(process.cwd(), "server", "data");
      const logsFile = path3.join(logsDir, "activity_logs.json");
      if (!fs3.existsSync(logsFile)) {
        if (!fs3.existsSync(logsDir)) {
          fs3.mkdirSync(logsDir, { recursive: true });
        }
        fs3.writeFileSync(logsFile, JSON.stringify({ logs: [] }));
        return;
      }
      const data = JSON.parse(fs3.readFileSync(logsFile, "utf-8"));
      if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach((log2) => {
          this.logsCache.set(log2.id, {
            ...log2,
            timestamp: new Date(log2.timestamp)
          });
          if (log2.id >= this.nextId) {
            this.nextId = log2.id + 1;
          }
        });
      }
    } catch (error) {
      this.logsCache.clear();
      this.nextId = 1;
    }
  }
  async saveLogsToFile() {
    try {
      const logsDir = path3.join(process.cwd(), "server", "data");
      const logsFile = path3.join(logsDir, "activity_logs.json");
      if (!fs3.existsSync(logsDir)) {
        fs3.mkdirSync(logsDir, { recursive: true });
      }
      const logs = Array.from(this.logsCache.values());
      fs3.writeFileSync(logsFile, JSON.stringify({ logs }, null, 2));
    } catch (error) {
      console.error("Error saving logs to file:", error);
    }
  }
  async createLog(log2) {
    console.log("Creating log in file storage:", log2);
    const newLog = {
      id: this.nextId++,
      userId: log2.userId,
      username: log2.username,
      action: log2.action,
      category: log2.category,
      details: log2.details || "",
      timestamp: /* @__PURE__ */ new Date()
    };
    this.logsCache.set(newLog.id, newLog);
    await this.saveLogsToFile();
    return newLog;
  }
  async getLogs() {
    return Array.from(this.logsCache.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  async getLogsByCategory(category) {
    return Array.from(this.logsCache.values()).filter((log2) => log2.category === category).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  async getLogsByUser(userId) {
    return Array.from(this.logsCache.values()).filter((log2) => log2.userId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  async getLogById(id) {
    return this.logsCache.get(id);
  }
};
var logStorage = new FileLogStorage();

// server/logger.ts
var LOG_CATEGORIES = {
  USER: "user",
  INVENTORY: "inventory",
  SALES: "sales",
  LOSSES: "losses",
  SETTINGS: "settings",
  AUTHENTICATION: "authentication",
  SYSTEM: "system"
};
var LOG_ACTIONS = {
  USER: {
    CREATE: "User Created",
    UPDATE: "User Updated",
    DELETE: "User Deleted",
    STATUS_CHANGE: "User Status Changed"
  },
  INVENTORY: {
    CREATE: "Inventory Item Created",
    UPDATE: "Inventory Item Updated",
    DELETE: "Inventory Item Deleted",
    BULK_IMPORT: "Bulk Inventory Import"
  },
  SALES: {
    CREATE: "Sale Recorded",
    REPRINT: "Receipt Reprinted",
    REFUND: "Sale Refunded"
  },
  LOSSES: {
    CREATE: "Loss Recorded",
    UPDATE: "Loss Updated"
  },
  SETTINGS: {
    UPDATE: "Settings Updated"
  },
  AUTHENTICATION: {
    LOGIN: "User Login",
    LOGOUT: "User Logout",
    FAILED_LOGIN: "Failed Login Attempt"
  },
  SYSTEM: {
    ERROR: "System Error",
    STARTUP: "System Startup"
  }
};
var ActivityLogger = class {
  // Log any activity
  static async log(userId, username, category, action, details) {
    try {
      const logEntry = {
        userId,
        username,
        category,
        action,
        details: details || ""
      };
      await logStorage.createLog(logEntry);
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  }
  // Helper methods for common log types
  static async logUserActivity(userId, username, action, details) {
    return this.log(userId, username, LOG_CATEGORIES.USER, action, details);
  }
  static async logInventoryActivity(userId, username, action, details) {
    return this.log(userId, username, LOG_CATEGORIES.INVENTORY, action, details);
  }
  static async logSalesActivity(userId, username, action, details) {
    return this.log(userId, username, LOG_CATEGORIES.SALES, action, details);
  }
  static async logLossActivity(userId, username, action, details) {
    return this.log(userId, username, LOG_CATEGORIES.LOSSES, action, details);
  }
  static async logSettingsActivity(userId, username, action, details) {
    return this.log(userId, username, LOG_CATEGORIES.SETTINGS, action, details);
  }
  static async logAuthActivity(userId, username, action, details) {
    return this.log(userId, username, LOG_CATEGORIES.AUTHENTICATION, action, details);
  }
  static async logSystemActivity(action, details) {
    return this.log(0, "SYSTEM", LOG_CATEGORIES.SYSTEM, action, details);
  }
};

// server/productLookup.ts
async function searchOpenFoodFacts(barcode) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    if (data.status === 1 && data.product) {
      const product = data.product;
      const name = product.product_name || product.product_name_en || product.product_name_fr || product.product_name_es || product.abbreviated_product_name || product.generic_name || product.generic_name_en;
      const description = product.generic_name || product.generic_name_en || product.ingredients_text_en || product.ingredients_text;
      const imageUrl = product.image_front_url || product.image_url || product.image_front_small_url || product.selected_images && product.selected_images.front && product.selected_images.front.display && product.selected_images.front.display.en;
      if (name) {
        return {
          name: name.trim(),
          description: description ? description.trim() : void 0,
          brand: product.brands,
          category: product.categories || product.categories_tags?.[0],
          imageUrl,
          success: true,
          source: "Open Food Facts"
        };
      }
    }
  } catch (error) {
  }
  return { success: false };
}
async function searchUPCDatabase(barcode) {
  try {
    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    const data = await response.json();
    if (data.code === "OK" && data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        name: item.title,
        description: item.description,
        brand: item.brand,
        category: item.category,
        imageUrl: item.images && item.images.length > 0 ? item.images[0] : void 0,
        success: true,
        source: "UPC Database"
      };
    }
  } catch (error) {
  }
  return { success: false };
}
async function searchBarcodeSpider(barcode) {
  try {
    const response = await fetch(`https://api.barcodespider.com/v1/lookup?token=free&upc=${barcode}`);
    const data = await response.json();
    if (data.item_response && data.item_response.message === "success") {
      const item = data.item_response.item_attributes;
      return {
        name: item.title,
        description: item.description,
        brand: item.brand,
        category: item.category,
        imageUrl: item.image,
        success: true,
        source: "Barcode Spider"
      };
    }
  } catch (error) {
  }
  return { success: false };
}
async function searchBarcodeLookup(barcode) {
  try {
    const response = await fetch(`https://www.barcodelookup.com/${barcode}`);
    const text = await response.text();
    const nameMatch = text.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const imageMatch = text.match(/<meta property="og:image" content="([^"]+)"/i);
    const descMatch = text.match(/<meta property="og:description" content="([^"]+)"/i);
    if (nameMatch && nameMatch[1]) {
      return {
        name: nameMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : void 0,
        imageUrl: imageMatch ? imageMatch[1].trim() : void 0,
        success: true,
        source: "Barcode Lookup"
      };
    }
  } catch (error) {
  }
  return { success: false };
}
async function searchEANSearch(barcode) {
  try {
    const response = await fetch(`https://www.ean-search.org/api?op=barcode-lookup&format=json&ean=${barcode}`);
    const data = await response.json();
    if (data && data.length > 0 && data[0].name) {
      const product = data[0];
      return {
        name: product.name,
        description: product.description,
        category: product.categoryText,
        imageUrl: product.image,
        success: true,
        source: "EAN Search"
      };
    }
  } catch (error) {
  }
  return { success: false };
}
async function lookupProductByBarcode(barcode) {
  const cleanBarcode = barcode.replace(/\D/g, "");
  if (!cleanBarcode || cleanBarcode.length < 8) {
    return { success: false };
  }
  const barcodeVariants = [
    cleanBarcode,
    // Add leading zeros for UPC-A format (12 digits)
    cleanBarcode.length === 11 ? "0" + cleanBarcode : null,
    // Try without leading zeros for EAN-13 format
    cleanBarcode.startsWith("0") && cleanBarcode.length === 13 ? cleanBarcode.substring(1) : null,
    // Try both with and without check digit
    cleanBarcode.length > 8 ? cleanBarcode.substring(0, cleanBarcode.length - 1) : null
  ].filter(Boolean);
  const apis = [
    searchOpenFoodFacts,
    searchUPCDatabase,
    searchEANSearch,
    searchBarcodeSpider,
    searchBarcodeLookup
  ];
  for (const barcodeVariant of barcodeVariants) {
    for (const api of apis) {
      try {
        const result = await api(barcodeVariant);
        if (result.success) {
          return result;
        }
      } catch (error) {
        continue;
      }
    }
  }
  return { success: false };
}

// server/routes.ts
import path5 from "path";
import { fileURLToPath as fileURLToPath4 } from "url";
import { dirname as dirname3 } from "path";

// server/fileUpload.ts
import multer from "multer";
import path4 from "path";
import fs4 from "fs-extra";
import { fileURLToPath as fileURLToPath3 } from "url";
import { dirname as dirname2 } from "path";
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname3 = dirname2(__filename3);
var uploadDir = path4.join(__dirname3, "uploads");
var inventoryImagesDir = path4.join(uploadDir, "inventory");
var logoImagesDir = path4.join(uploadDir, "logos");
var csvDir = path4.join(uploadDir, "csv");
console.log(`Creating upload directories if they don't exist:`);
console.log(`- Upload dir: ${uploadDir}`);
console.log(`- Inventory images dir: ${inventoryImagesDir}`);
console.log(`- Logo images dir: ${logoImagesDir}`);
console.log(`- CSV dir: ${csvDir}`);
fs4.ensureDirSync(uploadDir);
fs4.ensureDirSync(inventoryImagesDir);
fs4.ensureDirSync(logoImagesDir);
fs4.ensureDirSync(csvDir);
var inventoryStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, inventoryImagesDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path4.extname(file.originalname);
    cb(null, "inventory-" + uniqueSuffix + ext);
  }
});
var logoStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, logoImagesDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path4.extname(file.originalname);
    cb(null, "store-logo-" + uniqueSuffix + ext);
  }
});
var csvStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path4.join(uploadDir, "csv"));
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "inventory-import-" + uniqueSuffix + ".csv");
  }
});
var imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};
var csvFileFilter = (req, file, cb) => {
  if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV files are allowed"));
  }
};
var inventoryImageUpload = multer({
  storage: inventoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB max file size
  },
  fileFilter: imageFileFilter
});
var logoImageUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024
    // 2MB max file size
  },
  fileFilter: imageFileFilter
});
var csvUpload = multer({
  storage: csvStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB max file size
  },
  fileFilter: csvFileFilter
});
fs4.ensureDirSync(path4.join(uploadDir, "csv"));
async function processCsvFile(filePath) {
  const fs7 = await import("fs/promises");
  const { parse } = await import("csv-parse/sync");
  try {
    console.log(`Processing CSV file: ${filePath}`);
    const content = await fs7.readFile(filePath, "utf-8");
    const records = parse(content, {
      columns: (header) => {
        console.log("Original CSV headers:", header);
        return header.map((column) => {
          let normalizedColumn = column.toLowerCase().trim();
          if (normalizedColumn === "price unit" || normalizedColumn === "priceunit" || normalizedColumn === "unit price") {
            normalizedColumn = "priceunit";
          } else if (normalizedColumn === "barcode number" || normalizedColumn === "barcode") {
            normalizedColumn = "barcode";
          }
          return normalizedColumn;
        });
      },
      skip_empty_lines: true,
      trim: true
    });
    console.log(`Processed ${records.length} records from CSV`);
    const standardizedRecords = records.map((record) => {
      const normalizedRecord = {};
      Object.keys(record).forEach((key) => {
        if (record[key] !== void 0 && record[key] !== null && record[key] !== "") {
          normalizedRecord[key.toLowerCase()] = record[key];
        }
      });
      return normalizedRecord;
    });
    return standardizedRecords;
  } catch (error) {
    console.error(`Error processing CSV file: ${error}`);
    throw error;
  }
}

// server/routes.ts
var __filename4 = fileURLToPath4(import.meta.url);
var __dirname4 = dirname3(__filename4);
var getCurrentUser = (req) => {
  try {
    const userInfoHeader = req.headers["user-info"];
    if (userInfoHeader && typeof userInfoHeader === "string") {
      try {
        const userData = JSON.parse(userInfoHeader);
        if (userData && typeof userData === "object" && "id" in userData && "username" in userData && "role" in userData) {
          if (!["Administrator", "Manager", "Cashier", "Stocker", "system"].includes(userData.role)) {
            console.warn(`Invalid role detected: ${userData.role}, defaulting to Cashier`);
            userData.role = "Cashier";
          }
          return userData;
        }
      } catch (parseError) {
        console.error("Error parsing user info from header:", parseError);
      }
    }
    return { id: 0, username: "system", role: "system" };
  } catch (error) {
    console.error("Error processing user information:", error);
    return { id: 0, username: "system", role: "system" };
  }
};
var isAdmin = (req, res, next) => {
  const currentUser = getCurrentUser(req);
  if (!currentUser || typeof currentUser.id !== "number" || currentUser.id === 0) {
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to access this resource"
    });
  }
  if (currentUser.role !== "Administrator") {
    console.warn(`Unauthorized admin access attempt by ${currentUser.username} (ID: ${currentUser.id}, Role: ${currentUser.role})`);
    return res.status(403).json({
      error: "Access denied",
      message: "Administrator permissions required for this operation"
    });
  }
  next();
};
async function registerRoutes(app2) {
  app2.use("/uploads", (req, res, next) => {
    if (req.path.includes("..")) {
      return res.status(403).send("Forbidden");
    }
    next();
  }, express.static(path5.join(__dirname4, "uploads")));
  app2.get("/api/stats", async (req, res) => {
    try {
      const stats = await fileStorage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });
  app2.get("/api/inventory", async (req, res) => {
    try {
      const items = await fileStorage.getInventory();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Failed to fetch inventory items" });
    }
  });
  app2.get("/api/inventory/popular", async (req, res) => {
    try {
      const items = await fileStorage.getInventoryByPopularity();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory by popularity:", error);
      res.status(500).json({ error: "Failed to fetch inventory by popularity" });
    }
  });
  app2.get("/api/inventory/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await fileStorage.getInventoryItem(id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ error: "Failed to fetch inventory item" });
    }
  });
  app2.get("/api/product-lookup/:barcode", async (req, res) => {
    try {
      const barcode = req.params.barcode;
      const productInfo = await lookupProductByBarcode(barcode);
      res.json(productInfo);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to lookup product information"
      });
    }
  });
  app2.post("/api/inventory", async (req, res) => {
    try {
      const requiredFields = ["name", "sku", "category", "stock", "unit", "price", "priceUnit", "threshold"];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({ error: `Missing required field: ${field}` });
        }
      }
      const newItem = await fileStorage.addInventoryItem(req.body);
      const currentUser = getCurrentUser(req);
      if (currentUser) {
        await ActivityLogger.logInventoryActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.INVENTORY.CREATE,
          `Added item: ${newItem.name} (SKU: ${newItem.sku}), Quantity: ${newItem.stock} ${newItem.unit}`
        );
      }
      res.status(201).json(newItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to add inventory item" });
    }
  });
  app2.put("/api/inventory/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const originalItem = await fileStorage.getInventoryItem(id);
      if (!originalItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      const currentUser = getCurrentUser(req);
      console.log("Inventory update attempted by:", currentUser);
      const hasProfitUpdates = req.body.costPrice !== void 0 || req.body.profitMargin !== void 0 || req.body.profitType !== void 0;
      if (hasProfitUpdates && !["Administrator", "Manager"].includes(currentUser.role)) {
        await ActivityLogger.logInventoryActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.INVENTORY.UPDATE,
          `Unauthorized profit update attempt for item ID: ${id}`
        );
        return res.status(403).json({ error: "Access denied: You don't have permission to update profit settings" });
      }
      const hasPriceUpdate = req.body.price !== void 0;
      if (hasPriceUpdate && currentUser.role === "Stocker") {
        await ActivityLogger.logInventoryActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.INVENTORY.UPDATE,
          `Unauthorized price update attempt for item ID: ${id}`
        );
        return res.status(403).json({ error: "Access denied: Stocker accounts cannot modify prices" });
      }
      const updatedItem = await fileStorage.updateInventoryItem(id, req.body);
      if (!updatedItem) {
        return res.status(404).json({ error: "Failed to update item" });
      }
      let details = `Updated item: ${originalItem.name} (ID: ${originalItem.id})`;
      if (req.body.stock !== void 0 && originalItem.stock !== req.body.stock) {
        details += `, Stock changed from ${originalItem.stock} to ${req.body.stock}`;
      }
      if (req.body.price !== void 0 && originalItem.price !== req.body.price) {
        details += `, Price changed from ${originalItem.price} to ${req.body.price}`;
      }
      if (req.body.threshold !== void 0 && originalItem.threshold !== req.body.threshold) {
        details += `, Threshold changed from ${originalItem.threshold} to ${req.body.threshold}`;
      }
      if (req.body.costPrice !== void 0) {
        const oldCost = originalItem.costPrice || "not set";
        details += `, Cost price changed from ${oldCost} to ${req.body.costPrice}`;
      }
      if (req.body.profitMargin !== void 0) {
        const oldMargin = originalItem.profitMargin || "not set";
        details += `, Profit margin changed from ${oldMargin} to ${req.body.profitMargin}`;
      }
      if (req.body.profitType !== void 0 && originalItem.profitType !== req.body.profitType) {
        details += `, Profit type changed from ${originalItem.profitType || "not set"} to ${req.body.profitType}`;
      }
      await ActivityLogger.logInventoryActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.INVENTORY.UPDATE,
        details
      );
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ error: "Failed to update inventory item" });
    }
  });
  app2.delete("/api/inventory/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = getCurrentUser(req);
      if (currentUser.role === "Stocker") {
        await ActivityLogger.logInventoryActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.INVENTORY.DELETE,
          `Unauthorized deletion attempt for item ID: ${id}`
        );
        return res.status(403).json({ error: "Access denied: You don't have permission to delete inventory items" });
      }
      const item = await fileStorage.getInventoryItem(id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      const success = await fileStorage.deleteInventoryItem(id);
      if (!success) {
        return res.status(404).json({ error: "Failed to delete item" });
      }
      console.log("Inventory delete performed by:", currentUser);
      const details = `Deleted item: ${item.name} (ID: ${item.id}, SKU: ${item.sku}, Stock: ${item.stock})`;
      await ActivityLogger.logInventoryActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.INVENTORY.DELETE,
        details
      );
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ error: "Failed to delete inventory item" });
    }
  });
  app2.post("/api/inventory/csv-upload", csvUpload.single("file"), async (req, res) => {
    try {
      console.log("CSV upload request received");
      if (!req.file) {
        console.log("No CSV file received in request");
        return res.status(400).json({ error: "No file uploaded" });
      }
      console.log("CSV file received:", {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      });
      const csvItems = await processCsvFile(req.file.path);
      const normalizedItems = csvItems.map((item, index) => {
        const normalizedItem = {};
        Object.keys(item).forEach((key) => {
          const lowercaseKey = key.toLowerCase().trim();
          if (item[key] !== void 0 && item[key] !== null && item[key] !== "") {
            normalizedItem[lowercaseKey] = item[key];
          }
        });
        if (!normalizedItem.priceunit && (normalizedItem["price unit"] || normalizedItem.price_unit || normalizedItem["unit price"])) {
          normalizedItem.priceunit = normalizedItem["price unit"] || normalizedItem.price_unit || normalizedItem["unit price"];
        }
        console.log(`Item ${index + 1} normalized fields:`, Object.keys(normalizedItem));
        return normalizedItem;
      });
      console.log(`Successfully processed ${normalizedItems.length} items from CSV`);
      res.json({
        success: true,
        items: normalizedItems,
        message: `Successfully parsed ${normalizedItems.length} items from CSV`
      });
    } catch (error) {
      console.error("Error processing CSV file:", error);
      res.status(500).json({
        error: "Failed to process CSV file",
        message: error.message
      });
    }
  });
  app2.post("/api/inventory/image-upload", inventoryImageUpload.single("image"), async (req, res) => {
    try {
      console.log("Inventory image upload request received");
      if (!req.file) {
        console.log("No file received in request");
        return res.status(400).json({ error: "No image uploaded" });
      }
      console.log("File received:", {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      });
      const imageUrl = `/uploads/inventory/${req.file.filename}`;
      console.log("Generated image URL:", imageUrl);
      res.json({
        success: true,
        imageUrl,
        message: "Image uploaded successfully"
      });
    } catch (error) {
      console.error("Error uploading inventory image:", error);
      res.status(500).json({
        error: "Failed to upload image",
        message: error.message
      });
    }
  });
  app2.post("/api/settings/logo-upload", logoImageUpload.single("logo"), async (req, res) => {
    try {
      console.log("Store logo upload request received");
      if (!req.file) {
        console.log("No logo file received in request");
        return res.status(400).json({ error: "No logo image uploaded" });
      }
      console.log("Logo file received:", {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      });
      const logoUrl = `/uploads/logos/${req.file.filename}`;
      console.log("Generated logo URL:", logoUrl);
      const storeSettings = await fileStorage.getStoreSettings();
      console.log("Current store settings:", storeSettings);
      await fileStorage.updateStoreSettings({
        ...storeSettings,
        storeLogo: logoUrl
      });
      console.log("Updated store settings with new logo");
      const currentUser = getCurrentUser(req);
      await ActivityLogger.logSettingsActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.SETTINGS.UPDATE,
        "Updated store logo"
      );
      res.json({
        success: true,
        logoUrl,
        message: "Store logo updated successfully"
      });
    } catch (error) {
      console.error("Error uploading store logo:", error);
      res.status(500).json({
        error: "Failed to upload store logo",
        message: error.message
      });
    }
  });
  app2.post("/api/inventory/bulk", async (req, res) => {
    try {
      console.log("Bulk inventory import request received");
      const { items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        console.log("Invalid or empty items array received:", items);
        return res.status(400).json({ error: "Invalid or empty items array" });
      }
      console.log(`Processing ${items.length} items for bulk import`);
      const results = {
        updated: 0,
        created: 0,
        failed: 0,
        errors: []
      };
      const inventoryItems = await fileStorage.getInventory();
      for (const item of items) {
        try {
          const normalizedItem = {};
          Object.keys(item).forEach((key) => {
            if (item[key] !== void 0 && item[key] !== null && item[key] !== "") {
              normalizedItem[key.toLowerCase()] = item[key];
            }
          });
          console.log(`Processing item with SKU: ${normalizedItem.sku || "unknown"}`);
          console.log("Item fields:", Object.keys(normalizedItem));
          const requiredFields = ["sku", "name", "category", "stock", "unit", "price", "priceunit", "threshold"];
          const missingFields = requiredFields.filter(
            (field) => normalizedItem[field] === void 0 || normalizedItem[field] === null || normalizedItem[field] === ""
          );
          if (missingFields.length > 0) {
            console.log(`Missing fields for item with SKU ${normalizedItem.sku || "unknown"}:`, missingFields);
            results.failed++;
            results.errors.push(`Item with SKU ${normalizedItem.sku || "unknown"}: Missing required fields: ${missingFields.join(", ")}`);
            continue;
          }
          const cleanedItem = {
            sku: normalizedItem.sku,
            name: normalizedItem.name,
            category: normalizedItem.category,
            stock: parseFloat(normalizedItem.stock),
            unit: normalizedItem.unit,
            price: parseFloat(normalizedItem.price),
            priceUnit: normalizedItem.priceunit,
            // Map to correct field name
            threshold: parseFloat(normalizedItem.threshold),
            barcode: normalizedItem.barcode || ""
          };
          const existingItem = inventoryItems.find((i) => i.sku === cleanedItem.sku);
          if (existingItem) {
            console.log(`Updating existing item with SKU: ${cleanedItem.sku}`);
            const updatedItem = await fileStorage.updateInventoryItem(existingItem.id, {
              ...cleanedItem,
              status: cleanedItem.stock < cleanedItem.threshold ? "Low Stock" : "In Stock"
            });
            if (updatedItem) {
              results.updated++;
            } else {
              results.failed++;
              results.errors.push(`Failed to update item with SKU: ${cleanedItem.sku}`);
            }
          } else {
            console.log(`Creating new item with SKU: ${cleanedItem.sku}`);
            const newItem = await fileStorage.addInventoryItem({
              ...cleanedItem,
              status: cleanedItem.stock < cleanedItem.threshold ? "Low Stock" : "In Stock"
            });
            if (newItem) {
              results.created++;
            } else {
              results.failed++;
              results.errors.push(`Failed to create item with SKU: ${cleanedItem.sku}`);
            }
          }
        } catch (error) {
          console.error(`Error processing item:`, error);
          results.failed++;
          results.errors.push(`Error processing item with SKU ${item.sku || "unknown"}: ${error.message || "Unknown error"}`);
        }
      }
      const currentUser = getCurrentUser(req);
      const details = `Bulk import: ${results.created} created, ${results.updated} updated, ${results.failed} failed`;
      await ActivityLogger.logInventoryActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.INVENTORY.BULK_IMPORT,
        details
      );
      res.json(results);
    } catch (error) {
      console.error("Error in bulk inventory import:", error);
      res.status(500).json({ error: "Failed to process bulk inventory import" });
    }
  });
  app2.get("/api/sales", async (req, res) => {
    try {
      const sales = await fileStorage.getSales();
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ error: "Failed to fetch sales data" });
    }
  });
  app2.get("/api/sales/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const sale = await fileStorage.getSale(id);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }
      res.json(sale);
    } catch (error) {
      console.error("Error fetching sale:", error);
      res.status(500).json({ error: "Failed to fetch sale data" });
    }
  });
  app2.post("/api/sales/:id/refund", async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = getCurrentUser(req);
      const refundedSale = await fileStorage.refundSale(id, currentUser.username);
      if (!refundedSale) {
        return res.status(404).json({ error: "Sale not found or already refunded" });
      }
      const details = `Refunded transaction: ID ${id}, Total: $${refundedSale.amount.toFixed(2)}, Items returned to inventory`;
      await ActivityLogger.logSalesActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.SALES.REFUND,
        details
      );
      res.json(refundedSale);
    } catch (error) {
      console.error("Error refunding sale:", error);
      res.status(500).json({ error: "Failed to process refund" });
    }
  });
  app2.post("/api/sales", async (req, res) => {
    try {
      if (!req.body.cashier || !req.body.amount || !req.body.items || !Array.isArray(req.body.items)) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const newSale = await fileStorage.addSale(req.body);
      const stats = await fileStorage.getStats();
      await fileStorage.updateStats({
        todaySales: stats.todaySales + req.body.amount
      });
      for (const item of req.body.items) {
        const inventoryItem = await fileStorage.getInventoryItem(item.productId);
        if (inventoryItem) {
          const newStock = Math.max(0, inventoryItem.stock - item.quantity);
          await fileStorage.updateInventoryItem(item.productId, {
            stock: newStock
          });
          if (inventoryItem.stock > inventoryItem.threshold && newStock <= inventoryItem.threshold) {
            await fileStorage.updateStats({
              lowStockItems: stats.lowStockItems + 1
            });
          }
        }
      }
      const userInfoHeader = req.headers["user-info"];
      let currentUser = { id: 0, username: "unknown" };
      if (userInfoHeader) {
        try {
          currentUser = JSON.parse(userInfoHeader);
        } catch (e) {
          console.error("Error parsing user info:", e);
        }
      }
      let itemsList = "";
      let totalItems = 0;
      newSale.items.forEach((item) => {
        totalItems += item.quantity;
      });
      const details = `Sale completed: ID ${newSale.id}, Total: $${newSale.amount.toFixed(2)}, Items: ${totalItems}`;
      await ActivityLogger.logSalesActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.SALES.CREATE,
        details
      );
      res.status(201).json(newSale);
    } catch (error) {
      console.error("Error adding sale:", error);
      res.status(500).json({ error: "Failed to add sale" });
    }
  });
  app2.get("/api/users", async (req, res) => {
    try {
      const users = await fileStorage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app2.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await fileStorage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  app2.post("/api/users", async (req, res) => {
    try {
      const newUser = await fileStorage.createUser(req.body);
      const currentUser = getCurrentUser(req);
      console.log("User creation performed by:", currentUser);
      const details = `Created new user: ${newUser.username} (ID: ${newUser.id}, Role: ${newUser.role})`;
      await ActivityLogger.logUserActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.USER.CREATE,
        details
      );
      const { pin, ...userWithoutPin } = newUser;
      res.status(201).json(userWithoutPin);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  app2.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await fileStorage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const updates = { ...req.body };
      if (updates.pin === "") {
        delete updates.pin;
      }
      const updatedUser = await fileStorage.updateUser(id, updates);
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update user" });
      }
      const currentUser = getCurrentUser(req);
      console.log("User update performed by:", currentUser);
      let details = `Updated user: ${user.username} (ID: ${user.id})`;
      if (updates.pin !== void 0) {
        details += ", PIN was changed";
      }
      if (updates.role !== void 0 && user.role !== updates.role) {
        details += `, Role changed from ${user.role} to ${updates.role}`;
      }
      if (updates.status !== void 0 && user.status !== updates.status) {
        details += `, Status changed from ${user.status} to ${updates.status}`;
      }
      await ActivityLogger.logUserActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.USER.UPDATE,
        details
      );
      const { pin, ...userWithoutPin } = updatedUser;
      res.json(userWithoutPin);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app2.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await fileStorage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const success = await fileStorage.deleteUser(id);
      if (success) {
        const userInfoHeader = req.headers["user-info"];
        let currentUser = { id: 0, username: "unknown" };
        if (userInfoHeader) {
          try {
            currentUser = JSON.parse(userInfoHeader);
          } catch (e) {
            console.error("Error parsing user info:", e);
          }
        }
        const details = `Deleted user: ${user.username} (ID: ${user.id}, Role: ${user.role})`;
        await ActivityLogger.logUserActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.USER.DELETE,
          details
        );
        res.status(200).json({ message: "User deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete user" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app2.get("/api/losses", async (req, res) => {
    try {
      const losses = await fileStorage.getLosses();
      res.json(losses);
    } catch (error) {
      console.error("Error fetching losses:", error);
      res.status(500).json({ error: "Failed to fetch losses" });
    }
  });
  app2.get("/api/losses/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const loss = await fileStorage.getLoss(id);
      if (!loss) {
        return res.status(404).json({ error: "Loss record not found" });
      }
      res.json(loss);
    } catch (error) {
      console.error("Error fetching loss:", error);
      res.status(500).json({ error: "Failed to fetch loss record" });
    }
  });
  app2.post("/api/losses", async (req, res) => {
    try {
      const requiredFields = ["inventoryItemId", "itemName", "quantity", "reason", "recordedBy", "value"];
      for (const field of requiredFields) {
        if (req.body[field] === void 0) {
          return res.status(400).json({ error: `Missing required field: ${field}` });
        }
      }
      const currentUser = getCurrentUser(req);
      const detailsMessage = `Recorded loss of ${req.body.quantity} ${req.body.itemName} | Reason: "${req.body.reason}" | Value: $${req.body.value.toFixed(2)}`;
      await ActivityLogger.logLossActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.LOSSES.CREATE,
        detailsMessage
      );
      const newLoss = await fileStorage.addLoss(req.body);
      const inventoryItem = await fileStorage.getInventoryItem(req.body.inventoryItemId);
      if (inventoryItem) {
        const newStock = Math.max(0, inventoryItem.stock - req.body.quantity);
        await fileStorage.updateInventoryItem(req.body.inventoryItemId, {
          stock: newStock
        });
        if (inventoryItem.stock > inventoryItem.threshold && newStock <= inventoryItem.threshold) {
          const stats = await fileStorage.getStats();
          await fileStorage.updateStats({
            lowStockItems: stats.lowStockItems + 1
          });
        }
      }
      res.status(201).json(newLoss);
    } catch (error) {
      console.error("Error adding loss:", error);
      res.status(500).json({ error: error.message || "Failed to record loss" });
    }
  });
  app2.put("/api/losses/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const updates = req.body;
      if (!id) {
        return res.status(400).json({ error: "Loss ID is required" });
      }
      const currentUser = getCurrentUser(req);
      const originalLoss = await fileStorage.getLoss(id);
      let detailsMessage = `Updated loss record with ID: ${id}`;
      if (originalLoss) {
        if (updates.quantity !== void 0 && updates.quantity !== originalLoss.quantity) {
          detailsMessage += ` | Changed quantity from ${originalLoss.quantity} to ${updates.quantity}`;
        }
        if (updates.reason !== void 0 && updates.reason !== originalLoss.reason) {
          detailsMessage += ` | Updated reason: "${updates.reason}"`;
        }
        if (updates.itemName) {
          detailsMessage += ` | Item: ${originalLoss.itemName}`;
        }
      }
      await ActivityLogger.logLossActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.LOSSES.UPDATE,
        detailsMessage
      );
      const updatedLoss = await fileStorage.updateLoss(id, updates);
      if (!updatedLoss) {
        return res.status(404).json({ error: `Loss record with ID ${id} not found` });
      }
      res.status(200).json(updatedLoss);
    } catch (error) {
      console.error("Error updating loss record:", error);
      res.status(500).json({ error: error.message || "Failed to update loss record" });
    }
  });
  app2.get("/api/alerts/low-stock", async (req, res) => {
    try {
      const items = await fileStorage.getInventory();
      const lowStockItems = items.filter((item) => {
        if (typeof item.stock === "number" && typeof item.threshold === "number") {
          return item.stock < item.threshold;
        }
        return false;
      });
      res.json(lowStockItems);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ error: "Failed to fetch low stock items" });
    }
  });
  app2.get("/api/settings", async (req, res) => {
    try {
      const settings = await fileStorage.getStoreSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching store settings:", error);
      res.status(500).json({ error: "Failed to fetch store settings" });
    }
  });
  app2.get("/api/settings/favicon", async (req, res) => {
    try {
      const settings = await fileStorage.getStoreSettings();
      if (settings.storeLogo) {
        const base64Data = settings.storeLogo.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        res.set("Content-Type", "image/png");
        res.send(buffer);
      } else {
        res.sendFile(path5.join(__dirname4, "..", "client", "public", "favicon.ico"));
      }
    } catch (error) {
      console.error("Error serving favicon:", error);
      res.status(500).send("Error generating favicon");
    }
  });
  app2.put("/api/settings", async (req, res) => {
    try {
      const { storeName, storeAddress, storePhone, thankYouMessage } = req.body;
      if (!storeName || !storeAddress || !storePhone || !thankYouMessage) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const updatedSettings = await fileStorage.updateStoreSettings(req.body);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating store settings:", error);
      res.status(500).json({ error: "Failed to update store settings" });
    }
  });
  app2.get("/api/logs", isAdmin, async (req, res) => {
    try {
      const category = req.query.category;
      const userId = req.query.userId ? parseInt(req.query.userId) : void 0;
      let logs;
      if (category) {
        logs = await logStorage.getLogsByCategory(category);
      } else if (userId) {
        logs = await logStorage.getLogsByUser(userId);
      } else {
        logs = await logStorage.getLogs();
      }
      logs = logs.filter((log2) => {
        if (log2.username === "system" && log2.details && log2.details.includes("System startup")) {
          return false;
        }
        if (log2.category === "authentication" || log2.category === "system") {
          return false;
        }
        return true;
      });
      res.json(logs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Failed to fetch logs",
        details: errorMessage
      });
    }
  });
  app2.get("/api/logs/categories", isAdmin, async (req, res) => {
    try {
      const filteredCategories = Object.values(LOG_CATEGORIES).filter(
        (category) => category !== "authentication" && category !== "system"
      );
      res.json(filteredCategories);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Failed to fetch log categories",
        details: errorMessage
      });
    }
  });
  app2.get("/api/logs/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid log ID format" });
      }
      const log2 = await logStorage.getLogById(id);
      if (!log2) {
        return res.status(404).json({ error: "Log not found" });
      }
      res.json(log2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Failed to fetch log",
        details: errorMessage,
        logId: req.params.id
      });
    }
  });
  app2.post("/api/login", async (req, res) => {
    try {
      const { username, pin } = req.body;
      if (!username || !pin) {
        await ActivityLogger.logAuthActivity(
          0,
          username || "unknown",
          LOG_ACTIONS.AUTHENTICATION.FAILED_LOGIN,
          "Failed login attempt: Missing credentials"
        );
        return res.status(400).json({ error: "Username and PIN are required" });
      }
      const user = await fileStorage.getUserByUsername(username);
      if (!user || user.pin !== pin) {
        await ActivityLogger.logAuthActivity(
          0,
          username,
          LOG_ACTIONS.AUTHENTICATION.FAILED_LOGIN,
          "Failed login attempt: Invalid credentials"
        );
        return res.status(401).json({ error: "Invalid username or PIN" });
      }
      if (user.status === "Inactive") {
        await ActivityLogger.logAuthActivity(
          user.id,
          username,
          LOG_ACTIONS.AUTHENTICATION.FAILED_LOGIN,
          "Failed login attempt: Inactive account"
        );
        return res.status(403).json({ error: "Your account is inactive. Please contact an administrator." });
      }
      const now = /* @__PURE__ */ new Date();
      const sessionValidUntil = new Date(now);
      sessionValidUntil.setHours(sessionValidUntil.getHours() + 2);
      await fileStorage.updateUser(user.id, {
        lastActive: now.toISOString(),
        sessionValidUntil: sessionValidUntil.toISOString()
      });
      await ActivityLogger.logAuthActivity(
        user.id,
        username,
        LOG_ACTIONS.AUTHENTICATION.LOGIN,
        "User logged in successfully"
      );
      const { pin: _, ...userWithoutPin } = user;
      res.json({
        success: true,
        user: {
          ...userWithoutPin,
          sessionValidUntil: sessionValidUntil.toISOString()
        }
      });
    } catch (error) {
      console.error("Error during login:", error);
      await ActivityLogger.logSystemActivity(
        LOG_ACTIONS.SYSTEM.ERROR,
        `Error during login: ${error}`
      );
      res.status(500).json({ error: "Login failed" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs5 from "fs";
import path7 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// client/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path6 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path6.resolve(import.meta.dirname, "src"),
      "@shared": path6.resolve(import.meta.dirname, "..", "shared"),
      "@assets": path6.resolve(import.meta.dirname, "..", "attached_assets")
    }
  },
  root: path6.resolve(import.meta.dirname),
  build: {
    outDir: path6.resolve(import.meta.dirname, "..", "dist/public"),
    emptyOutDir: true,
    // Production optimizations
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-toast"],
          router: ["wouter"],
          utils: ["clsx", "tailwind-merge", "date-fns"]
        },
        // Optimize chunk naming for caching
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      }
    },
    // Increase chunk size warning limit for large vendor chunks
    chunkSizeWarningLimit: 1e3
  },
  // Production environment configuration
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development")
  },
  // Development server configuration
  server: {
    port: 5173,
    host: true,
    strictPort: false
  },
  // Preview server configuration (for production testing)
  preview: {
    port: 4173,
    host: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path7.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs5.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path7.resolve(import.meta.dirname, "public");
  if (!fs5.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path7.resolve(distPath, "index.html"));
  });
}

// server/init.ts
import fs6 from "fs";
import path8 from "path";
async function initializeAppStorage() {
  const dataDir = path8.join(process.cwd(), "server", "data");
  if (!fs6.existsSync(dataDir)) {
    fs6.mkdirSync(dataDir, { recursive: true });
  }
  const requiredFiles = {
    "users.json": { users: [
      {
        id: 1,
        username: "admin",
        pin: "1234",
        name: "Admin User",
        role: "Administrator",
        lastActive: (/* @__PURE__ */ new Date()).toISOString(),
        status: "Active"
      }
    ] },
    "inventory.json": { items: [] },
    "sales.json": { sales: [] },
    "losses.json": { losses: [] },
    "stats.json": {
      totalInventoryItems: 0,
      todaySales: 0,
      lowStockItems: 0,
      activeUsers: 1,
      totalInventoryValue: 0
    },
    "settings.json": {
      storeName: "Inventory Pro",
      storeAddress: "123 Main Street",
      storePhone: "(555) 123-4567",
      thankYouMessage: "Thank you for shopping with us!",
      nextTransactionId: 1
    },
    "popularity.json": { products: [] },
    "activity_logs.json": { logs: [] }
  };
  for (const [fileName, defaultContent] of Object.entries(requiredFiles)) {
    const filePath = path8.join(dataDir, fileName);
    if (!fs6.existsSync(filePath)) {
      fs6.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
    }
  }
  return dataDir;
}

// server/index.ts
import helmet from "helmet";
var app = express3();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      // Required for development
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      // Allow data URLs for base64 encoded images and blob
      fontSrc: ["'self'", "data:"],
      // Allow data URLs for base64 encoded fonts
      connectSrc: ["'self'", "blob:"]
      // Allow blob for file uploads
    }
  },
  // Production security: hide X-Powered-By header
  hidePoweredBy: true
}));
app.use(express3.json({ limit: "10mb" }));
app.use(express3.urlencoded({ extended: true, limit: "10mb" }));
app.use((req, res, next) => {
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico)$/)) {
    return next();
  }
  const start = Date.now();
  const path9 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path9.startsWith("/api")) {
      let logLine = `${req.method} ${path9} ${res.statusCode} in ${duration}ms`;
      if (config.nodeEnv !== "production" && capturedJsonResponse) {
        const safeResponse = { ...capturedJsonResponse };
        if (safeResponse.password) safeResponse.password = "[REDACTED]";
        if (safeResponse.token) safeResponse.token = "[REDACTED]";
        logLine += ` :: ${JSON.stringify(safeResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    await initializeAppStorage();
    const server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = config.nodeEnv === "production" ? "Internal Server Error" : err.message || "Internal Server Error";
      log(`Error: ${err.message || "Unknown error"}`, "error");
      res.status(status).json({
        message,
        // Only include error details in development
        ...config.nodeEnv !== "production" && { details: err.stack }
      });
    });
    if (config.nodeEnv === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    const port = config.port;
    const host = config.nodeEnv === "production" ? "localhost" : "0.0.0.0";
    server.listen(port, host, () => {
      log(`Server started and listening on ${host}:${port}`);
    });
    const shutdown = () => {
      log("Shutting down server gracefully...", "server");
      server.close(() => {
        log("Server shutdown complete", "server");
        process.exit(0);
      });
      setTimeout(() => {
        log("Server shutdown timed out, forcing exit", "server");
        process.exit(1);
      }, 1e4);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
