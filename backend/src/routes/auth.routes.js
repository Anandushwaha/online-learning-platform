import express from "express";
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  updatePassword,
  updateProfilePicture,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import {
  validateRegistration,
  validateLogin,
  validateUpdateProfile,
  validateUpdatePassword,
  validateForgotPassword,
  validateResetPassword,
} from "../middleware/validator.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", validateRegistration, register);
router.post("/login", validateLogin, login);
router.post("/forgotpassword", validateForgotPassword, forgotPassword);
router.put("/resetpassword/:resettoken", validateResetPassword, resetPassword);

// Protected routes
router.get("/me", protect, getMe);
router.put("/updateprofile", protect, validateUpdateProfile, updateProfile);
router.put("/updatepassword", protect, validateUpdatePassword, updatePassword);
router.put("/updateprofilepicture", protect, updateProfilePicture);

export default router;
