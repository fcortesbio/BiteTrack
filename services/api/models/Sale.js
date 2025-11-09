import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        priceAtSale: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    settled: {
      type: Boolean,
      default: false,
    },
    settledAt: {
      type: Date,
      default: null,
    },

    // CSV Import Fields (all optional for backwards compatibility)
    originalCreatedAt: {
      type: Date,
      default: null,
    },
    importedAt: {
      type: Date,
      default: null,
    },
    externalSale: {
      type: Boolean,
      default: false,
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    importBatch: {
      type: String,
      default: null,
    },
    paymentMethod: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Transform output
saleSchema.set("toJSON", {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Sale", saleSchema);
