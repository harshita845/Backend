const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800, // 7 days in seconds
    },
  }
);

module.exports = mongoose.model('BlacklistedToken', blacklistedTokenSchema);
