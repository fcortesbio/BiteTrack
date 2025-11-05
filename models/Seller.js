import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const sellerSchema = new mongoose.Schema(
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
    password: {
      type: String,
      required: true,
      select: false, // Exclude from query results by default
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin'],
      default: 'user',
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
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
sellerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {return next();}

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
sellerSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Transform output to exclude password and add id
sellerSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

export default mongoose.model('Seller', sellerSchema);
