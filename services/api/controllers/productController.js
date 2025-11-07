import Product from '../models/Product.js';
import mongoose from 'mongoose';

const listProducts = async(req, res) => {
  const products = await Product.find({});
  res.json(products);
};

const createProduct = async(req, res) => {
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

const updateProduct = async(req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid product ID format',
      statusCode: 400,
    });
  }

  const product = await Product.findByIdAndUpdate(
    id,
    updates,
    { new: true, runValidators: true },
  );

  if (!product) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Product not found',
      statusCode: 404,
    });
  }

  res.json(product.toJSON());
};

const deleteProduct = async(req, res) => {
  const { id } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid product ID format',
      statusCode: 400,
    });
  }

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Product not found',
      statusCode: 404,
    });
  }

  await Product.deleteOne({ _id: id });
  res.status(204).send();
};

export {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
