const Seller = require("../models/Seller");
const PendingSeller = require("../models/PendingSeller");
const PasswordResetToken = require("../models/PasswordResetToken");
const { generateToken, generateResetToken } = require("../utils/jwt");

const getSellerByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    // First, check for an active account in sellers collection
    const activeSeller = await Seller.findOne({ email });

    if (activeSeller) {
      return res.json({
        email: activeSeller.email,
        status: "active",
      });
    }

    // If no active account, check for pending account
    const pendingSeller = await PendingSeller.findOne({
      email,
      activatedAt: null,
    });

    if (pendingSeller) {
      return res.json({
        email: pendingSeller.email,
        status: "pending",
      });
    }

    // No account found in either collection
    return res.status(404).json({
      error: "Not Found",
      message: "No account found for this email address",
      statusCode: 404,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in getSellerByEmail:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while retrieving seller information",
      statusCode: 500,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find seller with password field included
    const seller = await Seller.findOne({ email }).select("+password");

    if (!seller || !(await seller.comparePassword(password))) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
        statusCode: 401,
      });
    }

    const token = generateToken({ id: seller._id, role: seller.role });

    // Remove password from response
    const sellerResponse = seller.toJSON();

    res.json({
      token,
      seller: sellerResponse,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in login:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred during login",
      statusCode: 500,
    });
  }
};

const activate = async (req, res) => {
  try {
    const { email, dateOfBirth, lastName, password } = req.body;

    // Find pending seller
    const pendingSeller = await PendingSeller.findOne({
      email,
      dateOfBirth: new Date(dateOfBirth),
      lastName,
      activatedAt: null,
    });

    if (!pendingSeller) {
      return res.status(404).json({
        error: "Not Found",
        message: "Pending seller not found or already activated",
        statusCode: 404,
      });
    }

    // Create activated seller
    const seller = new Seller({
      firstName: pendingSeller.firstName,
      lastName: pendingSeller.lastName,
      email: pendingSeller.email,
      dateOfBirth: pendingSeller.dateOfBirth,
      password,
      role: "user",
      createdBy: pendingSeller.createdBy,
    });

    await seller.save();

    // Mark pending seller as activated
    pendingSeller.activatedAt = new Date();
    await pendingSeller.save();

    res.status(201).json(seller.toJSON());
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in activate:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred during account activation",
      statusCode: 500,
    });
  }
};

const recover = async (req, res) => {
  try {
    const { sellerId } = req.body;

    // Verify seller exists
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        error: "Not Found",
        message: "Seller not found",
        statusCode: 404,
      });
    }

    // Generate reset token
    const token = generateResetToken();
    const resetToken = new PasswordResetToken({
      token,
      sellerId,
    });

    await resetToken.save();

    res.json({
      token,
      sellerId,
      expiresAt: resetToken.expiresAt,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in recover:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred during password recovery",
      statusCode: 500,
    });
  }
};

const reset = async (req, res) => {
  try {
    const { token, email, dateOfBirth, newPassword } = req.body;

    // Find valid reset token
    const resetToken = await PasswordResetToken.findOne({
      token,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      return res.status(400).json({
        error: "Invalid Token",
        message: "Reset token is invalid or expired",
        statusCode: 400,
      });
    }

    // Verify seller details
    const seller = await Seller.findOne({
      _id: resetToken.sellerId,
      email,
      dateOfBirth: new Date(dateOfBirth),
    }).select("+password");

    if (!seller) {
      return res.status(400).json({
        error: "Invalid Details",
        message: "Seller details do not match",
        statusCode: 400,
      });
    }

    // Update password
    seller.password = newPassword;
    await seller.save();

    // Delete used token
    await PasswordResetToken.deleteOne({ _id: resetToken._id });

    res.json({
      message: "Password reset successful",
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in reset:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred during password reset",
      statusCode: 500,
    });
  }
};

module.exports = {
  login,
  activate,
  recover,
  reset,
  getSellerByEmail,
};
