import express from "express";
import {
  getDiscussion,
  updateDiscussion,
  deleteDiscussion,
  addReply,
  togglePinDiscussion,
} from "../controllers/discussion.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes below this are protected
router.use(protect);

// Get single discussion
router.get("/:id", getDiscussion);

// Update discussion - author only
router.put("/:id", updateDiscussion);

// Delete discussion - author or teacher only
router.delete("/:id", deleteDiscussion);

// Add reply to discussion
router.post("/:id/replies", addReply);

// Pin/unpin discussion - teachers only
router.put("/:id/pin", authorize("teacher", "admin"), togglePinDiscussion);

export default router;
