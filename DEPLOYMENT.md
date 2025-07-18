# Deployment Guide for Inventory Pro

## Overview

This guide covers building and deploying the Inventory Pro application for production use.

## Production Build Process

### 1. Build the Application

```bash
npm run build
```

This command:
- Builds the client-side React application using Vite
- Bundles the server-side Express application using esbuild
- Outputs everything to the `dist/` directory

### 2. Start Production Server

```bash
npm start
```

This starts the production server on port 5000 (configurable via environment variables).

## Production Configuration

### Vite Build Optimizations

The production build includes several optimizations:

- **Code Splitting**: Manual chunking separates vendor libraries, UI components, router, and utilities
- **Asset Optimization**: Minification using esbuild for faster builds
- **Caching**: Optimized file naming with content hashes for browser caching
- **Source Maps**: Disabled in production for smaller bundles

### Environment Configuration

The application automatically detects the environment:
- `NODE_ENV=development` - Development mode with hot reloading
- `NODE_ENV=production` - Production mode with optimizations

### Server Configuration

The Express server is configured differently for development and production:

- **Development**: Uses Vite middleware for hot reloading
- **Production**: Serves static files from `dist/public` with client-side routing fallback

## Client-Side Routing

### History API Fallback

The production server is configured to handle client-side routing by:
1. Serving static assets directly from `dist/public`
2. Falling back to `index.html` for all non-asset requests
3. Allowing React Router (wouter) to handle route resolution

This ensures that direct navigation to routes like `/inventory` or `/pos` works correctly in production.

### Role-Based Access Control

The application includes robust role normalization to handle:
- Case variations in role names (`admin` vs `Administrator`)
- Consistent role checking across all protected routes
- Automatic redirection for unauthorized access

## Testing Production Build

### Manual Testing Steps

1. **Build and Start**:
   ```bash
   npm run build
   npm start
   ```

2. **Test Navigation**:
   - Navigate to `http://localhost:5000`
   - Login with admin credentials (`admin` / `1234`)
   - Test direct navigation to each route:
     - `/dashboard`
     - `/inventory`
     - `/pos`
     - `/sales`

3. **Test Sidebar Functionality**:
   - Click navigation links to verify routing
   - Test sidebar collapse/expand functionality
   - Verify role-based access control

### Expected Results

✅ **Working Navigation**: All sidebar links should navigate correctly
✅ **URL Persistence**: Browser URL should update and persist across refreshes
✅ **Role Access**: Administrator role should access all areas
✅ **Sidebar State**: Collapse/expand should work smoothly

## Troubleshooting

### Common Issues

1. **Navigation redirects to dashboard**: 
   - Check user role in session storage
   - Verify role normalization in `ProtectedRoute` component

2. **404 errors on direct navigation**:
   - Ensure server is serving `index.html` for all routes
   - Check `serveStatic` function in `server/vite.ts`

3. **Build errors**:
   - Verify all dependencies are installed
   - Check TypeScript compilation errors
   - Ensure proper path resolution in `vite.config.ts`

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database/data files accessible
- [ ] Build process completes successfully
- [ ] All navigation routes work
- [ ] User authentication functions
- [ ] Role-based access control verified
- [ ] Static assets load correctly
- [ ] Production logs show no errors

## Performance Considerations

The build is optimized for production with:
- Vendor chunks cached separately for better performance
- Asset compression and minification
- Efficient code splitting to reduce initial bundle size
- Optimized dependency bundling

Total bundle size after optimization: ~1MB (including all dependencies)