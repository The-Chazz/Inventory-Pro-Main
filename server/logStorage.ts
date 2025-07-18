import { usingFileStorageOnly } from "./db";
import { type InsertLog, type ActivityLog } from "@shared/schema";
import fs from "fs";
import path from "path";

export interface ILogStorage {
  createLog(log: InsertLog): Promise<ActivityLog>;
  getLogs(): Promise<ActivityLog[]>;
  getLogsByCategory(category: string): Promise<ActivityLog[]>;
  getLogsByUser(userId: number): Promise<ActivityLog[]>;
  getLogById(id: number): Promise<ActivityLog | undefined>;
}

export class FileLogStorage implements ILogStorage {
  private logsCache: Map<number, ActivityLog> = new Map();
  private nextId: number = 1;
  
  constructor() {
    // Load cached logs from file if available
    this.loadLogsFromFile();
  }
  
  private async loadLogsFromFile() {
    try {
      const logsDir = path.join(process.cwd(), 'server', 'data');
      const logsFile = path.join(logsDir, 'activity_logs.json');
      
      // Create logs file if it doesn't exist
      if (!fs.existsSync(logsFile)) {
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        fs.writeFileSync(logsFile, JSON.stringify({ logs: [] }));
        return;
      }
      
      // Load logs from file
      const data = JSON.parse(fs.readFileSync(logsFile, 'utf-8'));
      if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach((log: ActivityLog) => {
          this.logsCache.set(log.id, {
            ...log,
            timestamp: new Date(log.timestamp)
          });
          
          // Update nextId
          if (log.id >= this.nextId) {
            this.nextId = log.id + 1;
          }
        });
      }
    } catch (error) {
      // Initialize with empty cache on failure - system will create new logs file as needed
      this.logsCache.clear();
      this.nextId = 1;
    }
  }
  
  private async saveLogsToFile() {
    try {
      const logsDir = path.join(process.cwd(), 'server', 'data');
      const logsFile = path.join(logsDir, 'activity_logs.json');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      // Save logs to file
      const logs = Array.from(this.logsCache.values());
      fs.writeFileSync(logsFile, JSON.stringify({ logs }, null, 2));
    } catch (error) {
      console.error("Error saving logs to file:", error);
    }
  }

  async createLog(log: InsertLog): Promise<ActivityLog> {
    console.log("Creating log in file storage:", log);
    const newLog: ActivityLog = {
      id: this.nextId++,
      userId: log.userId,
      username: log.username,
      action: log.action,
      category: log.category,
      details: log.details || "",
      timestamp: new Date()
    };
    
    // Add to cache
    this.logsCache.set(newLog.id, newLog);
    
    // Save to file
    await this.saveLogsToFile();
    
    return newLog;
  }

  async getLogs(): Promise<ActivityLog[]> {
    // Return logs sorted by timestamp (newest first)
    return Array.from(this.logsCache.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getLogsByCategory(category: string): Promise<ActivityLog[]> {
    // Return logs filtered by category
    return Array.from(this.logsCache.values())
      .filter(log => log.category === category)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getLogsByUser(userId: number): Promise<ActivityLog[]> {
    // Return logs filtered by user ID
    return Array.from(this.logsCache.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getLogById(id: number): Promise<ActivityLog | undefined> {
    // Return log by ID
    return this.logsCache.get(id);
  }
}

export const logStorage = new FileLogStorage();