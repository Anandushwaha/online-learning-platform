import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Zoom API credentials from environment variables
const ZOOM_API_KEY = process.env.ZOOM_API_KEY;
const ZOOM_API_SECRET = process.env.ZOOM_API_SECRET;
const ZOOM_USER_ID = process.env.ZOOM_USER_ID; // Can be 'me' or specific user ID

/**
 * Generate a Zoom JWT token for API authorization
 * @returns {string} Zoom JWT token
 */
export const generateZoomToken = () => {
  const payload = {
    iss: ZOOM_API_KEY,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token expires in 1 hour
  };

  return jwt.sign(payload, ZOOM_API_SECRET);
};

/**
 * Create a Zoom meeting
 * @param {Object} meetingDetails - Meeting details
 * @param {string} meetingDetails.topic - Meeting topic
 * @param {string} meetingDetails.agenda - Meeting agenda/description
 * @param {string} meetingDetails.start_time - Start time in format: 'YYYY-MM-DDThh:mm:ss'
 * @param {number} meetingDetails.duration - Duration in minutes
 * @param {string} meetingDetails.timezone - Timezone (e.g., 'America/Los_Angeles')
 * @param {string} meetingDetails.password - Meeting password
 * @returns {Promise<Object>} Zoom meeting object
 */
export const createZoomMeeting = async (meetingDetails) => {
  try {
    const token = generateZoomToken();

    const config = {
      method: "post",
      url: `https://api.zoom.us/v2/users/${ZOOM_USER_ID}/meetings`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        topic: meetingDetails.topic,
        type: 2, // Scheduled meeting
        start_time: meetingDetails.start_time,
        duration: meetingDetails.duration,
        timezone: meetingDetails.timezone || "UTC",
        agenda: meetingDetails.agenda,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
          auto_recording: "cloud", // Auto-record to the cloud
          password: meetingDetails.password || generateRandomPassword(),
        },
      },
    };

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(
      "Error creating Zoom meeting:",
      error.response?.data || error.message
    );
    throw new Error("Failed to create Zoom meeting");
  }
};

/**
 * Get a Zoom meeting by ID
 * @param {string} meetingId - Zoom meeting ID
 * @returns {Promise<Object>} Zoom meeting object
 */
export const getZoomMeeting = async (meetingId) => {
  try {
    const token = generateZoomToken();

    const config = {
      method: "get",
      url: `https://api.zoom.us/v2/meetings/${meetingId}`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(
      "Error getting Zoom meeting:",
      error.response?.data || error.message
    );
    throw new Error("Failed to get Zoom meeting");
  }
};

/**
 * Update a Zoom meeting
 * @param {string} meetingId - Zoom meeting ID
 * @param {Object} updateDetails - Meeting details to update
 * @returns {Promise<Object>} Zoom meeting object
 */
export const updateZoomMeeting = async (meetingId, updateDetails) => {
  try {
    const token = generateZoomToken();

    const config = {
      method: "patch",
      url: `https://api.zoom.us/v2/meetings/${meetingId}`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: updateDetails,
    };

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(
      "Error updating Zoom meeting:",
      error.response?.data || error.message
    );
    throw new Error("Failed to update Zoom meeting");
  }
};

/**
 * Delete a Zoom meeting
 * @param {string} meetingId - Zoom meeting ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteZoomMeeting = async (meetingId) => {
  try {
    const token = generateZoomToken();

    const config = {
      method: "delete",
      url: `https://api.zoom.us/v2/meetings/${meetingId}`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    await axios(config);
    return true;
  } catch (error) {
    console.error(
      "Error deleting Zoom meeting:",
      error.response?.data || error.message
    );
    throw new Error("Failed to delete Zoom meeting");
  }
};

/**
 * Get Zoom meeting recordings
 * @param {string} meetingId - Zoom meeting ID
 * @returns {Promise<Object>} Zoom recording object
 */
export const getZoomRecordings = async (meetingId) => {
  try {
    const token = generateZoomToken();

    const config = {
      method: "get",
      url: `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(
      "Error getting Zoom recordings:",
      error.response?.data || error.message
    );
    throw new Error("Failed to get Zoom recordings");
  }
};

/**
 * Generate a random password for Zoom meetings
 * @returns {string} Random password
 */
const generateRandomPassword = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";

  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
};
