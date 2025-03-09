import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: [
        "new_announcement",
        "new_assignment",
        "assignment_graded",
        "live_class_scheduled",
        "course_enrolled",
        "new_discussion",
        "discussion_reply",
        "job_application_update",
        "system",
      ],
      required: true,
    },
    title: {
      type: String,
      required: [true, "Please add a notification title"],
    },
    message: {
      type: String,
      required: [true, "Please add a notification message"],
    },
    read: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      default: "#",
    },
    relatedId: {
      // Reference to related entity (course ID, assignment ID, etc.)
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient user notification queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
