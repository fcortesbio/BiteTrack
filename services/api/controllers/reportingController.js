import Sale from "../models/Sale.js";
import csv from "fast-csv";

/**
 * Generate comprehensive sales analytics for a given time period
 * Includes totals, averages, top products, customer analytics, etc.
 */
const getSalesAnalytics = async (req, res) => {
  const {
    startDate,
    endDate,
    dateField = "createdAt",
    groupBy = "day", // day, week, month, year
  } = req.query;

  // Build date filter - use originalCreatedAt when available, fallback to createdAt
  const dateFilter = {};
  if (startDate || endDate) {
    const filter = [];

    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          error: "Bad Request",
          message:
            "Invalid startDate format. Use YYYY-MM-DD or ISO 8601 format",
          statusCode: 400,
        });
      }
      start.setUTCHours(0, 0, 0, 0);
      filter.push({
        $gte: [{ $ifNull: ["$originalCreatedAt", `$${dateField}`] }, start],
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid endDate format. Use YYYY-MM-DD or ISO 8601 format",
          statusCode: 400,
        });
      }
      end.setUTCHours(23, 59, 59, 999);
      filter.push({
        $lte: [{ $ifNull: ["$originalCreatedAt", `$${dateField}`] }, end],
      });
    }

    if (filter.length > 0) {
      dateFilter.$expr = filter.length === 1 ? filter[0] : { $and: filter };
    }
  }

  // Parallel execution of analytics queries
  const [
    basicStats,
    timeSeriesData,
    topProducts,
    customerStats,
    settlementStats,
  ] = await Promise.all([
    // Basic sales statistics
    Sale.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          totalAmountPaid: { $sum: "$amountPaid" },
          averageOrderValue: { $avg: "$totalAmount" },
          averageItemsPerOrder: { $avg: { $size: "$products" } },
        },
      },
    ]),

    // Time series data for trend analysis
    Sale.aggregate([
      { $match: dateFilter },
      {
        $addFields: {
          effectiveDate: { $ifNull: ["$originalCreatedAt", `$${dateField}`] },
        },
      },
      {
        $group: {
          _id: getGroupByDateExpression(groupBy, "$effectiveDate"),
          salesCount: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Top products by quantity and revenue
    Sale.aggregate([
      { $match: dateFilter },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalQuantitySold: { $sum: "$products.quantity" },
          totalRevenue: {
            $sum: {
              $multiply: ["$products.quantity", "$products.priceAtSale"],
            },
          },
          salesCount: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          productName: "$product.productName",
          currentPrice: "$product.price",
          totalQuantitySold: 1,
          totalRevenue: 1,
          salesCount: 1,
          averagePrice: { $divide: ["$totalRevenue", "$totalQuantitySold"] },
        },
      },
    ]),

    // Customer analytics
    Sale.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$customerId",
          totalSpent: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
      {
        $group: {
          _id: null,
          uniqueCustomers: { $sum: 1 },
          averageCustomerSpent: { $avg: "$totalSpent" },
          averageOrdersPerCustomer: { $avg: "$orderCount" },
        },
      },
    ]),

    // Settlement statistics
    Sale.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$settled",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$amountPaid" },
        },
      },
    ]),
  ]);

  // Format the response
  const analytics = {
    period: {
      startDate: startDate || null,
      endDate: endDate || null,
      dateField,
      groupBy,
    },
    summary: basicStats[0] || {
      totalSales: 0,
      totalRevenue: 0,
      totalAmountPaid: 0,
      averageOrderValue: 0,
      averageItemsPerOrder: 0,
    },
    timeSeries: timeSeriesData,
    topProducts,
    customerAnalytics: customerStats[0] || {
      uniqueCustomers: 0,
      averageCustomerSpent: 0,
      averageOrdersPerCustomer: 0,
    },
    paymentAnalytics: {
      settled: settlementStats.find((s) => s._id === true) || {
        count: 0,
        totalAmount: 0,
        totalPaid: 0,
      },
      unsettled: settlementStats.find((s) => s._id === false) || {
        count: 0,
        totalAmount: 0,
        totalPaid: 0,
      },
    },
  };

  res.json(analytics);
};

/**
 * Export sales data as CSV
 * Supports various export formats and filtering options
 */
const exportSalesCSV = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      dateField = "createdAt",
      format = "detailed", // detailed, summary, products
      customerId,
      sellerId,
      settled,
    } = req.query;

    // Build filter for sales query
    const filter = {};

    // Date filtering
    if (startDate || endDate) {
      const dateFilter = {};

      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({
            error: "Bad Request",
            message: "Invalid startDate format",
            statusCode: 400,
          });
        }
        start.setUTCHours(0, 0, 0, 0);
        dateFilter.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({
            error: "Bad Request",
            message: "Invalid endDate format",
            statusCode: 400,
          });
        }
        end.setUTCHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }

      filter[dateField] = dateFilter;
    }

    // Additional filters
    if (customerId) {
      filter.customerId = customerId;
    }
    if (sellerId) {
      filter.sellerId = sellerId;
    }
    if (settled !== undefined) {
      filter.settled = settled === "true";
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `bitetrack-sales-${format}-${timestamp}.csv`;

    // Set response headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Stream CSV data based on format
    if (format === "detailed") {
      await exportDetailedSalesCSV(filter, res);
    } else if (format === "summary") {
      await exportSummaryCSV(filter, res);
    } else if (format === "products") {
      await exportProductsCSV(filter, res);
    } else {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid format. Use: detailed, summary, or products",
        statusCode: 400,
      });
    }
  } catch (error) {
    console.error("CSV Export Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to generate CSV export",
        statusCode: 500,
      });
    }
  }
};

/**
 * Helper function to export detailed sales data as CSV
 */
const exportDetailedSalesCSV = async (filter, res) => {
  const csvStream = csv.format({ headers: true });
  csvStream.pipe(res);

  try {
    const sales = await Sale.find(filter)
      .populate("customerId", "firstName lastName email")
      .populate("sellerId", "firstName lastName")
      .populate("products.productId", "productName")
      .sort({ createdAt: -1 });

    for (const sale of sales) {
      // Create a row for each product in the sale
      for (const product of sale.products) {
        csvStream.write({
          "Sale ID": sale._id.toString(),
          Date: sale.createdAt.toISOString().split("T")[0],
          Time: sale.createdAt.toTimeString().split(" ")[0],
          "Customer Name": sale.customerId
            ? `${sale.customerId.firstName} ${sale.customerId.lastName}`
            : "Unknown Customer",
          "Customer Email": sale.customerId ? sale.customerId.email : "N/A",
          "Seller Name": sale.sellerId
            ? `${sale.sellerId.firstName} ${sale.sellerId.lastName}`
            : "Unknown Seller",
          "Product Name": product.productId
            ? product.productId.productName
            : "Unknown Product",
          Quantity: product.quantity,
          "Unit Price": product.priceAtSale.toFixed(2),
          "Line Total": (product.quantity * product.priceAtSale).toFixed(2),
          "Sale Total": sale.totalAmount.toFixed(2),
          "Amount Paid": sale.amountPaid.toFixed(2),
          "Balance Due": (sale.totalAmount - sale.amountPaid).toFixed(2),
          Settled: sale.settled ? "Yes" : "No",
        });
      }
    }

    csvStream.end();
  } catch (error) {
    csvStream.destroy(error);
    throw error;
  }
};

/**
 * Helper function to export summary sales data as CSV
 */
const exportSummaryCSV = async (filter, res) => {
  const csvStream = csv.format({ headers: true });
  csvStream.pipe(res);

  try {
    const sales = await Sale.find(filter)
      .populate("customerId", "firstName lastName email")
      .populate("sellerId", "firstName lastName")
      .sort({ createdAt: -1 });

    for (const sale of sales) {
      csvStream.write({
        "Sale ID": sale._id.toString(),
        Date: sale.createdAt.toISOString().split("T")[0],
        Time: sale.createdAt.toTimeString().split(" ")[0],
        "Customer Name": sale.customerId
          ? `${sale.customerId.firstName} ${sale.customerId.lastName}`
          : "Unknown Customer",
        "Customer Email": sale.customerId ? sale.customerId.email : "N/A",
        "Seller Name": sale.sellerId
          ? `${sale.sellerId.firstName} ${sale.sellerId.lastName}`
          : "Unknown Seller",
        "Items Count": sale.products.length,
        "Total Amount": sale.totalAmount.toFixed(2),
        "Amount Paid": sale.amountPaid.toFixed(2),
        "Balance Due": (sale.totalAmount - sale.amountPaid).toFixed(2),
        Settled: sale.settled ? "Yes" : "No",
      });
    }

    csvStream.end();
  } catch (error) {
    csvStream.destroy(error);
    throw error;
  }
};

/**
 * Helper function to export product performance data as CSV
 */
const exportProductsCSV = async (filter, res) => {
  const csvStream = csv.format({ headers: true });
  csvStream.pipe(res);

  try {
    const productStats = await Sale.aggregate([
      { $match: filter },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalQuantitySold: { $sum: "$products.quantity" },
          totalRevenue: {
            $sum: {
              $multiply: ["$products.quantity", "$products.priceAtSale"],
            },
          },
          salesCount: { $sum: 1 },
          averagePrice: { $avg: "$products.priceAtSale" },
          minPrice: { $min: "$products.priceAtSale" },
          maxPrice: { $max: "$products.priceAtSale" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $sort: { totalRevenue: -1 } },
    ]);

    for (const stat of productStats) {
      csvStream.write({
        "Product Name": stat.product.productName,
        "Current Price": stat.product.price.toFixed(2),
        "Total Quantity Sold": stat.totalQuantitySold,
        "Number of Sales": stat.salesCount,
        "Total Revenue": stat.totalRevenue.toFixed(2),
        "Average Sale Price": stat.averagePrice.toFixed(2),
        "Minimum Sale Price": stat.minPrice.toFixed(2),
        "Maximum Sale Price": stat.maxPrice.toFixed(2),
        "Revenue per Unit": (
          stat.totalRevenue / stat.totalQuantitySold
        ).toFixed(2),
      });
    }

    csvStream.end();
  } catch (error) {
    csvStream.destroy(error);
    throw error;
  }
};

/**
 * Helper function to create MongoDB date grouping expressions
 */
const getGroupByDateExpression = (groupBy, dateField) => {
  switch (groupBy) {
    case "hour":
      return {
        year: { $year: dateField },
        month: { $month: dateField },
        day: { $dayOfMonth: dateField },
        hour: { $hour: dateField },
      };
    case "day":
      return {
        year: { $year: dateField },
        month: { $month: dateField },
        day: { $dayOfMonth: dateField },
      };
    case "week":
      return {
        year: { $year: dateField },
        week: { $week: dateField },
      };
    case "month":
      return {
        year: { $year: dateField },
        month: { $month: dateField },
      };
    case "year":
      return { year: { $year: dateField } };
    default:
      return {
        year: { $year: dateField },
        month: { $month: dateField },
        day: { $dayOfMonth: dateField },
      };
  }
};

export { getSalesAnalytics, exportSalesCSV };
