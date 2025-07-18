# Inventory Pro

A locally hosted inventory management system built with modern web technologies.

## Features

- Real-time inventory tracking
- Sales management
- User access control
- Dashboard analytics
- Report generation
- Point of sale functionality
- Low stock alerts
- Barcode scanning support
- Loss tracking
- Profit analysis

## Installation

1. Clone the repository:
```bash
git clone https://github.com/The-Chazz/Inventory-Pro.git
cd Inventory-Pro
```

2. Install dependencies:
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

3. Configure the application:
- Copy `.env.example` to `.env` (if available)
- Update environment variables as needed

4. Start the development servers:
```bash
# Start server (from root directory)
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
inventory-pro/
├── client/            # Frontend React application
│   ├── public/        # Static assets
│   │   ├── fontawesome/  # Local FontAwesome files
│   │   └── icons/     # Application icons
│   ├── src/          # Source code
│   │   ├── components/  # Reusable UI components
│   │   ├── context/   # React context providers
│   │   ├── hooks/     # Custom React hooks
│   │   ├── lib/       # Utility libraries
│   │   ├── pages/     # Page components
│   │   └── utils/     # Utility functions
│   ├── components.json  # UI component configuration
│   ├── postcss.config.js  # PostCSS configuration
│   ├── tailwind.config.ts  # Tailwind CSS configuration
│   └── vite.config.ts    # Vite build configuration
├── server/           # Backend Node.js server
│   ├── data/         # File-based data storage
│   ├── uploads/      # File upload storage
│   ├── config.ts     # Server configuration
│   ├── fileStorage.ts  # File-based storage implementation
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API routes
│   └── utils/        # Server utility functions
├── shared/           # Shared code between client and server
│   └── schema.ts     # TypeScript type definitions
├── docs/            # Documentation
├── dist/            # Build output
└── package.json     # Project dependencies and scripts
```

## Development

### Architecture

The application follows a client-server architecture:
- **Frontend**: React with TypeScript, Vite for bundling
- **Backend**: Node.js with Express
- **Data Storage**: File-based JSON storage (no database required)
- **Styling**: Tailwind CSS with shadcn/ui components

### Key Components

1. **User Management**
   - Authentication and authorization
   - Role-based access control (Administrator, Manager, Cashier, Stocker)
   - User activity tracking

2. **Inventory Management**
   - Stock tracking with real-time updates
   - Low stock alerts and reorder notifications
   - Category management
   - Barcode scanning support
   - Bulk import via CSV

3. **Sales System**
   - Point of sale interface
   - Sales history and tracking
   - Refund processing
   - Receipt generation

4. **Dashboard**
   - Real-time statistics
   - Sales analytics
   - Inventory insights
   - User activity monitoring

5. **Reporting**
   - Profit tracking
   - Loss reports
   - Sales analytics
   - Custom date ranges

### API Endpoints

#### Authentication
- `POST /api/login` - User authentication

#### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Inventory
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get specific item
- `POST /api/inventory` - Create new item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item

#### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get specific sale
- `POST /api/sales` - Create new sale
- `POST /api/sales/:id/refund` - Process refund

#### Statistics
- `GET /api/stats` - Get dashboard statistics

### File Storage

The application uses file-based storage with JSON files located in `server/data/`:
- `users.json` - User accounts and settings
- `inventory.json` - Inventory items
- `sales.json` - Sales transactions
- `losses.json` - Loss records
- `stats.json` - Dashboard statistics
- `settings.json` - Application settings

### Development Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run check
```

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

The built files will be in the `dist/` directory.

## Configuration

### Environment Variables

- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port (default: 5000)
- `SESSION_SECRET` - Session encryption secret
- `SESSION_MAX_AGE` - Session timeout in milliseconds

### Features Configuration

- **File Storage**: Always enabled, no database required
- **Upload Limits**: 10MB for images and files
- **Session Timeout**: 2 hours default
- **Auto-save**: Real-time data persistence

## Security

- Input validation using Zod schemas
- Session-based authentication
- CSRF protection
- Secure headers with Helmet
- File upload restrictions
- SQL injection prevention (N/A - file-based storage)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use existing component patterns
- Add proper error handling
- Update documentation for new features
- Test all API endpoints
- Ensure responsive design

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Change the port in `.env` file or use `PORT=3000 npm run dev`

2. **Permission errors**
   - Ensure write permissions for `server/data/` and `server/uploads/`

3. **Build failures**
   - Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

4. **FontAwesome icons not loading**
   - Verify local FontAwesome files in `client/public/fontawesome/`

### Support

For issues and questions:
1. Check the troubleshooting section
2. Review the project documentation
3. Create an issue on GitHub

## License

[MIT License](LICENSE)

## Acknowledgments

- Built with React and Node.js
- UI components from shadcn/ui
- Icons from FontAwesome
- Styling with Tailwind CSS