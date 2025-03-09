import mongoose from "mongoose";

const notesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a title for the notes"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add a description for the notes"],
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    topic: {
      type: String,
      required: [true, "Please specify a topic for the notes"],
      trim: true,
    },
    fileUrl: {
      type: String,
      required: [true, "Please provide a file URL"],
    },
    fileType: {
      type: String,
      enum: ["pdf", "doc", "ppt", "image", "video", "other"],
      default: "pdf",
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // in bytes
      required: true,
    },
    publicId: {
      type: String, // Cloudinary public ID
      required: true,
    },
    tags: [String], // For better searchability
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    visibility: {
      type: String,
      enum: ["public", "enrolled_students", "private"],
      default: "enrolled_students",
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastAccessed: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add indexes to improve search performance
notesSchema.index({
  title: "text",
  description: "text",
  topic: "text",
  tags: "text",
});
notesSchema.index({ course: 1, topic: 1 });
notesSchema.index({ createdBy: 1 });

// Virtual for the file extension
notesSchema.virtual("fileExtension").get(function () {
  if (this.fileName) {
    const parts = this.fileName.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  }
  return "";
});

// Format size to human-readable
notesSchema.virtual("formattedSize").get(function () {
  const bytes = this.fileSize;
  if (bytes < 1024) return bytes + " bytes";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
  else return (bytes / 1073741824).toFixed(2) + " GB";
});

const Notes = mongoose.model("Notes", notesSchema);

export default Notes;
