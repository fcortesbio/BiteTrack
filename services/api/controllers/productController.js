import Product from "../models/Product.js";
import mongoose from "mongoose";

/**
 * List all products in inventory
 *
 * @async
 * @function listProducts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON array of all products
 *
 * @example
 * GET /products
 * Response: [{ _id: "...", productName: "Turkey Sandwich", price: 8.99, count: 25 }]
 */
const listProducts = async (req, res) => {
  const products = await Product.find({});
  res.json(products);
};

/**
 * Create a new product in inventory
 *
 * @async
 * @function createProduct
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.productName - Name of the product
 * @param {string} req.body.description - Product description
 * @param {number} req.body.count - Initial inventory count
 * @param {number} req.body.price - Product price
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with created product (201)
 * @throws {400} If validation fails
 *
 * @example
 * POST /products
 * Body: {
 *   productName: "Turkey Sandwich",
 *   description: "Fresh turkey with lettuce and tomato",
 *   count: 25,
 *   price: 8.99
 * }
 */
const createProduct = async (req, res) => {
  const { productName, description, count, price } = req.body;

  const product = new Product({
    productName,
    description,
    count,
    price,
  });

  await product.save();
  res.status(201).json(product.toJSON());
};

/**
 * Update an existing product
 *
 * @async
 * @function updateProduct
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Product ID to update
 * @param {Object} req.body - Fields to update
 * @param {string} [req.body.productName] - Updated product name
 * @param {string} [req.body.description] - Updated description
 * @param {number} [req.body.count] - Updated inventory count
 * @param {number} [req.body.price] - Updated price
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with updated product
 * @throws {400} If product ID is invalid or validation fails
 * @throws {404} If product not found
 *
 * @example
 * PATCH /products/507f1f77bcf86cd799439011
 * Body: { count: 30, price: 9.99 }
 */
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Invalid product ID format",
      statusCode: 400,
    });
  }

  const product = await Product.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    return res.status(404).json({
      error: "Not Found",
      message: "Product not found",
      statusCode: 404,
    });
  }

  res.json(product.toJSON());
};

/**
 * Delete a product from inventory
 *
 * @async
 * @function deleteProduct
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - Product ID to delete
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Empty response with 204 status
 * @throws {400} If product ID is invalid
 * @throws {404} If product not found
 *
 * @example
 * DELETE /products/507f1f77bcf86cd799439011
 * Response: 204 No Content
 */
const deleteProduct = async (req, res) => {
  const { id } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Invalid product ID format",
      statusCode: 400,
    });
  }

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({
      error: "Not Found",
      message: "Product not found",
      statusCode: 404,
    });
  }

  await Product.deleteOne({ _id: id });
  res.status(204).send();
};

export { listProducts, createProduct, updateProduct, deleteProduct };
