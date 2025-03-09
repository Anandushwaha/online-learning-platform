import express from "express";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getNotificationCount,
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes below this are protected
router.use(protect);

// Get all notifications for user
router.get("/", getUserNotifications);

// Get unread notification count
router.get("/count", getNotificationCount);

// Mark all notifications as read
router.put("/read-all", markAllNotificationsRead);

// Mark a single notification as read
router.put("/:id/read", markNotificationRead);

// Delete a notification
router.delete("/:id", deleteNotification);

export default router;
