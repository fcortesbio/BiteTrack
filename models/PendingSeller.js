import mongoose from 'mongoose';

const pendingSellerSchema = new mongoose.Schema({
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
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String
    required: true,
    validate: {
      validator: function(value) {
        // Allow the special "Self" string for bootstrap superadmin
        if (value === 'Self') {
          return true;
        }
        // Otherwise, validate as ObjectId
        return mongoose.Types.ObjectId.isValid(value);
      },
      message: 'createdBy must be a valid ObjectId or "Self" for bootstrap accounts',
    },
    // Set reference only when it's an ObjectId
    refPath: function() {
      return this.createdBy === 'Self' ? null : 'Seller';
    },
  },
  activatedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Transform output
pendingSellerSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('PendingSeller', pendingSellerSchema);
