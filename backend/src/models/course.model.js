import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a course title"],
      trim: true,
      maxlength: [100, "Course title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add a course description"],
      maxlength: [2000, "Description cannot be more than 2000 characters"],
    },
    category: {
      type: String,
      required: [true, "Please add a category"],
      enum: [
        "Web Development",
        "Mobile Development",
        "Data Science",
        "Machine Learning",
        "DevOps",
        "UI/UX Design",
        "Other",
      ],
    },
    thumbnail: {
      type: String,
      default: "default-course.jpg",
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    enrollmentRequiresApproval: {
      type: Boolean,
      default: false,
    },
    students: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        enrollmentStatus: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "approved",
        },
        progress: {
          completedModules: [Number],
          completedLessons: [String],
          quizScores: [
            {
              quizId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Quiz",
              },
              score: Number,
              maxScore: Number,
              completedAt: {
                type: Date,
                default: Date.now,
              },
            },
          ],
          completionPercentage: {
            type: Number,
            default: 0,
          },
          lastAccessedAt: {
            type: Date,
            default: Date.now,
          },
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    modules: [
      {
        title: String,
        description: String,
        order: {
          type: Number,
          required: true,
        },
        materials: [
          {
            title: String,
            description: String,
            fileUrl: String,
            fileType: {
              type: String,
              enum: ["pdf", "doc", "video", "link", "quiz", "other"],
            },
            isRequired: {
              type: Boolean,
              default: true,
            },
            duration: Number, // duration in minutes for videos
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
    quizzes: [
      {
        title: String,
        description: String,
        moduleId: Number,
        timeLimit: Number, // in minutes
        passingScore: {
          type: Number,
          default: 70,
        },
        questions: [
          {
            question: String,
            options: [String],
            correctAnswer: Number, // index of correct option
            points: {
              type: Number,
              default: 1,
            },
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    liveClasses: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        startTime: {
          type: Date,
          required: true,
        },
        duration: {
          type: Number, // Duration in minutes
          required: true,
        },
        meetingLink: String,
        recordingUrl: String,
        isRecorded: {
          type: Boolean,
          default: false,
        },
        attendees: [
          {
            student: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            joinedAt: Date,
            leftAt: Date,
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    announcements: [
      {
        title: {
          type: String,
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    totalDuration: {
      type: Number, // Total course duration in minutes
      default: 0,
    },
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    prerequisites: [String],
    learningOutcomes: [String],
    price: {
      type: Number,
      default: 0, // Free by default
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for assignments related to this course
courseSchema.virtual("assignments", {
  ref: "Assignment",
  localField: "_id",
  foreignField: "course",
  justOne: false,
});

// Method to calculate a student's progress in the course
courseSchema.methods.calculateStudentProgress = async function (studentId) {
  const studentIndex = this.students.findIndex(
    (s) => s.student.toString() === studentId.toString()
  );

  if (studentIndex === -1) return 0;

  const student = this.students[studentIndex];

  // Count total required items
  let totalRequiredItems = 0;
  let completedItems = 0;

  // Count required materials
  this.modules.forEach((module) => {
    module.materials.forEach((material) => {
      if (material.isRequired) {
        totalRequiredItems++;

        // Check if material is completed
        if (
          student.progress.completedLessons.includes(material._id.toString())
        ) {
          completedItems++;
        }
      }
    });
  });

  // Count required quizzes
  this.quizzes.forEach((quiz) => {
    totalRequiredItems++;

    // Check if quiz is completed
    const quizScore = student.progress.quizScores.find(
      (score) => score.quizId.toString() === quiz._id.toString()
    );

    if (quizScore && quizScore.score >= quiz.passingScore) {
      completedItems++;
    }
  });

  // Calculate percentage
  const percentage =
    totalRequiredItems > 0
      ? Math.round((completedItems / totalRequiredItems) * 100)
      : 0;

  // Update student progress
  this.students[studentIndex].progress.completionPercentage = percentage;
  await this.save();

  return percentage;
};

const Course = mongoose.model("Course", courseSchema);

export default Course;
