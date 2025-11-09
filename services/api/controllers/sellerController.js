import Seller from "../models/Seller.js";
import PendingSeller from "../models/PendingSeller.js";

const listSellers = async (req, res) => {
  const sellers = await Seller.find({});
  res.json(sellers);
};

const createPendingSeller = async (req, res) => {
  const { firstName, lastName, email, dateOfBirth } = req.body;

  // Check if seller already exists
  const existingSeller = await Seller.findOne({ email });
  if (existingSeller) {
    return res.status(400).json({
      error: "Duplicate Error",
      message: "Seller with this email already exists",
      statusCode: 400,
    });
  }

  // Check if pending seller already exists
  const existingPending = await PendingSeller.findOne({ email });
  if (existingPending) {
    return res.status(400).json({
      error: "Duplicate Error",
      message: "Pending seller with this email already exists",
      statusCode: 400,
    });
  }

  const pendingSeller = new PendingSeller({
    firstName,
    lastName,
    email,
    dateOfBirth: new Date(dateOfBirth),
    createdBy: req.user._id,
  });

  await pendingSeller.save();
  res.status(201).json(pendingSeller.toJSON());
};

const updateSeller = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, dateOfBirth, oldPassword, newPassword } =
    req.body;

  // Verify user can only update their own profile
  if (req.user._id.toString() !== id) {
    return res.status(403).json({
      error: "Forbidden",
      message: "You can only update your own profile",
      statusCode: 403,
    });
  }

  const seller = await Seller.findById(id).select("+password");
  if (!seller) {
    return res.status(404).json({
      error: "Not Found",
      message: "Seller not found",
      statusCode: 404,
    });
  }

  // Check if sensitive fields are being updated
  const sensitiveUpdate =
    email !== undefined ||
    dateOfBirth !== undefined ||
    newPassword !== undefined;

  if (sensitiveUpdate) {
    if (!oldPassword) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Old password required for sensitive updates",
        statusCode: 400,
      });
    }

    const isValidPassword = await seller.comparePassword(oldPassword);
    if (!isValidPassword) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid old password",
        statusCode: 403,
      });
    }

    // Additional verification for email or dateOfBirth changes
    if (email !== undefined || dateOfBirth !== undefined) {
      const currentEmail = email || seller.email;
      const currentDob = dateOfBirth
        ? new Date(dateOfBirth)
        : seller.dateOfBirth;

      // Verify at least one matches current values
      const emailMatches = currentEmail === seller.email;
      const dobMatches = currentDob.getTime() === seller.dateOfBirth.getTime();

      if (!emailMatches && !dobMatches) {
        return res.status(403).json({
          error: "Forbidden",
          message:
            "Must provide current email or date of birth for verification",
          statusCode: 403,
        });
      }
    }
  }

  // Update fields
  if (firstName !== undefined) {
    seller.firstName = firstName;
  }
  if (lastName !== undefined) {
    seller.lastName = lastName;
  }
  if (email !== undefined) {
    seller.email = email;
  }
  if (dateOfBirth !== undefined) {
    seller.dateOfBirth = new Date(dateOfBirth);
  }
  if (newPassword !== undefined) {
    seller.password = newPassword;
  }

  await seller.save();
  res.json(seller.toJSON());
};

const changeRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const seller = await Seller.findById(id);
  if (!seller) {
    return res.status(404).json({
      error: "Not Found",
      message: "Seller not found",
      statusCode: 404,
    });
  }

  seller.role = role;
  await seller.save();

  res.json(seller.toJSON());
};

const listPendingSellers = async (req, res) => {
  const pendingSellers = await PendingSeller.find({})
    .populate("createdBy", "firstName lastName email role")
    .sort({ createdAt: -1 })
    .select("-__v");

  const response = {
    count: pendingSellers.length,
    pendingSellers: pendingSellers.map((seller) => ({
      _id: seller._id,
      firstName: seller.firstName,
      lastName: seller.lastName,
      email: seller.email,
      dateOfBirth: seller.dateOfBirth,
      createdAt: seller.createdAt,
      testingUser: seller.testingUser || false,
      createdBy: seller.createdBy
        ? {
            _id: seller.createdBy._id,
            firstName: seller.createdBy.firstName,
            lastName: seller.createdBy.lastName,
            email: seller.createdBy.email,
            role: seller.createdBy.role,
          }
        : null,
    })),
  };

  res.json(response);
};

const deactivateSeller = async (req, res) => {
  const { id } = req.params;

  const seller = await Seller.findById(id);
  if (!seller) {
    return res.status(404).json({
      error: "Not Found",
      message: "Seller not found",
      statusCode: 404,
    });
  }

  await Seller.deleteOne({ _id: id });
  res.status(204).send();
};

export {
  listSellers,
  listPendingSellers,
  createPendingSeller,
  updateSeller,
  changeRole,
  deactivateSeller,
};
