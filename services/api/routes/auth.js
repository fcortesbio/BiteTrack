import express from "express";
const router = express.Router();
import { authenticate, authorize } from "../middleware/auth.js";
import { validationRules, validate } from "../utils/validation.js";
import {
  login,
  activate,
  recover,
  requestRecovery,
  reset,
  getSellerByEmail,
} from "../controllers/authController.js";

// Public routes
router.post("/login", validationRules.login, validate, login);
router.post("/activate", validationRules.activate, validate, activate);
router.post(
  "/request-recovery",
  validationRules.requestRecovery,
  validate,
  requestRecovery,
);
router.post("/reset", validationRules.resetPassword, validate, reset);
router.get(
  "/seller-status",
  validationRules.getSellerByEmail,
  validate,
  getSellerByEmail,
);

// Protected routes
router.post("/recover", authenticate, authorize("superadmin"), recover);

export default router;
