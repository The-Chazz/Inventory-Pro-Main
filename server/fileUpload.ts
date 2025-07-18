import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Express } from 'express';

// Get the directory name properly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create upload directories if they don't exist
const uploadDir = path.join(__dirname, 'uploads');
const inventoryImagesDir = path.join(uploadDir, 'inventory');
const logoImagesDir = path.join(uploadDir, 'logos');
const csvDir = path.join(uploadDir, 'csv');

// Ensure upload directories exist with debug logging
console.log(`Creating upload directories if they don't exist:`);
console.log(`- Upload dir: ${uploadDir}`);
console.log(`- Inventory images dir: ${inventoryImagesDir}`);
console.log(`- Logo images dir: ${logoImagesDir}`);
console.log(`- CSV dir: ${csvDir}`);

fs.ensureDirSync(uploadDir);
fs.ensureDirSync(inventoryImagesDir);
fs.ensureDirSync(logoImagesDir);
fs.ensureDirSync(csvDir);

// Configure storage for inventory images
const inventoryStorage = multer.diskStorage({
  destination: function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
    cb(null, inventoryImagesDir);
  },
  filename: function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    // Create a unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'inventory-' + uniqueSuffix + ext);
  }
});

// Configure storage for logo images
const logoStorage = multer.diskStorage({
  destination: function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
    cb(null, logoImagesDir);
  },
  filename: function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    // For logos, we'll use a fixed filename as there's only one store logo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'store-logo-' + uniqueSuffix + ext);
  }
});

// Configure storage for CSV uploads
const csvStorage = multer.diskStorage({
  destination: function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
    cb(null, path.join(uploadDir, 'csv'));
  },
  filename: function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'inventory-import-' + uniqueSuffix + '.csv');
  }
});

// File filter to accept only image files
const imageFileFilter = (
  req: Express.Request, 
  file: Express.Multer.File, 
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// File filter to accept only CSV files
const csvFileFilter = (
  req: Express.Request, 
  file: Express.Multer.File, 
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'));
  }
};

// Create multer instances for different upload types
export const inventoryImageUpload = multer({ 
  storage: inventoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: imageFileFilter
});

export const logoImageUpload = multer({ 
  storage: logoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max file size
  },
  fileFilter: imageFileFilter
});

export const csvUpload = multer({ 
  storage: csvStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  fileFilter: csvFileFilter
});

// Helper function to get the public URL for an image
export function getImageUrl(filename: string, type: 'inventory' | 'logo'): string {
  const baseDir = type === 'inventory' ? 'inventory' : 'logos';
  return `/uploads/${baseDir}/${filename}`;
}

// Helper function to delete an image file
export async function deleteImage(filename: string, type: 'inventory' | 'logo'): Promise<boolean> {
  try {
    const baseDir = type === 'inventory' ? inventoryImagesDir : logoImagesDir;
    const filePath = path.join(baseDir, filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    // Delete the file
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting image: ${error}`);
    return false;
  }
}

// Helper to convert base64 image data to a file and save it
export async function saveBase64Image(
  base64Data: string, 
  type: 'inventory' | 'logo',
  itemId?: number
): Promise<string | null> {
  try {
    // Extract the image data from the data URL
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image data');
    }
    
    const imageData = Buffer.from(matches[2], 'base64');
    const mimeType = matches[1];
    const extension = mimeType.split('/')[1] || 'png';
    
    // Create a unique filename
    const filename = type === 'inventory' 
      ? `inventory-${itemId || Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`
      : `store-logo-${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
    
    // Save to the appropriate directory
    const baseDir = type === 'inventory' ? inventoryImagesDir : logoImagesDir;
    const filePath = path.join(baseDir, filename);
    
    await fs.writeFile(filePath, imageData);
    
    // Return the relative URL
    return `/uploads/${type}/${filename}`;
  } catch (error) {
    console.error(`Error saving base64 image: ${error}`);
    return null;
  }
}

// Ensure CSV directory exists
fs.ensureDirSync(path.join(uploadDir, 'csv'));

// Helper function to process a CSV file
export async function processCsvFile(filePath: string): Promise<any[]> {
  const fs = await import('fs/promises');
  const { parse } = await import('csv-parse/sync');
  
  try {
    console.log(`Processing CSV file: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Parse CSV records
    const records = parse(content, {
      columns: (header) => {
        // Normalize column headers to lowercase
        console.log('Original CSV headers:', header);
        return header.map((column: string) => {
          // Handle common field name variations
          let normalizedColumn = column.toLowerCase().trim();
          
          // Map common variations of field names
          if (normalizedColumn === 'price unit' || normalizedColumn === 'priceunit' || normalizedColumn === 'unit price') {
            normalizedColumn = 'priceunit';
          } else if (normalizedColumn === 'barcode number' || normalizedColumn === 'barcode') {
            normalizedColumn = 'barcode';
          }
          
          return normalizedColumn;
        });
      },
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Processed ${records.length} records from CSV`);
    
    // Standardize field names in each record
    const standardizedRecords = records.map((record: any) => {
      const normalizedRecord: any = {};
      
      // Convert all keys to lowercase for standardization
      Object.keys(record).forEach(key => {
        // Skip empty fields
        if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
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