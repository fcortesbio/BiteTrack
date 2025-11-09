import InventoryDrop from "../models/InventoryDrop.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";
import { validationResult } from "express-validator";

/**
 * Drop inventory for a product (admin/superadmin only)
 * Creates a persistent record for analytics and updates product inventory
 *
 * @async
 * @function dropInventory
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.productId - Product ID to drop inventory from
 * @param {number} req.body.quantityToDrop - Quantity to drop (must be > 0)
 * @param {string} req.body.reason - Reason for drop (e.g., "expired", "damaged")
 * @param {string} [req.body.notes] - Additional notes
 * @param {string} [req.body.productionDate] - Production date
 * @param {string} [req.body.expirationDate] - Expiration date
 * @param {string} [req.body.batchId] - Batch identifier
 * @param {Object} req.user - Authenticated user
 * @param {string} req.user.id - User ID performing the drop
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with drop details and undo information (201)
 * @throws {404} If product not found
 * @throws {400} If quantity is invalid or insufficient inventory
 *
 * @description
 * Uses MongoDB transaction to ensure atomic operation
 * Creates audit trail and allows undo within 8-hour window
 */
const dropInventory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Invalid input data",
      details: errors.array(),
      statusCode: 400,
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      productId,
      quantityToDrop,
      reason,
      notes,
      productionDate,
      expirationDate,
      batchId,
    } = req.body;
    const droppedBy = req.user.id;

    // Find the product
    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({
        error: "Product Not Found",
        message: "Product with the specified ID does not exist",
        statusCode: 404,
      });
    }

    // Validate quantity to drop
    if (quantityToDrop <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        error: "Invalid Quantity",
        message: "Quantity to drop must be greater than zero",
        statusCode: 400,
      });
    }

    if (quantityToDrop > product.count) {
      await session.abortTransaction();
      return res.status(400).json({
        error: "Insufficient Inventory",
        message: `Cannot drop ${quantityToDrop} units. Only ${product.count} units available`,
        statusCode: 400,
      });
    }

    // Calculate values for the drop record
    const originalQuantity = product.count;
    const remainingQuantity = originalQuantity - quantityToDrop;
    const pricePerUnit = product.price;

    // Create inventory drop record
    const inventoryDrop = new InventoryDrop({
      productId: product._id,
      productName: product.productName,
      category: product.category,
      quantityDropped: quantityToDrop,
      originalQuantity,
      remainingQuantity,
      pricePerUnit,
      reason: reason || "end_of_day",
      notes,
      droppedBy,
      productionDate,
      expirationDate,
      batchId,
    });

    // Save the drop record
    await inventoryDrop.save({ session });

    // Update product inventory
    product.count = remainingQuantity;
    product.lastModified = new Date();

    await product.save({ session });

    // Commit the transaction
    await session.commitTransaction();

    // Populate the response data
    await inventoryDrop.populate([
      { path: "productId", select: "productName category price" },
      { path: "droppedBy", select: "firstName lastName email" },
    ]);

    res.status(201).json({
      message: "Inventory dropped successfully",
      drop: inventoryDrop,
      updatedProduct: {
        id: product._id,
        productName: product.productName,
        previousQuantity: originalQuantity,
        newQuantity: remainingQuantity,
        quantityDropped: quantityToDrop,
      },
      undoInfo: {
        canUndo: inventoryDrop.undoAvailable,
        undoExpiresAt: inventoryDrop.undoExpiresAt,
        timeRemainingMinutes: inventoryDrop.undoTimeRemaining,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error dropping inventory:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to drop inventory",
      statusCode: 500,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Undo an inventory drop (admin/superadmin only)
 * Restores the inventory and marks the drop as undone
 *
 * @async
 * @function undoInventoryDrop
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.dropId - Drop ID to undo
 * @param {Object} req.body - Request body
 * @param {string} [req.body.undoReason] - Reason for undoing the drop
 * @param {Object} req.user - Authenticated user
 * @param {string} req.user.id - User ID performing the undo
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with restored inventory details
 * @throws {404} If drop or product not found
 * @throws {400} If drop cannot be undone (already undone or expired)
 *
 * @description
 * - Can only undo drops within 8-hour window
 * - Restores inventory atomically using MongoDB transaction
 * - Creates audit trail of undo operation
 */
const undoInventoryDrop = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { dropId } = req.params;
    const { undoReason } = req.body;
    const undoneBy = req.user.id;

    // Find the inventory drop
    const inventoryDrop = await InventoryDrop.findById(dropId).session(session);
    if (!inventoryDrop) {
      await session.abortTransaction();
      return res.status(404).json({
        error: "Drop Record Not Found",
        message: "Inventory drop record with the specified ID does not exist",
        statusCode: 404,
      });
    }

    // Check if drop can be undone
    if (!inventoryDrop.canUndo()) {
      await session.abortTransaction();
      return res.status(400).json({
        error: "Cannot Undo Drop",
        message: inventoryDrop.isUndone
          ? "This inventory drop has already been undone"
          : "The undo window for this inventory drop has expired (8 hours)",
        statusCode: 400,
      });
    }

    // Find the product and restore inventory
    const product = await Product.findById(inventoryDrop.productId).session(
      session,
    );
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({
        error: "Product Not Found",
        message: "The product associated with this drop no longer exists",
        statusCode: 404,
      });
    }

    // Restore inventory
    const previousQuantity = product.count;
    product.count += inventoryDrop.quantityDropped;
    product.lastModified = new Date();

    await product.save({ session });

    // Mark drop as undone
    await inventoryDrop.undoDrop(undoneBy, undoReason);

    // Commit the transaction
    await session.commitTransaction();

    // Populate the response data
    await inventoryDrop.populate([
      { path: "productId", select: "productName category price" },
      { path: "droppedBy", select: "firstName lastName" },
      { path: "undoneBy", select: "firstName lastName" },
    ]);

    res.json({
      message: "Inventory drop undone successfully",
      drop: inventoryDrop,
      restoredProduct: {
        id: product._id,
        productName: product.productName,
        previousQuantity,
        newQuantity: product.count,
        quantityRestored: inventoryDrop.quantityDropped,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error undoing inventory drop:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to undo inventory drop",
      statusCode: 500,
    });
  } finally {
    session.endSession();
  }
};

/**
 * List inventory drops with filtering and pagination
 *
 * @async
 * @function listInventoryDrops
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {number} [req.query.page=1] - Page number
 * @param {number} [req.query.limit=10] - Results per page
 * @param {string} [req.query.productId] - Filter by product ID
 * @param {string} [req.query.reason] - Filter by drop reason
 * @param {string} [req.query.droppedBy] - Filter by user who dropped
 * @param {string} [req.query.startDate] - Start date filter
 * @param {string} [req.query.endDate] - End date filter
 * @param {string} [req.query.includeUndone="false"] - Include undone drops
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with drops array and pagination info
 */
const listInventoryDrops = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      productId,
      reason,
      droppedBy,
      startDate,
      endDate,
      includeUndone = "false",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};

    if (productId) {
      filter.productId = productId;
    }
    if (reason) {
      filter.reason = reason;
    }
    if (droppedBy) {
      filter.droppedBy = droppedBy;
    }
    if (includeUndone === "false") {
      filter.isUndone = false;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.droppedAt = {};
      if (startDate) {
        filter.droppedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.droppedAt.$lte = new Date(endDate);
      }
    }

    // Get total count and data
    const [drops, totalCount] = await Promise.all([
      InventoryDrop.find(filter)
        .populate("productId", "productName category price")
        .populate("droppedBy", "firstName lastName")
        .populate("undoneBy", "firstName lastName")
        .sort({ droppedAt: -1 })
        .limit(limitNum)
        .skip(skip),
      InventoryDrop.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      drops,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error listing inventory drops:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve inventory drops",
      statusCode: 500,
    });
  }
};

/**
 * Get drops that can still be undone (within 8-hour window)
 *
 * @async
 * @function getUndoableDrops
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.userId] - Filter by specific user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with undoable drops array
 */
const getUndoableDrops = async (req, res) => {
  try {
    const { userId } = req.query;

    const drops = await InventoryDrop.getUndoableDrops(userId);

    res.json({
      message: `Found ${drops.length} drops that can be undone`,
      undoableDrops: drops,
      currentTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting undoable drops:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve undoable drops",
      statusCode: 500,
    });
  }
};

/**
 * Get inventory drop analytics with cost analysis
 * Returns waste statistics, patterns, and financial impact
 *
 * @async
 * @function getDropAnalytics
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.startDate] - Start date (defaults to 30 days ago)
 * @param {string} [req.query.endDate] - End date (defaults to now)
 * @param {string} [req.query.productId] - Filter by product
 * @param {string} [req.query.reason] - Filter by drop reason
 * @param {string} [req.query.droppedBy] - Filter by user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with comprehensive analytics
 *
 * @description
 * Returns:
 * - Total quantity dropped and value lost
 * - Analytics grouped by reason
 * - Daily summary
 * - Average values and trends
 */
const getDropAnalytics = async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
      endDate = new Date(),
      productId,
      reason,
      droppedBy,
    } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get analytics
    const analytics = await InventoryDrop.getDropAnalytics(start, end, {
      productId,
      reason,
      droppedBy,
    });

    // Get daily summary for the period
    const dailySummary = await InventoryDrop.getDailyDropSummary(end);

    // Calculate totals
    let totalQuantityDropped = 0;
    let totalValueLost = 0;
    let totalDropCount = 0;

    analytics.forEach((reasonGroup) => {
      totalQuantityDropped += reasonGroup.totalQuantityDropped;
      totalValueLost += reasonGroup.totalValueLost;
      totalDropCount += reasonGroup.totalDropCount;
    });

    res.json({
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        durationDays: Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
      },
      summary: {
        totalQuantityDropped,
        totalValueLost: Math.round(totalValueLost * 100) / 100,
        totalDropCount,
        avgValuePerDrop:
          totalDropCount > 0
            ? Math.round((totalValueLost / totalDropCount) * 100) / 100
            : 0,
      },
      analyticsByReason: analytics,
      todaysSummary: dailySummary,
    });
  } catch (error) {
    console.error("Error getting drop analytics:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve drop analytics",
      statusCode: 500,
    });
  }
};

/**
 * Get inventory drop details by ID
 *
 * @async
 * @function getInventoryDropById
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.dropId - Drop ID to retrieve
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with drop details and undo status
 * @throws {404} If drop not found
 */
const getInventoryDropById = async (req, res) => {
  try {
    const { dropId } = req.params;

    const drop = await InventoryDrop.findById(dropId)
      .populate("productId", "productName category price")
      .populate("droppedBy", "firstName lastName email")
      .populate("undoneBy", "firstName lastName email");

    if (!drop) {
      return res.status(404).json({
        error: "Drop Not Found",
        message: "Inventory drop with the specified ID does not exist",
        statusCode: 404,
      });
    }

    res.json({
      drop,
      canUndo: drop.undoAvailable,
      timeRemainingForUndo: drop.undoTimeRemaining,
    });
  } catch (error) {
    console.error("Error getting inventory drop:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve inventory drop",
      statusCode: 500,
    });
  }
};

export {
  dropInventory,
  undoInventoryDrop,
  listInventoryDrops,
  getUndoableDrops,
  getDropAnalytics,
  getInventoryDropById,
};
