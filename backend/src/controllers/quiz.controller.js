import Quiz from "../models/quiz.model.js";
import Course from "../models/course.model.js";
import Notification from "../models/notification.model.js";

/**
 * @desc    Create a new quiz
 * @route   POST /api/courses/:courseId/quizzes
 * @access  Private (Teacher/Admin only)
 */
export const createQuiz = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user is the instructor of the course
    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create quizzes for this course",
      });
    }

    // Create quiz
    const quiz = await Quiz.create({
      ...req.body,
      course: courseId,
    });

    // Notify enrolled students
    const approvedStudents = course.students
      .filter((s) => s.enrollmentStatus === "approved")
      .map((s) => s.student);

    const notifications = approvedStudents.map((student) => ({
      recipient: student,
      sender: req.user.id,
      type: "new_quiz",
      title: "New Quiz Available",
      message: `A new quiz "${req.body.title}" has been added to "${course.title}"`,
      link: `/courses/${courseId}/quizzes/${quiz._id}`,
      relatedId: quiz._id,
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating quiz",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all quizzes for a course
 * @route   GET /api/courses/:courseId/quizzes
 * @access  Private
 */
export const getCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user is enrolled in the course or is the instructor
    const isInstructor = course.instructor.toString() === req.user.id;
    const isEnrolled = course.students.some(
      (s) =>
        s.student.toString() === req.user.id &&
        s.enrollmentStatus === "approved"
    );

    if (!isInstructor && !isEnrolled && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access quizzes for this course",
      });
    }

    // Get quizzes
    const quizzes = await Quiz.find({ course: courseId });

    // If student, filter out some data they shouldn't see
    if (!isInstructor && req.user.role !== "admin") {
      // Remove correct answers for quizzes they haven't completed
      quizzes.forEach((quiz) => {
        const studentAttempt = quiz.attempts.find(
          (attempt) => attempt.student.toString() === req.user.id
        );

        // If no attempt or incomplete attempt, hide answers
        if (!studentAttempt || !studentAttempt.completedAt) {
          quiz.questions.forEach((question) => {
            question.correctAnswer = undefined;
          });
        }
      });
    }

    res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving quizzes",
      error: error.message,
    });
  }
};

/**
 * @desc    Get a single quiz
 * @route   GET /api/quizzes/:id
 * @access  Private
 */
export const getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check if user has access to the quiz
    const course = await Course.findById(quiz.course);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Associated course not found",
      });
    }

    const isInstructor = course.instructor.toString() === req.user.id;
    const isEnrolled = course.students.some(
      (s) =>
        s.student.toString() === req.user.id &&
        s.enrollmentStatus === "approved"
    );

    if (!isInstructor && !isEnrolled && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this quiz",
      });
    }

    // If student, hide correct answers if they haven't completed the quiz
    if (!isInstructor && req.user.role !== "admin") {
      const studentAttempt = quiz.attempts.find(
        (attempt) =>
          attempt.student.toString() === req.user.id && attempt.completedAt
      );

      if (!studentAttempt) {
        quiz.questions.forEach((question) => {
          question.correctAnswer = undefined;
        });
      }
    }

    res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving quiz",
      error: error.message,
    });
  }
};

/**
 * @desc    Update a quiz
 * @route   PUT /api/quizzes/:id
 * @access  Private (Teacher/Admin only)
 */
export const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check if user is the instructor of the course
    const course = await Course.findById(quiz.course);

    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this quiz",
      });
    }

    // Only allow updating if no attempts have been made
    if (quiz.attempts.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot update quiz after students have attempted it",
      });
    }

    // Update quiz
    const updatedQuiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: updatedQuiz,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating quiz",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a quiz
 * @route   DELETE /api/quizzes/:id
 * @access  Private (Teacher/Admin only)
 */
export const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check if user is the instructor of the course
    const course = await Course.findById(quiz.course);

    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this quiz",
      });
    }

    // Only allow deletion if no attempts have been made
    if (quiz.attempts.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete quiz after students have attempted it",
      });
    }

    await quiz.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting quiz",
      error: error.message,
    });
  }
};

/**
 * @desc    Start a quiz attempt
 * @route   POST /api/quizzes/:id/attempt
 * @access  Private (Student only)
 */
export const startQuizAttempt = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check if user is enrolled in the course
    const course = await Course.findById(quiz.course);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Associated course not found",
      });
    }

    const isEnrolled = course.students.some(
      (s) =>
        s.student.toString() === req.user.id &&
        s.enrollmentStatus === "approved"
    );

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to attempt this quiz",
      });
    }

    // Check if quiz is active
    if (!quiz.isActive) {
      return res.status(400).json({
        success: false,
        message: "This quiz is not currently active",
      });
    }

    // Check if student already has an incomplete attempt
    const existingAttempt = quiz.attempts.find(
      (attempt) =>
        attempt.student.toString() === req.user.id && !attempt.completedAt
    );

    if (existingAttempt) {
      return res.status(200).json({
        success: true,
        message: "Continuing existing attempt",
        data: existingAttempt,
      });
    }

    // Create new attempt
    quiz.attempts.push({
      student: req.user.id,
      score: 0,
      maxScore: quiz.questions.reduce((sum, q) => sum + q.points, 0),
      answers: [],
      startedAt: new Date(),
    });

    await quiz.save();

    // Get the newly created attempt
    const newAttempt = quiz.attempts.find(
      (attempt) =>
        attempt.student.toString() === req.user.id && !attempt.completedAt
    );

    // Return quiz without correct answers
    const quizWithoutAnswers = {
      ...quiz.toObject(),
      questions: quiz.questions.map((q) => ({
        ...q,
        correctAnswer: undefined,
      })),
    };

    res.status(201).json({
      success: true,
      data: {
        quiz: quizWithoutAnswers,
        attempt: newAttempt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error starting quiz attempt",
      error: error.message,
    });
  }
};

/**
 * @desc    Submit a quiz attempt
 * @route   PUT /api/quizzes/:id/attempt
 * @access  Private (Student only)
 */
export const submitQuizAttempt = async (req, res) => {
  try {
    const { answers } = req.body;
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Find the attempt
    const attemptIndex = quiz.attempts.findIndex(
      (attempt) =>
        attempt.student.toString() === req.user.id && !attempt.completedAt
    );

    if (attemptIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "No active attempt found",
      });
    }

    // Process and grade answers
    let totalScore = 0;
    const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const gradedAnswers = [];

    answers.forEach((answer, index) => {
      const question = quiz.questions[index];
      const isCorrect = answer === question.correctAnswer;
      const pointsEarned = isCorrect ? question.points : 0;

      totalScore += pointsEarned;

      gradedAnswers.push({
        questionIndex: index,
        givenAnswer: answer,
        isCorrect,
        pointsEarned,
      });
    });

    // Update the attempt
    quiz.attempts[attemptIndex].answers = gradedAnswers;
    quiz.attempts[attemptIndex].score = totalScore;
    quiz.attempts[attemptIndex].maxScore = maxScore;
    quiz.attempts[attemptIndex].completedAt = new Date();
    quiz.attempts[attemptIndex].timeSpent =
      (new Date() - new Date(quiz.attempts[attemptIndex].startedAt)) / 1000;
    quiz.attempts[attemptIndex].passed =
      (totalScore / maxScore) * 100 >= quiz.passingScore;

    await quiz.save();

    // Update course progress
    const studentData = quiz.attempts[attemptIndex];

    // Update the student's progress in the course
    if (studentData.passed) {
      const courseStudentIndex = course.students.findIndex(
        (s) => s.student.toString() === req.user.id
      );

      if (courseStudentIndex !== -1) {
        // Add quiz to completed quizzes in student progress
        const quizScore = {
          quizId: quiz._id,
          score: totalScore,
          maxScore: maxScore,
          completedAt: new Date(),
        };

        // Check if the quiz score already exists and update it, otherwise add it
        const existingScoreIndex = course.students[
          courseStudentIndex
        ].progress.quizScores.findIndex(
          (s) => s.quizId.toString() === quiz._id.toString()
        );

        if (existingScoreIndex !== -1) {
          course.students[courseStudentIndex].progress.quizScores[
            existingScoreIndex
          ] = quizScore;
        } else {
          course.students[courseStudentIndex].progress.quizScores.push(
            quizScore
          );
        }

        // Recalculate completion percentage
        await course.calculateStudentProgress(req.user.id);
        await course.save();
      }
    }

    res.status(200).json({
      success: true,
      data: {
        attempt: quiz.attempts[attemptIndex],
        score: totalScore,
        maxScore,
        percentage: Math.round((totalScore / maxScore) * 100),
        passed: quiz.attempts[attemptIndex].passed,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error submitting quiz attempt",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all quiz attempts for a student
 * @route   GET /api/quizzes/attempts
 * @access  Private (Student only)
 */
export const getStudentQuizAttempts = async (req, res) => {
  try {
    const quizzes = await Quiz.find({
      "attempts.student": req.user.id,
    }).populate("course", "title");

    // Extract just the attempts
    const attempts = [];

    quizzes.forEach((quiz) => {
      const studentAttempts = quiz.attempts.filter(
        (attempt) => attempt.student.toString() === req.user.id
      );

      studentAttempts.forEach((attempt) => {
        attempts.push({
          quizId: quiz._id,
          quizTitle: quiz.title,
          courseId: quiz.course._id,
          courseTitle: quiz.course.title,
          score: attempt.score,
          maxScore: attempt.maxScore,
          percentage: Math.round((attempt.score / attempt.maxScore) * 100),
          passed: attempt.passed,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
          timeSpent: attempt.timeSpent,
        });
      });
    });

    // Sort by most recent
    attempts.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving quiz attempts",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all quiz results for a quiz (instructor view)
 * @route   GET /api/quizzes/:id/results
 * @access  Private (Instructor only)
 */
export const getQuizResults = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate({
      path: "attempts.student",
      select: "name email profilePicture",
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check if user is the instructor of the course
    const course = await Course.findById(quiz.course);

    if (
      course.instructor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view results for this quiz",
      });
    }

    // Get completed attempts and sort by score
    const completedAttempts = quiz.attempts
      .filter((attempt) => attempt.completedAt)
      .map((attempt) => ({
        student: attempt.student,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: Math.round((attempt.score / attempt.maxScore) * 100),
        passed: attempt.passed,
        answers: attempt.answers,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        timeSpent: attempt.timeSpent,
      }))
      .sort((a, b) => b.score - a.score);

    // Calculate quiz statistics
    const totalAttempts = completedAttempts.length;
    const passedAttempts = completedAttempts.filter((a) => a.passed).length;
    const passRate = totalAttempts
      ? Math.round((passedAttempts / totalAttempts) * 100)
      : 0;
    const averageScore = totalAttempts
      ? Math.round(
          completedAttempts.reduce((sum, a) => sum + a.percentage, 0) /
            totalAttempts
        )
      : 0;

    // Analyze question difficulty
    const questionStats = quiz.questions.map((question, index) => {
      const attempts = completedAttempts.filter((a) =>
        a.answers.some((ans) => ans.questionIndex === index)
      );
      const correctAnswers = attempts.filter(
        (a) => a.answers.find((ans) => ans.questionIndex === index)?.isCorrect
      ).length;

      return {
        questionIndex: index,
        questionText: question.questionText,
        totalAttempts: attempts.length,
        correctAnswers,
        correctPercentage: attempts.length
          ? Math.round((correctAnswers / attempts.length) * 100)
          : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        quizInfo: {
          title: quiz.title,
          totalQuestions: quiz.questions.length,
          passingScore: quiz.passingScore,
        },
        stats: {
          totalAttempts,
          passedAttempts,
          passRate,
          averageScore,
        },
        questionStats,
        attempts: completedAttempts,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving quiz results",
      error: error.message,
    });
  }
};
