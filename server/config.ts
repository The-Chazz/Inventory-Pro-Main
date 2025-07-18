/**
 * Configuration module for Inventory Pro
 * 
 * This module handles loading environment variables and application configuration.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Try to load .env file manually since some environments don't load it automatically
function loadEnvFile() {
  try {
    const envPath = path.join(rootDir, '.env');
    if (fs.existsSync(envPath)) {
      // Loading .env file
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envLines = envContent.split('\n');
      
      for (const line of envLines) {
        const trimmedLine = line.trim();
        // Skip comments and empty lines
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;
        
        const [key, value] = trimmedLine.split('=');
        if (key && value) {
          process.env[key.trim()] = value.trim();
          // Environment variable loaded
        }
      }
    }
  } catch (error) {
    // Environment file loading error handled silently
  }
}

// Load environment variables from .env file
loadEnvFile();

// Get configuration with fallbacks
export const config = {
  useFileStorage: true, // Always use file storage
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  sessionSecret: process.env.SESSION_SECRET || 'inventory-pro-secret-key-1234',
  sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '7200000', 10), // 2 hours in milliseconds
};

// Log the configuration (but hide secrets)
console.log('App configuration:');
console.log('- File storage mode: enabled (always)');
console.log('- Environment:', config.nodeEnv);
console.log('- Port:', config.port);
console.log('- Session max age:', config.sessionMaxAge, 'ms');