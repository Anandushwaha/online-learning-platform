import { getFileType } from "../utils/fileUpload.js";

/**
 * @desc    Upload file to local storage
 * @route   POST /api/upload/local
 * @access  Private
 */
export const uploadLocalFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }

    const file = req.file;
    const fileType = getFileType(file.originalname);

    res.status(200).json({
      success: true,
      data: {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        fileType,
        url: `/uploads/${file.filename}`,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error uploading file",
      error: error.message,
    });
  }
};

/**
 * @desc    Upload file to Cloudinary
 * @route   POST /api/upload/cloud
 * @access  Private
 */
export const uploadCloudFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }

    const file = req.file;
    const fileType = getFileType(file.originalname);

    res.status(200).json({
      success: true,
      data: {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        fileType,
        url: file.path, // This is the Cloudinary URL
        publicId: file.filename, // This is the public ID in Cloudinary
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error uploading file to Cloudinary",
      error: error.message,
    });
  }
};

/**
 * @desc    Upload multiple files to local storage
 * @route   POST /api/upload/local/multiple
 * @access  Private
 */
export const uploadMultipleLocalFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one file",
      });
    }

    const fileData = req.files.map((file) => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      fileType: getFileType(file.originalname),
      url: `/uploads/${file.filename}`,
    }));

    res.status(200).json({
      success: true,
      count: fileData.length,
      data: fileData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error uploading multiple files",
      error: error.message,
    });
  }
};

/**
 * @desc    Upload multiple files to Cloudinary
 * @route   POST /api/upload/cloud/multiple
 * @access  Private
 */
export const uploadMultipleCloudFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one file",
      });
    }

    const fileData = req.files.map((file) => ({
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      fileType: getFileType(file.originalname),
      url: file.path, // This is the Cloudinary URL
      publicId: file.filename, // This is the public ID in Cloudinary
    }));

    res.status(200).json({
      success: true,
      count: fileData.length,
      data: fileData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error uploading multiple files to Cloudinary",
      error: error.message,
    });
  }
};
