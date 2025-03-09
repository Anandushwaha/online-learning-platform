import Job from "../models/job.model.js";
import Notification from "../models/notification.model.js";

/**
 * @desc    Get all jobs
 * @route   GET /api/jobs
 * @access  Private
 */
export const getJobs = async (req, res) => {
  try {
    const {
      category,
      type,
      search,
      location,
      limit = 10,
      page = 1,
    } = req.query;

    // Build query
    const query = { isActive: true };

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by job type
    if (type) {
      query.type = type;
    }

    // Filter by location
    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    // Search functionality using text index
    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const jobs = await Job.find(query)
      .populate("postedBy", "name email profilePicture")
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Job.countDocuments(query);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      data: jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving jobs",
      error: error.message,
    });
  }
};

/**
 * @desc    Get a single job
 * @route   GET /api/jobs/:id
 * @access  Private
 */
export const getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      "postedBy",
      "name email profilePicture"
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving job",
      error: error.message,
    });
  }
};

/**
 * @desc    Create a new job
 * @route   POST /api/jobs
 * @access  Private (Teacher/Admin only)
 */
export const createJob = async (req, res) => {
  try {
    // Add poster to job data
    req.body.postedBy = req.user.id;

    // Create job
    const job = await Job.create(req.body);

    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating job",
      error: error.message,
    });
  }
};

/**
 * @desc    Update a job
 * @route   PUT /api/jobs/:id
 * @access  Private (Owner/Admin only)
 */
export const updateJob = async (req, res) => {
  try {
    let job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check ownership
    if (job.postedBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this job",
      });
    }

    // Update job
    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating job",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a job
 * @route   DELETE /api/jobs/:id
 * @access  Private (Owner/Admin only)
 */
export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check ownership
    if (job.postedBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this job",
      });
    }

    await job.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting job",
      error: error.message,
    });
  }
};

/**
 * @desc    Apply for a job
 * @route   POST /api/jobs/:id/apply
 * @access  Private (Student only)
 */
export const applyForJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check if job is still active and not expired
    if (!job.isActive || new Date() > job.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Job is no longer active or has expired",
      });
    }

    // Check if student has already applied
    const alreadyApplied = job.applications.find(
      (app) => app.student.toString() === req.user.id
    );

    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: "You have already applied for this job",
      });
    }

    // Add application
    job.applications.push({
      student: req.user.id,
      status: "pending",
    });

    await job.save();

    // Notify job poster
    await Notification.create({
      recipient: job.postedBy,
      sender: req.user.id,
      type: "job_application_update",
      title: "New Job Application",
      message: `${req.user.name} has applied for the job "${job.title}"`,
      link: `/jobs/${job._id}/applications`,
      relatedId: job._id,
    });

    res.status(200).json({
      success: true,
      message: "Application submitted successfully",
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error applying for job",
      error: error.message,
    });
  }
};

/**
 * @desc    Update application status
 * @route   PUT /api/jobs/:id/applications/:applicationId
 * @access  Private (Job poster/Admin only)
 */
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id, applicationId } = req.params;

    if (!["pending", "accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check ownership
    if (job.postedBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this application",
      });
    }

    // Find the application
    const application = job.applications.id(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Update the status
    application.status = status;
    await job.save();

    // Notify the applicant
    await Notification.create({
      recipient: application.student,
      sender: req.user.id,
      type: "job_application_update",
      title: "Application Status Updated",
      message: `Your application for "${job.title}" at ${job.company} has been ${status}`,
      link: `/jobs/${job._id}`,
      relatedId: job._id,
    });

    res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating application status",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all applications for a job
 * @route   GET /api/jobs/:id/applications
 * @access  Private (Job poster/Admin only)
 */
export const getJobApplications = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate({
      path: "applications.student",
      select: "name email profilePicture bio",
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check ownership
    if (job.postedBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view applications for this job",
      });
    }

    res.status(200).json({
      success: true,
      count: job.applications.length,
      data: job.applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving job applications",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all applications by a student
 * @route   GET /api/jobs/applications
 * @access  Private (Student only)
 */
export const getStudentApplications = async (req, res) => {
  try {
    const jobs = await Job.find({
      "applications.student": req.user.id,
    }).populate("postedBy", "name email profilePicture");

    // Extract applications for the student
    const applications = jobs.map((job) => {
      const application = job.applications.find(
        (app) => app.student.toString() === req.user.id
      );

      return {
        job: {
          _id: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          postedBy: job.postedBy,
        },
        status: application.status,
        appliedAt: application.appliedAt,
        applicationId: application._id,
      };
    });

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving applications",
      error: error.message,
    });
  }
};
