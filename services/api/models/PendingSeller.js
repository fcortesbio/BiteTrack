import mongoose from "mongoose";

const pendingSellerSchema = new mongoose.Schema(
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
    testingUser: {
      type: Boolean,
      default: false,
      index: true, // Index for efficient filtering
    },
  },
  {
    timestamps: true,
  },
);

// Transform output
pendingSellerSchema.set("toJSON", {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("PendingSeller", pendingSellerSchema);
