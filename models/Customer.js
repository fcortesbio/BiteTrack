const mongoose = require('mongoose');

// Helper function to normalize phone numbers
const normalizePhoneNumber = (phone) => {
  if (!phone) {return phone;}
  
  // Remove all non-digit characters
  const digitsOnly = phone.toString().replace(/\D/g, '');
  
  // Handle US format with country code (+1)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return digitsOnly.substring(1); // Remove leading '1'
  }
  
  // Return as-is if 10 digits, otherwise return original for validation to catch
  return digitsOnly.length === 10 ? digitsOnly : phone;
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
          return /^\d{10}$/.test(v);
        },
        message: 'Phone number must be a valid 10-digit US number (formats like (555) 123-4567 are automatically normalized)',
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

module.exports = mongoose.model('Customer', customerSchema);
