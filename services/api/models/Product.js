import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    count: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Add virtual field for API compatibility
productSchema.virtual("name").get(function () {
  return this.productName;
});

// Transform output with virtuals enabled
productSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    ret.name = ret.productName; // Ensure name field is available for API consistency
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Product", productSchema);
