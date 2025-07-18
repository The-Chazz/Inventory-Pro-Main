/**
 * Inventory Pro Server Entry Point
 * 
 * This file initializes the Express server, sets up middleware, and starts the HTTP server.
 * It handles API routing, request logging, and serves the client application.
 */
import './config'; // Import config first to ensure environment variables are loaded
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeAppStorage } from "./init";
import { config } from "./config";
import helmet from "helmet";

const app = express();

// Security middleware - Adds various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for development
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"], // Allow data URLs for base64 encoded images and blob
      fontSrc: ["'self'", "data:"], // Allow data URLs for base64 encoded fonts
      connectSrc: ["'self'", "blob:"], // Allow blob for file uploads
    }
  },
  // Production security: hide X-Powered-By header
  hidePoweredBy: true,
}));

// Body parsing middleware
app.use(express.json({ limit: "10mb" })); // Increased limit for image and file uploads
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  // Skip logging for static assets
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico)$/)) {
    return next();
  }
  
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Capture JSON responses for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log after response is sent
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Only log response in development or if specifically enabled
      if (config.nodeEnv !== "production" && capturedJsonResponse) {
        // Redact sensitive data from logs
        const safeResponse = { ...capturedJsonResponse };
        // Remove any sensitive fields if present
        if (safeResponse.password) safeResponse.password = "[REDACTED]";
        if (safeResponse.token) safeResponse.token = "[REDACTED]";
        
        logLine += ` :: ${JSON.stringify(safeResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// IIFE to allow async/await at the top level
(async () => {
  try {
    // Initialize file storage system
    await initializeAppStorage();
    
    // Register API routes
    const server = await registerRoutes(app);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      // Don't expose detailed error messages in production
      const message = config.nodeEnv === "production" 
        ? "Internal Server Error" 
        : (err.message || "Internal Server Error");

      log(`Error: ${err.message || "Unknown error"}`, "error");
      
      // Send error response but don't expose full stack trace in production
      res.status(status).json({ 
        message,
        // Only include error details in development
        ...(config.nodeEnv !== "production" && { details: err.stack })
      });
      
      // Don't throw errors in the error handler
      // The error is already logged, throwing will crash the server
    });

    // Setup client-side rendering
    if (config.nodeEnv === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server
    const port = config.port;
    const host = config.nodeEnv === 'production' ? 'localhost' : '0.0.0.0';
    
    server.listen(port, host, () => {
      log(`Server started and listening on ${host}:${port}`);
    });
    
    // Handle graceful shutdown
    const shutdown = () => {
      log('Shutting down server gracefully...', 'server');
      server.close(() => {
        log('Server shutdown complete', 'server');
        process.exit(0);
      });
      
      // Force close after timeout
      setTimeout(() => {
        log('Server shutdown timed out, forcing exit', 'server');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
