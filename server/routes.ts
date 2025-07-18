import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { fileStorage } from "./fileStorage";
import { logStorage } from "./logStorage";
import { ActivityLogger, LOG_ACTIONS, LOG_CATEGORIES } from "./logger";
import { lookupProductByBarcode } from "./productLookup";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { 
  inventoryImageUpload, 
  logoImageUpload, 
  csvUpload, 
  processCsvFile, 
  saveBase64Image, 
  getImageUrl, 
  deleteImage 
} from "./fileUpload";

// Get the directory name properly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper function to get current user information from request
 * 
 * Extracts and validates user information from the request headers or body.
 * Ensures user identity is properly structured and verified.
 * Returns a default system user if no valid user information is found.
 * 
 * @param req - Express request object
 * @returns User object with id, username, and role
 */
const getCurrentUser = (req: Request) => {
  try {
    // Primary source: user-info header
    const userInfoHeader = req.headers['user-info'];
    if (userInfoHeader && typeof userInfoHeader === 'string') {
      try {
        const userData = JSON.parse(userInfoHeader);
        
        // Validate the user data structure
        if (userData && 
            typeof userData === 'object' && 
            'id' in userData && 
            'username' in userData && 
            'role' in userData) {
          
          // Sanitize roles to known valid values
          if (!['Administrator', 'Manager', 'Cashier', 'Stocker', 'system'].includes(userData.role)) {
            console.warn(`Invalid role detected: ${userData.role}, defaulting to Cashier`);
            userData.role = 'Cashier'; // Default to lowest privileged role
          }
          
          return userData;
        }
      } catch (parseError) {
        console.error("Error parsing user info from header:", parseError);
      }
    }
    
    // Removed legacy authentication method that used user info in request body
    // All client requests now use the more secure header-based authentication
    
    // Default system user for operational functions
    return { id: 0, username: "system", role: "system" };
  } catch (error) {
    console.error("Error processing user information:", error);
    return { id: 0, username: "system", role: "system" };
  }
};

/**
 * Middleware to check if user has Administrator role
 * 
 * Validates user authentication and authorization before allowing access to
 * sensitive routes. Returns 403 Forbidden if access requirements are not met.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 */
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const currentUser = getCurrentUser(req);
  
  // Check if user exists and has required role
  if (!currentUser || typeof currentUser.id !== 'number' || currentUser.id === 0) {
    return res.status(401).json({ 
      error: "Authentication required",
      message: "You must be logged in to access this resource"
    });
  }
  
  if (currentUser.role !== 'Administrator') {
    // Log unauthorized access attempt for security monitoring
    console.warn(`Unauthorized admin access attempt by ${currentUser.username} (ID: ${currentUser.id}, Role: ${currentUser.role})`);
    
    return res.status(403).json({ 
      error: "Access denied",
      message: "Administrator permissions required for this operation"
    });
  }
  
  next();
};

/**
 * Middleware to check if user has Administrator or Manager role
 * 
 * Validates user authentication and authorization for management-level routes.
 * Returns 403 Forbidden if access requirements are not met.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 */
const isAdminOrManager = (req: Request, res: Response, next: NextFunction) => {
  const currentUser = getCurrentUser(req);
  
  // Check if user exists and has required role
  if (!currentUser || typeof currentUser.id !== 'number' || currentUser.id === 0) {
    return res.status(401).json({ 
      error: "Authentication required",
      message: "You must be logged in to access this resource"
    });
  }
  
  if (currentUser.role !== 'Administrator' && currentUser.role !== 'Manager') {
    // Log unauthorized access attempt for security monitoring
    console.warn(`Unauthorized management access attempt by ${currentUser.username} (ID: ${currentUser.id}, Role: ${currentUser.role})`);
    
    return res.status(403).json({ 
      error: "Access denied",
      message: "Administrator or Manager permissions required for this operation"
    });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes for the Grocery Store Management System
  
  // Set up a static route to serve uploaded files
  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    // Security check to prevent directory traversal attacks
    if (req.path.includes('..')) {
      return res.status(403).send('Forbidden');
    }
    next();
  }, express.static(path.join(__dirname, 'uploads')));

  // Get dashboard stats
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const stats = await fileStorage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // Inventory Routes
  app.get("/api/inventory", async (req: Request, res: Response) => {
    try {
      const items = await fileStorage.getInventory();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Failed to fetch inventory items" });
    }
  });
  
  // Get inventory sorted by popularity
  app.get("/api/inventory/popular", async (req: Request, res: Response) => {
    try {
      const items = await fileStorage.getInventoryByPopularity();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory by popularity:", error);
      res.status(500).json({ error: "Failed to fetch inventory by popularity" });
    }
  });

  app.get("/api/inventory/:id", async (req: Request, res: Response) => {
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

  // Product lookup by barcode
  app.get("/api/product-lookup/:barcode", async (req: Request, res: Response) => {
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

  app.post("/api/inventory", async (req: Request, res: Response) => {
    try {
      // Basic validation
      const requiredFields = ['name', 'sku', 'category', 'stock', 'unit', 'price', 'priceUnit', 'threshold'];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({ error: `Missing required field: ${field}` });
        }
      }

      const newItem = await fileStorage.addInventoryItem(req.body);
      
      // Log inventory creation
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
      // Error handled
      res.status(500).json({ error: "Failed to add inventory item" });
    }
  });

  app.put("/api/inventory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const originalItem = await fileStorage.getInventoryItem(id);
      
      if (!originalItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Get information about the current user
      const currentUser = getCurrentUser(req);
      console.log("Inventory update attempted by:", currentUser);
      
      // Prevent non-admin/manager roles from updating profit-related fields
      const hasProfitUpdates = req.body.costPrice !== undefined || 
                             req.body.profitMargin !== undefined || 
                             req.body.profitType !== undefined;
                             
      if (hasProfitUpdates && !["Administrator", "Manager"].includes(currentUser.role)) {
        // Log the unauthorized attempt
        await ActivityLogger.logInventoryActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.INVENTORY.UPDATE,
          `Unauthorized profit update attempt for item ID: ${id}`
        );
        return res.status(403).json({ error: "Access denied: You don't have permission to update profit settings" });
      }
      
      // Prevent Stocker role from changing item prices
      const hasPriceUpdate = req.body.price !== undefined;
      
      if (hasPriceUpdate && currentUser.role === "Stocker") {
        // Log the unauthorized attempt
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
      
      // Log the inventory update activity
      let details = `Updated item: ${originalItem.name} (ID: ${originalItem.id})`;
      
      // Check for specific important changes
      if (req.body.stock !== undefined && originalItem.stock !== req.body.stock) {
        details += `, Stock changed from ${originalItem.stock} to ${req.body.stock}`;
      }
      if (req.body.price !== undefined && originalItem.price !== req.body.price) {
        details += `, Price changed from ${originalItem.price} to ${req.body.price}`;
      }
      if (req.body.threshold !== undefined && originalItem.threshold !== req.body.threshold) {
        details += `, Threshold changed from ${originalItem.threshold} to ${req.body.threshold}`;
      }
      // Log profit-related changes
      if (req.body.costPrice !== undefined) {
        const oldCost = originalItem.costPrice || "not set";
        details += `, Cost price changed from ${oldCost} to ${req.body.costPrice}`;
      }
      if (req.body.profitMargin !== undefined) {
        const oldMargin = originalItem.profitMargin || "not set";
        details += `, Profit margin changed from ${oldMargin} to ${req.body.profitMargin}`;
      }
      if (req.body.profitType !== undefined && originalItem.profitType !== req.body.profitType) {
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

  app.delete("/api/inventory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get information about the current user who is making the change
      const currentUser = getCurrentUser(req);
      
      // Prevent Stocker role from deleting inventory items
      if (currentUser.role === "Stocker") {
        // Log the attempt
        await ActivityLogger.logInventoryActivity(
          currentUser.id,
          currentUser.username,
          LOG_ACTIONS.INVENTORY.DELETE,
          `Unauthorized deletion attempt for item ID: ${id}`
        );
        return res.status(403).json({ error: "Access denied: You don't have permission to delete inventory items" });
      }
      
      // Get the item before deleting to include in the log
      const item = await fileStorage.getInventoryItem(id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      const success = await fileStorage.deleteInventoryItem(id);
      
      if (!success) {
        return res.status(404).json({ error: "Failed to delete item" });
      }
      
      console.log("Inventory delete performed by:", currentUser);
      
      // Log the inventory deletion activity
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

  // Bulk Inventory Import
  // File upload endpoint for CSV inventory import
  app.post("/api/inventory/csv-upload", csvUpload.single('file'), async (req: Request, res: Response) => {
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
      
      // Process the CSV file
      const csvItems = await processCsvFile(req.file.path);
      
      // Validate and normalize the CSV items
      const normalizedItems = csvItems.map((item: any, index) => {
        // Create a normalized item with lowercase keys
        const normalizedItem: any = {};
        
        // Map all keys to lowercase
        Object.keys(item).forEach(key => {
          const lowercaseKey = key.toLowerCase().trim();
          if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
            normalizedItem[lowercaseKey] = item[key];
          }
        });
        
        // Ensure 'priceunit' field exists
        // Common variations like 'Price Unit', 'price_unit', etc. are handled
        if (!normalizedItem.priceunit && 
            (normalizedItem['price unit'] || normalizedItem.price_unit || normalizedItem['unit price'])) {
          normalizedItem.priceunit = normalizedItem['price unit'] || 
                                     normalizedItem.price_unit || 
                                     normalizedItem['unit price'];
        }
        
        // Debug log for item validation
        console.log(`Item ${index + 1} normalized fields:`, Object.keys(normalizedItem));
        
        return normalizedItem;
      });
      
      console.log(`Successfully processed ${normalizedItems.length} items from CSV`);
      
      // Return the parsed and normalized CSV data
      res.json({
        success: true,
        items: normalizedItems,
        message: `Successfully parsed ${normalizedItems.length} items from CSV`
      });
    } catch (error: any) {
      console.error("Error processing CSV file:", error);
      res.status(500).json({ 
        error: "Failed to process CSV file", 
        message: error.message 
      });
    }
  });
  
  // Inventory image upload endpoint
  app.post("/api/inventory/image-upload", inventoryImageUpload.single('image'), async (req: Request, res: Response) => {
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
      
      // Generate URL for the uploaded image
      const imageUrl = `/uploads/inventory/${req.file.filename}`;
      console.log("Generated image URL:", imageUrl);
      
      res.json({
        success: true,
        imageUrl,
        message: "Image uploaded successfully"
      });
    } catch (error: any) {
      console.error("Error uploading inventory image:", error);
      res.status(500).json({ 
        error: "Failed to upload image", 
        message: error.message 
      });
    }
  });
  
  // Store logo upload endpoint
  app.post("/api/settings/logo-upload", logoImageUpload.single('logo'), async (req: Request, res: Response) => {
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
      
      // Generate URL for the uploaded logo
      const logoUrl = `/uploads/logos/${req.file.filename}`;
      console.log("Generated logo URL:", logoUrl);
      
      // Update store settings with the new logo URL
      const storeSettings = await fileStorage.getStoreSettings();
      console.log("Current store settings:", storeSettings);
      
      await fileStorage.updateStoreSettings({
        ...storeSettings,
        storeLogo: logoUrl
      });
      
      console.log("Updated store settings with new logo");
      
      // Get current user for logging
      const currentUser = getCurrentUser(req);
      
      // Log the logo update
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
    } catch (error: any) {
      console.error("Error uploading store logo:", error);
      res.status(500).json({ 
        error: "Failed to upload store logo", 
        message: error.message 
      });
    }
  });

  app.post("/api/inventory/bulk", async (req: Request, res: Response) => {
    try {
      console.log("Bulk inventory import request received");
      const { items } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        console.log("Invalid or empty items array received:", items);
        return res.status(400).json({ error: "Invalid or empty items array" });
      }
      
      console.log(`Processing ${items.length} items for bulk import`);
      
      const results: {
        updated: number;
        created: number;
        failed: number;
        errors: string[];
      } = {
        updated: 0,
        created: 0,
        failed: 0,
        errors: []
      };
      
      const inventoryItems = await fileStorage.getInventory();
      
      // Process each item in the CSV
      for (const item of items) {
        try {
          // First, normalize item keys to lowercase for case-insensitive matching
          const normalizedItem: any = {};
          
          // Create a normalized version of the item with lowercase keys
          Object.keys(item).forEach(key => {
            if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
              normalizedItem[key.toLowerCase()] = item[key];
            }
          });
          
          console.log(`Processing item with SKU: ${normalizedItem.sku || 'unknown'}`);
          console.log("Item fields:", Object.keys(normalizedItem));
          
          // Check if required fields are present
          const requiredFields = ['sku', 'name', 'category', 'stock', 'unit', 'price', 'priceunit', 'threshold'];
          const missingFields = requiredFields.filter(field => 
            normalizedItem[field] === undefined || 
            normalizedItem[field] === null || 
            normalizedItem[field] === ''
          );
          
          if (missingFields.length > 0) {
            console.log(`Missing fields for item with SKU ${normalizedItem.sku || 'unknown'}:`, missingFields);
            results.failed++;
            results.errors.push(`Item with SKU ${normalizedItem.sku || 'unknown'}: Missing required fields: ${missingFields.join(', ')}`);
            continue;
          }
          
          // Prepare a cleaned version of the item for storage
          const cleanedItem: any = {
            sku: normalizedItem.sku,
            name: normalizedItem.name,
            category: normalizedItem.category,
            stock: parseFloat(normalizedItem.stock),
            unit: normalizedItem.unit,
            price: parseFloat(normalizedItem.price),
            priceUnit: normalizedItem.priceunit, // Map to correct field name
            threshold: parseFloat(normalizedItem.threshold),
            barcode: normalizedItem.barcode || ''
          };
          
          // Check if item with SKU already exists
          const existingItem = inventoryItems.find(i => i.sku === cleanedItem.sku);
          
          if (existingItem) {
            console.log(`Updating existing item with SKU: ${cleanedItem.sku}`);
            // Update existing item
            const updatedItem = await fileStorage.updateInventoryItem(existingItem.id, {
              ...cleanedItem,
              status: cleanedItem.stock < cleanedItem.threshold ? 'Low Stock' : 'In Stock'
            });
            
            if (updatedItem) {
              results.updated++;
            } else {
              results.failed++;
              results.errors.push(`Failed to update item with SKU: ${cleanedItem.sku}`);
            }
          } else {
            console.log(`Creating new item with SKU: ${cleanedItem.sku}`);
            // Create new item
            const newItem = await fileStorage.addInventoryItem({
              ...cleanedItem,
              status: cleanedItem.stock < cleanedItem.threshold ? 'Low Stock' : 'In Stock'
            });
            
            if (newItem) {
              results.created++;
            } else {
              results.failed++;
              results.errors.push(`Failed to create item with SKU: ${cleanedItem.sku}`);
            }
          }
        } catch (error: any) {
          console.error(`Error processing item:`, error);
          results.failed++;
          results.errors.push(`Error processing item with SKU ${item.sku || 'unknown'}: ${error.message || 'Unknown error'}`);
        }
      }
      
      // Get information about the current user who is making the change
      const currentUser = getCurrentUser(req);
      
      // Log the bulk inventory import activity
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

  // Sales Routes
  app.get("/api/sales", async (req: Request, res: Response) => {
    try {
      const sales = await fileStorage.getSales();
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ error: "Failed to fetch sales data" });
    }
  });

  app.get("/api/sales/:id", async (req: Request, res: Response) => {
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
  
  // Refund a sale transaction
  app.post("/api/sales/:id/refund", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get current user for logging and tracking who processed the refund
      const currentUser = getCurrentUser(req);
      
      // Process the refund
      const refundedSale = await fileStorage.refundSale(id, currentUser.username);
      
      if (!refundedSale) {
        return res.status(404).json({ error: "Sale not found or already refunded" });
      }
      
      // Log the refund activity
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

  app.post("/api/sales", async (req: Request, res: Response) => {
    try {
      // Basic validation
      if (!req.body.cashier || !req.body.amount || !req.body.items || !Array.isArray(req.body.items)) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const newSale = await fileStorage.addSale(req.body);
      
      // Update sales in stats
      const stats = await fileStorage.getStats();
      await fileStorage.updateStats({ 
        todaySales: stats.todaySales + req.body.amount 
      });
      
      // Update inventory stock levels
      for (const item of req.body.items) {
        const inventoryItem = await fileStorage.getInventoryItem(item.productId);
        if (inventoryItem) {
          const newStock = Math.max(0, inventoryItem.stock - item.quantity);
          await fileStorage.updateInventoryItem(item.productId, { 
            stock: newStock 
          });
          
          // Check if this change affects low stock status
          if (inventoryItem.stock > inventoryItem.threshold && newStock <= inventoryItem.threshold) {
            // Item just went below threshold, increment lowStockItems
            await fileStorage.updateStats({ 
              lowStockItems: stats.lowStockItems + 1 
            });
          }
        }
      }
      
      // Get information about the current user who is making the change
      const userInfoHeader = req.headers["user-info"];
      let currentUser = { id: 0, username: "unknown" };
      
      if (userInfoHeader) {
        try {
          currentUser = JSON.parse(userInfoHeader as string);
        } catch (e) {
          console.error("Error parsing user info:", e);
        }
      }
      
      // Log the sales activity
      let itemsList = "";
      let totalItems = 0;
      
      newSale.items.forEach(item => {
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

  // User Routes
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      // Get all users
      const users = await fileStorage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req: Request, res: Response) => {
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

  // Create a new user
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const newUser = await fileStorage.createUser(req.body);
      
      // Get information about the current user who is making the change
      const currentUser = getCurrentUser(req);
      console.log("User creation performed by:", currentUser);
      
      // Log the user creation activity
      const details = `Created new user: ${newUser.username} (ID: ${newUser.id}, Role: ${newUser.role})`;
      
      await ActivityLogger.logUserActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.USER.CREATE,
        details
      );
      
      // Don't include the PIN in the response
      const { pin, ...userWithoutPin } = newUser;
      res.status(201).json(userWithoutPin);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Update a user
  app.put("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await fileStorage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Handle the empty PIN case - if PIN is empty string, don't update it
      const updates = { ...req.body };
      if (updates.pin === "") {
        delete updates.pin;
      }
      
      const updatedUser = await fileStorage.updateUser(id, updates);
      
      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update user" });
      }

      // Get information about the current user who is making the change
      const currentUser = getCurrentUser(req);
      console.log("User update performed by:", currentUser);
      
      // Log the user update activity
      let details = `Updated user: ${user.username} (ID: ${user.id})`;
      if (updates.pin !== undefined) {
        details += ", PIN was changed";
      }
      if (updates.role !== undefined && user.role !== updates.role) {
        details += `, Role changed from ${user.role} to ${updates.role}`;
      }
      if (updates.status !== undefined && user.status !== updates.status) {
        details += `, Status changed from ${user.status} to ${updates.status}`;
      }
      
      await ActivityLogger.logUserActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.USER.UPDATE,
        details
      );
      
      // Don't include the PIN in the response
      const { pin, ...userWithoutPin } = updatedUser;
      res.json(userWithoutPin);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  
  // Add DELETE endpoint for users
  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user exists
      const user = await fileStorage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Delete the user
      const success = await fileStorage.deleteUser(id);
      
      if (success) {
        // Get information about the current user who is making the change
        const userInfoHeader = req.headers["user-info"];
        let currentUser = { id: 0, username: "unknown" };
        
        if (userInfoHeader) {
          try {
            currentUser = JSON.parse(userInfoHeader as string);
          } catch (e) {
            console.error("Error parsing user info:", e);
          }
        }
        
        // Log the user deletion activity
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

  // Authentication routes

  // Losses Management Routes
  app.get("/api/losses", async (req: Request, res: Response) => {
    try {
      const losses = await fileStorage.getLosses();
      res.json(losses);
    } catch (error) {
      console.error("Error fetching losses:", error);
      res.status(500).json({ error: "Failed to fetch losses" });
    }
  });

  app.get("/api/losses/:id", async (req: Request, res: Response) => {
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

  app.post("/api/losses", async (req: Request, res: Response) => {
    try {
      // Basic validation
      const requiredFields = ['inventoryItemId', 'itemName', 'quantity', 'reason', 'recordedBy', 'value'];
      for (const field of requiredFields) {
        if (req.body[field] === undefined) {
          return res.status(400).json({ error: `Missing required field: ${field}` });
        }
      }

      // Get current user for logging
      const currentUser = getCurrentUser(req);
      
      // Create detailed log message for new loss
      const detailsMessage = `Recorded loss of ${req.body.quantity} ${req.body.itemName} | Reason: "${req.body.reason}" | Value: $${req.body.value.toFixed(2)}`;
      
      // Log the detailed loss information
      await ActivityLogger.logLossActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.LOSSES.CREATE,
        detailsMessage
      );
      
      const newLoss = await fileStorage.addLoss(req.body);
      
      // Update inventory stock (deduct the lost quantity)
      const inventoryItem = await fileStorage.getInventoryItem(req.body.inventoryItemId);
      if (inventoryItem) {
        const newStock = Math.max(0, inventoryItem.stock - req.body.quantity);
        await fileStorage.updateInventoryItem(req.body.inventoryItemId, { 
          stock: newStock 
        });
        
        // Check if this change affects low stock status
        if (inventoryItem.stock > inventoryItem.threshold && newStock <= inventoryItem.threshold) {
          // Item just went below threshold, increment lowStockItems
          const stats = await fileStorage.getStats();
          await fileStorage.updateStats({ 
            lowStockItems: stats.lowStockItems + 1 
          });
        }
      }
      
      res.status(201).json(newLoss);
    } catch (error: any) {
      console.error("Error adding loss:", error);
      res.status(500).json({ error: error.message || "Failed to record loss" });
    }
  });
  
  // Update loss record
  app.put("/api/losses/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const updates = req.body;
      
      // Basic validation
      if (!id) {
        return res.status(400).json({ error: 'Loss ID is required' });
      }
      
      // Get current user info for logging
      const currentUser = getCurrentUser(req);
      
      // Get original loss data for detailed logging
      const originalLoss = await fileStorage.getLoss(id);
      
      // Prepare detailed log message for loss updates
      let detailsMessage = `Updated loss record with ID: ${id}`;
      if (originalLoss) {
        if (updates.quantity !== undefined && updates.quantity !== originalLoss.quantity) {
          detailsMessage += ` | Changed quantity from ${originalLoss.quantity} to ${updates.quantity}`;
        }
        if (updates.reason !== undefined && updates.reason !== originalLoss.reason) {
          detailsMessage += ` | Updated reason: "${updates.reason}"`;
        }
        if (updates.itemName) {
          detailsMessage += ` | Item: ${originalLoss.itemName}`;
        }
      }
      
      // Log the update with detailed information
      await ActivityLogger.logLossActivity(
        currentUser.id,
        currentUser.username,
        LOG_ACTIONS.LOSSES.UPDATE,
        detailsMessage
      );
      
      // Update the loss record
      const updatedLoss = await fileStorage.updateLoss(id, updates);
      
      if (!updatedLoss) {
        return res.status(404).json({ error: `Loss record with ID ${id} not found` });
      }
      
      res.status(200).json(updatedLoss);
    } catch (error: any) {
      console.error("Error updating loss record:", error);
      res.status(500).json({ error: error.message || "Failed to update loss record" });
    }
  });

  // Low Stock Alerts
  app.get("/api/alerts/low-stock", async (req: Request, res: Response) => {
    try {
      const items = await fileStorage.getInventory();
      // Type checking is handled in getInventory method
      const lowStockItems = items.filter(item => {
        if (typeof item.stock === 'number' && typeof item.threshold === 'number') {
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
  
  // Store Settings Routes
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const settings = await fileStorage.getStoreSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching store settings:", error);
      res.status(500).json({ error: "Failed to fetch store settings" });
    }
  });
  
  // Favicon endpoint - returns the store logo as a favicon
  app.get("/api/settings/favicon", async (req: Request, res: Response) => {
    try {
      const settings = await fileStorage.getStoreSettings();
      if (settings.storeLogo) {
        // If store logo exists, use it for the favicon
        const base64Data = settings.storeLogo.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        res.set('Content-Type', 'image/png');
        res.send(buffer);
      } else {
        // If no store logo, return a default icon
        res.sendFile(path.join(__dirname, '..', 'client', 'public', 'favicon.ico'));
      }
    } catch (error) {
      console.error("Error serving favicon:", error);
      res.status(500).send("Error generating favicon");
    }
  });
  
  app.put("/api/settings", async (req: Request, res: Response) => {
    try {
      // Basic validation
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

  // Logs Routes - Admin only
  app.get("/api/logs", isAdmin, async (req: Request, res: Response) => {
    try {
      // Get category from query params if provided
      const category = req.query.category as string | undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      let logs;
      if (category) {
        logs = await logStorage.getLogsByCategory(category);
      } else if (userId) {
        logs = await logStorage.getLogsByUser(userId);
      } else {
        logs = await logStorage.getLogs();
      }
      
      // Filter out system startup messages, authentication and system categories
      logs = logs.filter(log => {
        // Filter out system user logs with startup messages
        if (log.username === "system" && log.details && log.details.includes("System startup")) {
          return false;
        }
        
        // Filter out authentication and system categories
        if (log.category === "authentication" || log.category === "system") {
          return false;
        }
        
        return true;
      });
      
      res.json(logs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // Use a standard format for all server errors
      res.status(500).json({ 
        error: "Failed to fetch logs",
        details: errorMessage 
      });
    }
  });

  app.get("/api/logs/categories", isAdmin, async (req: Request, res: Response) => {
    try {
      // Return all log categories except for authentication and system
      const filteredCategories = Object.values(LOG_CATEGORIES).filter(
        category => category !== 'authentication' && category !== 'system'
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

  app.get("/api/logs/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid log ID format" });
      }
      
      const log = await logStorage.getLogById(id);
      
      if (!log) {
        return res.status(404).json({ error: "Log not found" });
      }
      
      res.json(log);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ 
        error: "Failed to fetch log",
        details: errorMessage,
        logId: req.params.id
      });
    }
  });

  /**
   * User Authentication
   * 
   * Handles login requests with secure validation and logging.
   * Creates a session with 2-hour inactivity timeout.
   */
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { username, pin } = req.body;
      
      if (!username || !pin) {
        // Log failed login due to missing credentials
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
        // Log failed login due to invalid credentials
        await ActivityLogger.logAuthActivity(
          0,
          username,
          LOG_ACTIONS.AUTHENTICATION.FAILED_LOGIN,
          "Failed login attempt: Invalid credentials"
        );
        return res.status(401).json({ error: "Invalid username or PIN" });
      }
      
      // Check if user is inactive
      if (user.status === 'Inactive') {
        // Log failed login due to inactive account
        await ActivityLogger.logAuthActivity(
          user.id,
          username,
          LOG_ACTIONS.AUTHENTICATION.FAILED_LOGIN,
          "Failed login attempt: Inactive account"
        );
        return res.status(403).json({ error: "Your account is inactive. Please contact an administrator." });
      }
      
      // Calculate session validity (2 hours from now)
      const now = new Date();
      const sessionValidUntil = new Date(now);
      sessionValidUntil.setHours(sessionValidUntil.getHours() + 2);
      
      // Update last active timestamp and session info for the user
      await fileStorage.updateUser(user.id, { 
        lastActive: now.toISOString(),
        sessionValidUntil: sessionValidUntil.toISOString()
      });
      
      // Log successful login
      await ActivityLogger.logAuthActivity(
        user.id,
        username,
        LOG_ACTIONS.AUTHENTICATION.LOGIN,
        "User logged in successfully"
      );
      
      // User info is stored in client's session storage with timeout protection
      // Sensitive information like PIN is excluded from the response
      const { pin: _, ...userWithoutPin } = user;
      
      // Include session information in the response
      res.json({
        success: true,
        user: {
          ...userWithoutPin,
          sessionValidUntil: sessionValidUntil.toISOString()
        }
      });
    } catch (error) {
      console.error("Error during login:", error);
      
      // Log system error
      await ActivityLogger.logSystemActivity(
        LOG_ACTIONS.SYSTEM.ERROR,
        `Error during login: ${error}`
      );
      
      res.status(500).json({ error: "Login failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
