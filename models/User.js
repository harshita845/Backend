const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter a name'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please enter a mobile phone number'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please enter an email address'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please enter a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'vendor', 'pharmacy_vendor', 'lab_vendor', 'doctor_vendor'],
      default: 'user',
    },
    refreshToken: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetOTP: {
      type: String,
    },
    resetOTPExpiry: {
      type: Date,
    },
    phoneOTP: {
      type: String,
    },
    phoneOTPExpiry: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
