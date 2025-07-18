import { logStorage } from "./logStorage";
import type { InsertLog } from "@shared/schema";

// Categories
export const LOG_CATEGORIES = {
  USER: "user",
  INVENTORY: "inventory", 
  SALES: "sales",
  LOSSES: "losses",
  SETTINGS: "settings",
  AUTHENTICATION: "authentication",
  SYSTEM: "system",
};

// Log actions for each category
export const LOG_ACTIONS = {
  USER: {
    CREATE: "User Created",
    UPDATE: "User Updated",
    DELETE: "User Deleted",
    STATUS_CHANGE: "User Status Changed",
  },
  INVENTORY: {
    CREATE: "Inventory Item Created",
    UPDATE: "Inventory Item Updated",
    DELETE: "Inventory Item Deleted",
    BULK_IMPORT: "Bulk Inventory Import",
  },
  SALES: {
    CREATE: "Sale Recorded",
    REPRINT: "Receipt Reprinted",
    REFUND: "Sale Refunded",
  },
  LOSSES: {
    CREATE: "Loss Recorded",
    UPDATE: "Loss Updated",
  },
  SETTINGS: {
    UPDATE: "Settings Updated",
  },
  AUTHENTICATION: {
    LOGIN: "User Login",
    LOGOUT: "User Logout",
    FAILED_LOGIN: "Failed Login Attempt",
  },
  SYSTEM: {
    ERROR: "System Error",
    STARTUP: "System Startup",
  },
};

export class ActivityLogger {
  // Log any activity
  static async log(
    userId: number,
    username: string,
    category: string,
    action: string,
    details?: string
  ): Promise<void> {
    try {
      const logEntry: InsertLog = {
        userId,
        username,
        category,
        action,
        details: details || "",
      };

      await logStorage.createLog(logEntry);
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  }

  // Helper methods for common log types
  static async logUserActivity(
    userId: number,
    username: string,
    action: string,
    details?: string
  ): Promise<void> {
    return this.log(userId, username, LOG_CATEGORIES.USER, action, details);
  }

  static async logInventoryActivity(
    userId: number,
    username: string,
    action: string,
    details?: string
  ): Promise<void> {
    return this.log(userId, username, LOG_CATEGORIES.INVENTORY, action, details);
  }

  static async logSalesActivity(
    userId: number,
    username: string,
    action: string,
    details?: string
  ): Promise<void> {
    return this.log(userId, username, LOG_CATEGORIES.SALES, action, details);
  }

  static async logLossActivity(
    userId: number,
    username: string,
    action: string,
    details?: string
  ): Promise<void> {
    return this.log(userId, username, LOG_CATEGORIES.LOSSES, action, details);
  }

  static async logSettingsActivity(
    userId: number,
    username: string,
    action: string,
    details?: string
  ): Promise<void> {
    return this.log(userId, username, LOG_CATEGORIES.SETTINGS, action, details);
  }

  static async logAuthActivity(
    userId: number,
    username: string,
    action: string,
    details?: string
  ): Promise<void> {
    return this.log(userId, username, LOG_CATEGORIES.AUTHENTICATION, action, details);
  }

  static async logSystemActivity(
    action: string,
    details?: string
  ): Promise<void> {
    // System logs use userId 0 and username 'SYSTEM'
    return this.log(0, "SYSTEM", LOG_CATEGORIES.SYSTEM, action, details);
  }
}