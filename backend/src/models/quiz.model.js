import mongoose from "mongoose";

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a quiz title"],
      trim: true,
      maxlength: [100, "Quiz title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Quiz description cannot be more than 500 characters"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    moduleIndex: {
      type: Number,
      required: true,
    },
    timeLimit: {
      type: Number, // Time limit in minutes
      default: 30,
    },
    passingScore: {
      type: Number, // Percentage required to pass
      default: 70,
      min: [0, "Passing score cannot be negative"],
      max: [100, "Passing score cannot exceed 100"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    questions: [
      {
        questionText: {
          type: String,
          required: true,
        },
        questionType: {
          type: String,
          enum: ["multiple-choice", "true-false", "short-answer"],
          default: "multiple-choice",
        },
        options: [String],
        correctAnswer: {
          type: mongoose.Schema.Types.Mixed, // Can be number (index) or string (for short answer)
          required: true,
        },
        points: {
          type: Number,
          default: 1,
        },
        explanation: String,
      },
    ],
    attempts: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        score: {
          type: Number,
          required: true,
        },
        maxScore: {
          type: Number,
          required: true,
        },
        passed: {
          type: Boolean,
          default: false,
        },
        answers: [
          {
            questionIndex: Number,
            givenAnswer: mongoose.Schema.Types.Mixed,
            isCorrect: Boolean,
            pointsEarned: Number,
          },
        ],
        startedAt: {
          type: Date,
          default: Date.now,
        },
        completedAt: {
          type: Date,
        },
        timeSpent: {
          type: Number, // Time spent in seconds
          default: 0,
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

// Calculate total points for a quiz
quizSchema.virtual("totalPoints").get(function () {
  return this.questions.reduce((total, question) => total + question.points, 0);
});

// Calculate average score
quizSchema.virtual("averageScore").get(function () {
  if (this.attempts.length === 0) return 0;

  const totalScore = this.attempts.reduce(
    (sum, attempt) => sum + attempt.score,
    0
  );
  return Math.round((totalScore / this.attempts.length) * 100) / 100;
});

const Quiz = mongoose.model("Quiz", quizSchema);

export default Quiz;
