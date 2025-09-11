const Customer = require('../models/Customer');

const listCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({});
    res.json(customers);
  } catch (error) {
    throw error;
  }
};

const createCustomer = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, email } = req.body;

    const customer = new Customer({
      firstName,
      lastName,
      phoneNumber,
      email: email || undefined // Convert empty string to undefined for sparse index
    });

    await customer.save();
    res.status(201).json(customer.toJSON());
  } catch (error) {
    throw error;
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Convert empty email to undefined for sparse index
    if (updates.email === '') {
      updates.email = undefined;
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Customer not found',
        statusCode: 404
      });
    }

    res.json(customer.toJSON());
  } catch (error) {
    throw error;
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Customer not found',
        statusCode: 404
      });
    }

    await Customer.deleteOne({ _id: id });
    res.status(204).send();
  } catch (error) {
    throw error;
  }
};

module.exports = {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer
};