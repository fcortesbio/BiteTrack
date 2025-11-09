import mongoose from "mongoose";

const passwordResetTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  },
  {
    timestamps: true,
  },
);

// Auto-delete expired tokens
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Transform output
passwordResetTokenSchema.set("toJSON", {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("PasswordResetToken", passwordResetTokenSchema);
