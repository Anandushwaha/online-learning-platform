import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add an assignment title"],
      trim: true,
      maxlength: [100, "Assignment title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add an assignment description"],
      maxlength: [2000, "Description cannot be more than 2000 characters"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    dueDate: {
      type: Date,
      required: [true, "Please add a due date"],
    },
    points: {
      type: Number,
      required: [true, "Please add points for this assignment"],
      min: [0, "Points cannot be negative"],
    },
    instructions: {
      type: String,
      required: [true, "Please add instructions for the assignment"],
    },
    attachments: [
      {
        filename: String,
        fileUrl: String,
        fileType: String,
      },
    ],
    submissions: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        submissionUrl: String,
        submissionText: String,
        submittedAt: {
          type: Date,
          default: Date.now,
        },
        grade: {
          score: {
            type: Number,
            default: null,
          },
          feedback: String,
          gradedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          gradedAt: Date,
        },
        status: {
          type: String,
          enum: ["submitted", "late", "graded"],
          default: "submitted",
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

// Pre-save hook to check if submission is late
assignmentSchema.pre("save", function (next) {
  if (this.isModified("submissions")) {
    this.submissions.forEach((submission) => {
      if (
        submission.submittedAt > this.dueDate &&
        submission.status === "submitted"
      ) {
        submission.status = "late";
      }
    });
  }
  next();
});

const Assignment = mongoose.model("Assignment", assignmentSchema);

export default Assignment;
