import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Import controllers later as needed
// import { getAllUsers, getUserById, ... } from '../controllers/user.controller.js';

// All routes below this use protect middleware
router.use(protect);

// Basic routes to be implemented with their controllers later
router.route("/").get(authorize("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Getting all users - To be implemented",
  });
});

router
  .route("/:id")
  .get(authorize("admin"), (req, res) => {
    res.status(200).json({
      success: true,
      message: `Getting user with id ${req.params.id} - To be implemented`,
    });
  })
  .put(authorize("admin"), (req, res) => {
    res.status(200).json({
      success: true,
      message: `Updating user with id ${req.params.id} - To be implemented`,
    });
  })
  .delete(authorize("admin"), (req, res) => {
    res.status(200).json({
      success: true,
      message: `Deleting user with id ${req.params.id} - To be implemented`,
    });
  });

export default router;
