require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.error('Failed to set custom DNS servers:', e.message);
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const errorHandler = require('./middleware/errorMiddleware');
const User = require('./models/User');

const app = express();

// Connect Database
connectDB();

// Global Middlewares
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom lightweight Cookie Parser Middleware
app.use((req, res, next) => {
  req.cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts[0] && parts[1]) {
        req.cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
      }
    });
  }
  next();
});

// Seed Initial Data (Helper)
const seedUsers = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('No users found in database. Seeding default demo accounts...');
      
      // Default Admin
      await User.create({
        name: 'Demo Admin',
        phone: '9999999999',
        email: 'admin@emediclub.com',
        password: 'admin123',
        role: 'admin',
      });

      // Default Vendor
      await User.create({
        name: 'Demo Vendor Store',
        phone: '8888888888',
        email: 'vendor@emediclub.com',
        password: 'vendor123',
        role: 'vendor',
      });

      // Default Standard User
      await User.create({
        name: 'Demo Customer',
        phone: '7777777777',
        email: 'user@emediclub.com',
        password: 'user123',
        role: 'user',
      });

      console.log('Demo accounts seeded successfully:');
      console.log('- Admin: Phone 9999999999, Password: admin123');
      console.log('- Vendor: Phone 8888888888, Password: vendor123');
      console.log('- User: Phone 7777777777, Password: user123');
    }

    // Seed specific Multi-Vendor role demo accounts if they do not exist
    const pharmacyExists = await User.findOne({ email: 'pharmacy@emediclub.com' });
    if (!pharmacyExists) {
      await User.create({
        name: 'City Pharmacy',
        phone: '8888888889',
        email: 'pharmacy@emediclub.com',
        password: 'Pharmacy@123',
        role: 'pharmacy_vendor',
      });
      console.log('Seeded City Pharmacy (pharmacy@emediclub.com / Pharmacy@123)');
    }

    const labExists = await User.findOne({ email: 'lab@emediclub.com' });
    if (!labExists) {
      await User.create({
        name: 'Diagnostics Lab',
        phone: '8888888890',
        email: 'lab@emediclub.com',
        password: 'Lab@123',
        role: 'lab_vendor',
      });
      console.log('Seeded Diagnostics Lab (lab@emediclub.com / Lab@123)');
    }

    const doctorExists = await User.findOne({ email: 'doctor@emediclub.com' });
    if (!doctorExists) {
      await User.create({
        name: 'Dr. Ramesh (General Physician)',
        phone: '8888888891',
        email: 'doctor@emediclub.com',
        password: 'Doctor@123',
        role: 'doctor_vendor',
      });
      console.log('Seeded Dr. Ramesh (doctor@emediclub.com / Doctor@123)');
    }

  } catch (err) {
    console.error(`Seeding error: ${err.message}`);
  }
};

// Run Seeder
seedUsers();

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vendor', vendorRoutes);

// Health check API
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// 404 Route handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
