import mongoose from "mongoose";

const attendeeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0,
      comment: "Duration in minutes",
    },
  },
  { _id: false }
);

const liveClassSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a title for the live class"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add a description for the live class"],
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: {
      type: Date,
      required: [true, "Please specify a start time for the live class"],
    },
    duration: {
      type: Number,
      required: [true, "Please specify the duration in minutes"],
      min: [15, "Duration must be at least 15 minutes"],
      max: [300, "Duration cannot exceed 5 hours"],
    },
    platform: {
      type: String,
      required: true,
      enum: ["zoom", "google_meet"],
      default: "zoom",
    },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "canceled"],
      default: "scheduled",
    },
    attendees: [attendeeSchema],
    meetingLink: {
      type: String,
      required: true,
    },
    meetingId: {
      type: String,
    },
    meetingPassword: {
      type: String,
    },
    zoomMeetingId: {
      type: String,
    },
    zoomHostId: {
      type: String,
    },
    zoomStartUrl: {
      type: String,
    },
    zoomJoinUrl: {
      type: String,
    },
    googleMeetEventId: {
      type: String,
    },
    googleCalendarEventId: {
      type: String,
    },
    isRecorded: {
      type: Boolean,
      default: false,
    },
    recordingUrl: {
      type: String,
    },
    recordingPassword: {
      type: String,
    },
    materials: [
      {
        title: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    remindersSent: [
      {
        type: {
          type: String,
          enum: ["24h", "1h", "15min"],
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Add index on upcoming classes for better query performance
liveClassSchema.index({ course: 1, startTime: 1, status: 1 });

// Add virtual for checking if the class is upcoming
liveClassSchema.virtual("isUpcoming").get(function () {
  return this.startTime > new Date() && this.status === "scheduled";
});

// Add virtual for checking if the class is ongoing
liveClassSchema.virtual("isOngoing").get(function () {
  const now = new Date();
  const endTime = new Date(this.startTime);
  endTime.setMinutes(endTime.getMinutes() + this.duration);

  return (
    this.status === "in_progress" ||
    (now >= this.startTime && now <= endTime && this.status === "scheduled")
  );
});

// Enable virtuals in JSON
liveClassSchema.set("toJSON", { virtuals: true });
liveClassSchema.set("toObject", { virtuals: true });

const LiveClass = mongoose.model("LiveClass", liveClassSchema);

export default LiveClass;
