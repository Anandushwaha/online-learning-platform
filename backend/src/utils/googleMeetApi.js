import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google API credentials from environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// Scopes needed for Google Calendar API with Google Meet
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

// Create OAuth2 client
const createOAuth2Client = () => {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
};

/**
 * Get Google OAuth2 authorization URL
 * @returns {string} - Authorization URL
 */
export const getAuthUrl = () => {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force to get refresh token
  });
};

/**
 * Get tokens from authorization code
 * @param {string} code - Authorization code
 * @returns {Promise<Object>} - OAuth2 tokens
 */
export const getTokensFromCode = async (code) => {
  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens securely (should be in a database)
    // This is just for demonstration - in production, store these securely
    process.env.GOOGLE_ACCESS_TOKEN = tokens.access_token;
    process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;

    return tokens;
  } catch (error) {
    console.error("Error getting tokens from code:", error);
    throw new Error(`Failed to get tokens: ${error.message}`);
  }
};

/**
 * Save OAuth2 tokens to a file
 * @param {Object} tokens - OAuth2 tokens
 */
const saveTokens = (tokens) => {
  try {
    const tokensPath = path.join(__dirname, "../../.google_tokens.json");
    fs.writeFileSync(tokensPath, JSON.stringify(tokens));
  } catch (error) {
    console.error("Error saving tokens:", error);
  }
};

/**
 * Load OAuth2 tokens from file
 * @returns {Object|null} Tokens or null if file doesn't exist
 */
const loadTokens = () => {
  try {
    const tokensPath = path.join(__dirname, "../../.google_tokens.json");

    if (fs.existsSync(tokensPath)) {
      const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf8"));
      return tokens;
    }

    return null;
  } catch (error) {
    console.error("Error loading tokens:", error);
    return null;
  }
};

/**
 * Set up authenticated OAuth2 client with tokens
 * @returns {Promise<OAuth2Client>} - Authenticated OAuth2 client
 */
const getAuthenticatedClient = async () => {
  try {
    const oauth2Client = createOAuth2Client();

    // Use stored tokens (from environment or database)
    oauth2Client.setCredentials({
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    return oauth2Client;
  } catch (error) {
    console.error("Error setting up authenticated client:", error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

/**
 * Create a Google Calendar event with Google Meet
 * @param {Object} meetingDetails - Meeting details
 * @returns {Promise<Object>} - Created event details
 */
export const createGoogleMeeting = async (meetingDetails) => {
  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });

    // Create event with Google Meet conference
    const event = {
      summary: meetingDetails.summary,
      description: meetingDetails.description,
      start: {
        dateTime: meetingDetails.startTime,
        timeZone: "UTC",
      },
      end: {
        dateTime: meetingDetails.endTime,
        timeZone: "UTC",
      },
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 11)}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
      attendees: meetingDetails.attendees.map((email) => ({ email })),
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
    });

    return response.data;
  } catch (error) {
    console.error("Error creating Google Meet:", error.response?.data || error);
    throw new Error(`Failed to create Google Meet: ${error.message}`);
  }
};

/**
 * Get a Google Calendar event by ID
 * @param {string} eventId - Google Calendar event ID
 * @returns {Promise<Object>} - Event details
 */
export const getGoogleMeeting = async (eventId) => {
  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.get({
      calendarId: "primary",
      eventId,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Error getting Google Meet event:",
      error.response?.data || error
    );
    throw new Error(`Failed to get Google Meet event: ${error.message}`);
  }
};

/**
 * Update a Google Calendar event
 * @param {string} eventId - Google Calendar event ID
 * @param {Object} updatedDetails - Updated event details
 * @returns {Promise<Object>} - Updated event details
 */
export const updateGoogleMeeting = async (eventId, updatedDetails) => {
  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });

    // Get existing event first
    const existingEvent = await calendar.events.get({
      calendarId: "primary",
      eventId,
    });

    // Merge existing data with updates
    const updatedEvent = {
      ...existingEvent.data,
      ...updatedDetails,
    };

    const response = await calendar.events.update({
      calendarId: "primary",
      eventId,
      resource: updatedEvent,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Error updating Google Meet event:",
      error.response?.data || error
    );
    throw new Error(`Failed to update Google Meet event: ${error.message}`);
  }
};

/**
 * Delete a Google Calendar event
 * @param {string} eventId - Google Calendar event ID
 * @returns {Promise<void>}
 */
export const deleteGoogleMeeting = async (eventId) => {
  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
  } catch (error) {
    console.error(
      "Error deleting Google Meet event:",
      error.response?.data || error
    );
    throw new Error(`Failed to delete Google Meet event: ${error.message}`);
  }
};

/**
 * Extract Google Meet link from Calendar event
 * @param {Object} event - Google Calendar event
 * @returns {string|null} - Google Meet link or null if not found
 */
export const extractMeetLink = (event) => {
  try {
    if (
      event.conferenceData &&
      event.conferenceData.entryPoints &&
      event.conferenceData.entryPoints.length > 0
    ) {
      // Find video entry point
      const videoEntry = event.conferenceData.entryPoints.find(
        (entry) => entry.entryPointType === "video"
      );

      if (videoEntry && videoEntry.uri) {
        return videoEntry.uri;
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting Google Meet link:", error);
    return null;
  }
};
