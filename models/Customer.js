const mongoose = require('mongoose');

// Helper function to normalize phone numbers
const normalizePhoneNumber = (phone) => {
  if (!phone) {return phone;}
  
  // Remove all non-digit characters
  const digitsOnly = phone.toString().replace(/\D/g, '');
  
  // Handle Colombian format with country code (+57)
  if (digitsOnly.length === 12 && digitsOnly.startsWith('57')) {
    return digitsOnly.substring(2); // Remove country code '57'
  }
  
  // Return as-is if 10 digits (mobile) or 7 digits (landline), otherwise return original for validation to catch
  return (digitsOnly.length === 10 || digitsOnly.length === 7) ? digitsOnly : phone;
};

const customerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      validate: {
        validator: function(v) {
          // Colombian mobile: 10 digits starting with 3 (e.g., 3001234567)
          // Colombian landline: 7 digits (e.g., 6012345)
          return /^3\d{9}$/.test(v) || /^\d{7}$/.test(v);
        },
        message: 'Phone number must be a valid Colombian number (mobile: 10 digits starting with 3, landline: 7 digits). Formats like +57 300 123 4567 are automatically normalized.',
      },
    },
    email: {
      type: String,
      sparse: true, // Allows multiple null values but unique non-null values
      lowercase: true,
      trim: true,
    },
    lastTransaction: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save middleware to normalize phone number
customerSchema.pre('save', function(next) {
  if (this.isModified('phoneNumber')) {
    this.phoneNumber = normalizePhoneNumber(this.phoneNumber);
  }
  next();
});

// Pre-findOneAndUpdate middleware to normalize phone number
customerSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  const update = this.getUpdate();
  if (update.phoneNumber) {
    update.phoneNumber = normalizePhoneNumber(update.phoneNumber);
  }
  if (update.$set && update.$set.phoneNumber) {
    update.$set.phoneNumber = normalizePhoneNumber(update.$set.phoneNumber);
  }
  next();
});

// Transform output
customerSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
module.exports.normalizePhoneNumber = normalizePhoneNumber;
