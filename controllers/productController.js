const Product = require('../models/Product');

const listProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    throw error;
  }
};

const createProduct = async (req, res) => {
  try {
    const { productName, description, count, price } = req.body;

    const product = new Product({
      productName,
      description,
      count,
      price
    });

    await product.save();
    res.status(201).json(product.toJSON());
  } catch (error) {
    throw error;
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
        statusCode: 404
      });
    }

    res.json(product.toJSON());
  } catch (error) {
    throw error;
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
        statusCode: 404
      });
    }

    await Product.deleteOne({ _id: id });
    res.status(204).send();
  } catch (error) {
    throw error;
  }
};

module.exports = {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct
};