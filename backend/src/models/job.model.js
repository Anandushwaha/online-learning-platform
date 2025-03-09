import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a job title"],
      trim: true,
      maxlength: [100, "Job title cannot be more than 100 characters"],
    },
    company: {
      type: String,
      required: [true, "Please add a company name"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Please add a job location"],
    },
    type: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship", "Remote"],
      required: [true, "Please specify job type"],
    },
    description: {
      type: String,
      required: [true, "Please add a job description"],
    },
    requirements: {
      type: String,
      required: [true, "Please add job requirements"],
    },
    salary: {
      type: String,
      default: "Not specified",
    },
    applicationLink: {
      type: String,
      required: [true, "Please add an application link"],
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applications: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        appliedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    expiresAt: {
      type: Date,
      required: [true, "Please add an expiry date"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      required: [true, "Please add a job category"],
      enum: [
        "Web Development",
        "Mobile Development",
        "Data Science",
        "Machine Learning",
        "DevOps",
        "UI/UX Design",
        "Project Management",
        "Digital Marketing",
        "Other",
      ],
    },
    skills: [String],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for job search
jobSchema.index({
  title: "text",
  company: "text",
  description: "text",
  requirements: "text",
  location: "text",
  type: "text",
  category: "text",
});

const Job = mongoose.model("Job", jobSchema);

export default Job;
