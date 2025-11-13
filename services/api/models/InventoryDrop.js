import mongoose from "mongoose";

const inventoryDropSchema = new mongoose.Schema(
  {
    // Product information (snapshot at time of drop)
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
      index: true,
    },
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },

    // Drop details
    quantityDropped: {
      type: Number,
      required: [true, "Quantity dropped is required"],
      min: [0, "Quantity dropped must be non-negative"],
    },
    originalQuantity: {
      type: Number,
      required: [true, "Original quantity before drop is required"],
      min: [0, "Original quantity must be non-negative"],
    },
    remainingQuantity: {
      type: Number,
      required: [true, "Remaining quantity after drop is required"],
      min: [0, "Remaining quantity must be non-negative"],
    },
    pricePerUnit: {
      type: Number,
      required: [true, "Price per unit is required"],
      min: [0, "Price per unit must be non-negative"],
    },

    // Financial impact
    totalValueLost: {
      type: Number,
      min: [0, "Total value must be non-negative"],
    },

    // Drop reason and context
    reason: {
      type: String,
      required: [true, "Drop reason is required"],
      enum: {
        values: [
          "expired",
          "end_of_day",
          "quality_issue",
          "damaged",
          "contaminated",
          "overproduction",
          "other",
        ],
        message: "Invalid drop reason",
      },
      default: "end_of_day",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },

    // Tracking information
    droppedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: [true, "Dropped by user is required"],
      index: true,
    },
    droppedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },

    // Undo functionality (8-hour window)
    canBeUndone: {
      type: Boolean,
      default: true,
      index: true,
    },
    undoExpiresAt: {
      type: Date,
      index: true,
    },
    isUndone: {
      type: Boolean,
      default: false,
      index: true,
    },
    undoneBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
    },
    undoneAt: {
      type: Date,
    },
    undoReason: {
      type: String,
      trim: true,
      maxlength: [300, "Undo reason cannot exceed 300 characters"],
    },

    // Production context for food safety compliance
    productionDate: {
      type: Date,
      index: true,
    },
    expirationDate: {
      type: Date,
      index: true,
    },

    // Batch/lot information if applicable
    batchId: {
      type: String,
      trim: true,
      index: true,
    },
    isTestData: {
      type: Boolean,
      default: () => process.env.NODE_ENV === "development",
      index: true, // Index for efficient filtering and cleanup
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for performance and analytics
inventoryDropSchema.index({ droppedAt: 1, reason: 1 });
inventoryDropSchema.index({ productId: 1, droppedAt: -1 });
inventoryDropSchema.index({ droppedBy: 1, droppedAt: -1 });
inventoryDropSchema.index({ canBeUndone: 1, undoExpiresAt: 1 });
inventoryDropSchema.index({ isUndone: 1, droppedAt: -1 });

// Virtual for drop efficiency percentage
inventoryDropSchema.virtual("dropPercentage").get(function () {
  if (this.originalQuantity === 0) {
    return 0;
  }
  return ((this.quantityDropped / this.originalQuantity) * 100).toFixed(2);
});

// Virtual for checking if drop can still be undone
inventoryDropSchema.virtual("undoAvailable").get(function () {
  return this.canBeUndone && !this.isUndone && new Date() < this.undoExpiresAt;
});

// Virtual for time remaining for undo (in minutes)
inventoryDropSchema.virtual("undoTimeRemaining").get(function () {
  if (!this.undoAvailable) {
    return 0;
  }
  const diffMs = this.undoExpiresAt - new Date();
  return Math.max(0, Math.floor(diffMs / (1000 * 60))); // minutes
});

// Virtual for checking if this was a partial drop
inventoryDropSchema.virtual("isPartialDrop").get(function () {
  return this.remainingQuantity > 0;
});

// Virtual for days since production (food safety metric)
inventoryDropSchema.virtual("daysSinceProduction").get(function () {
  if (!this.productionDate) {
    return null;
  }
  const diffTime = Math.abs(this.droppedAt - this.productionDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
inventoryDropSchema.pre("save", function (next) {
  // Calculate total value lost
  this.totalValueLost = this.quantityDropped * this.pricePerUnit;

  // Set undo expiration to 8 hours from drop time
  if (this.isNew) {
    // Ensure droppedAt is set
    if (!this.droppedAt) {
      this.droppedAt = new Date();
    }

    const eightHoursFromNow = new Date(this.droppedAt);
    eightHoursFromNow.setHours(eightHoursFromNow.getHours() + 8);
    this.undoExpiresAt = eightHoursFromNow;
  }

  next();
});

// Method to check if drop can be undone
inventoryDropSchema.methods.canUndo = function () {
  return this.canBeUndone && !this.isUndone && new Date() < this.undoExpiresAt;
};

// Method to undo the drop
inventoryDropSchema.methods.undoDrop = async function (
  undoneByUserId,
  undoReason = "",
) {
  if (!this.canUndo()) {
    throw new Error(
      "This inventory drop cannot be undone (expired or already undone)",
    );
  }

  this.isUndone = true;
  this.undoneBy = undoneByUserId;
  this.undoneAt = new Date();
  this.undoReason = undoReason;
  this.canBeUndone = false; // Prevent future undo attempts

  return await this.save();
};

// Transform output for API
inventoryDropSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Static method for analytics - get drop summary by date range
inventoryDropSchema.statics.getDropAnalytics = async function (
  startDate,
  endDate,
  filters = {},
) {
  const match = {
    droppedAt: { $gte: startDate, $lte: endDate },
    isUndone: false, // Exclude undone drops from analytics
  };

  // Apply additional filters
  if (filters.productId) {
    match.productId = new mongoose.Types.ObjectId(filters.productId);
  }
  if (filters.reason) {
    match.reason = filters.reason;
  }
  if (filters.droppedBy) {
    match.droppedBy = new mongoose.Types.ObjectId(filters.droppedBy);
  }

  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          reason: "$reason",
          productId: "$productId",
          productName: "$productName",
        },
        totalQuantityDropped: { $sum: "$quantityDropped" },
        totalValueLost: { $sum: "$totalValueLost" },
        dropCount: { $sum: 1 },
        avgQuantityPerDrop: { $avg: "$quantityDropped" },
        partialDrops: {
          $sum: {
            $cond: [{ $gt: ["$remainingQuantity", 0] }, 1, 0],
          },
        },
      },
    },
    {
      $group: {
        _id: "$_id.reason",
        products: {
          $push: {
            productId: "$_id.productId",
            productName: "$_id.productName",
            totalQuantityDropped: "$totalQuantityDropped",
            totalValueLost: "$totalValueLost",
            dropCount: "$dropCount",
            avgQuantityPerDrop: "$avgQuantityPerDrop",
            partialDrops: "$partialDrops",
          },
        },
        totalQuantityDropped: { $sum: "$totalQuantityDropped" },
        totalValueLost: { $sum: "$totalValueLost" },
        totalDropCount: { $sum: "$dropCount" },
        totalPartialDrops: { $sum: "$partialDrops" },
      },
    },
    { $sort: { totalValueLost: -1 } },
  ]);
};

// Static method for daily drop summary
inventoryDropSchema.statics.getDailyDropSummary = async function (date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await this.aggregate([
    {
      $match: {
        droppedAt: { $gte: startOfDay, $lte: endOfDay },
        isUndone: false,
      },
    },
    {
      $group: {
        _id: "$reason",
        totalQuantity: { $sum: "$quantityDropped" },
        totalValue: { $sum: "$totalValueLost" },
        dropCount: { $sum: 1 },
        products: { $addToSet: "$productName" },
        partialDrops: {
          $sum: {
            $cond: [{ $gt: ["$remainingQuantity", 0] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        reason: "$_id",
        totalQuantity: 1,
        totalValue: 1,
        dropCount: 1,
        partialDrops: 1,
        uniqueProducts: { $size: "$products" },
        _id: 0,
      },
    },
    { $sort: { totalValue: -1 } },
  ]);
};

// Static method to get drops that can still be undone
inventoryDropSchema.statics.getUndoableDrops = async function (userId = null) {
  const match = {
    canBeUndone: true,
    isUndone: false,
    undoExpiresAt: { $gt: new Date() },
  };

  if (userId) {
    match.droppedBy = new mongoose.Types.ObjectId(userId);
  }

  return await this.find(match)
    .populate("productId", "productName category")
    .populate("droppedBy", "firstName lastName")
    .sort({ droppedAt: -1 });
};

const InventoryDrop = mongoose.model("InventoryDrop", inventoryDropSchema);

export default InventoryDrop;
