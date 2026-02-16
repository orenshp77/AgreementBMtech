const { google } = require('googleapis');

// Google Drive folder ID for backups
const DRIVE_FOLDER_ID = '1iksarwV8HB08SfwnD6nryCooogKaTSvZ';

let driveClient = null;
let oauth2Client = null;

/**
 * Initialize Google Drive client with OAuth2 (user's own account)
 * This allows uploading files owned by the user, not a service account
 */
function initDriveClient() {
    if (driveClient) return driveClient;

    try {
        // OAuth2 credentials from environment variables
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken) {
            console.error('Missing OAuth2 credentials. Need GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN');
            return null;
        }

        oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            'http://localhost:3000/oauth2callback' // Redirect URI (not used with refresh token)
        );

        // Set the refresh token
        oauth2Client.setCredentials({
            refresh_token: refreshToken
        });

        driveClient = google.drive({ version: 'v3', auth: oauth2Client });
        console.log('Google Drive client initialized with OAuth2');
        return driveClient;
    } catch (error) {
        console.error('Failed to initialize Google Drive client:', error.message);
        return null;
    }
}

/**
 * Generate authorization URL for one-time setup
 * User visits this URL to authorize the app and get a refresh token
 */
function getAuthUrl() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return null;
    }

    const tempOauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'http://localhost:3000/oauth2callback'
    );

    return tempOauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file'],
        prompt: 'consent' // Force consent to get refresh token
    });
}

/**
 * Exchange authorization code for tokens (one-time setup)
 */
async function getTokensFromCode(code) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const tempOauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'http://localhost:3000/oauth2callback'
    );

    const { tokens } = await tempOauth2Client.getToken(code);
    return tokens;
}

/**
 * Upload a PDF file to Google Drive
 */
async function uploadPdfToDrive(pdfBuffer, fileName, metadata = {}) {
    const drive = initDriveClient();

    if (!drive) {
        throw new Error('Google Drive client not available. Please set up OAuth2 credentials.');
    }

    try {
        // Create file metadata
        const fileMetadata = {
            name: fileName,
            parents: [DRIVE_FOLDER_ID],
            description: metadata.description || `Agreement signed on ${new Date().toISOString()}`
        };

        // Create a readable stream from the buffer
        const { Readable } = require('stream');
        const bufferStream = new Readable();
        bufferStream.push(pdfBuffer);
        bufferStream.push(null);

        // Upload the file
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: {
                mimeType: 'application/pdf',
                body: bufferStream
            },
            fields: 'id, name, webViewLink, webContentLink'
        });

        console.log(`PDF uploaded to Drive: ${response.data.name} (ID: ${response.data.id})`);

        return {
            success: true,
            fileId: response.data.id,
            fileName: response.data.name,
            webViewLink: response.data.webViewLink,
            webContentLink: response.data.webContentLink
        };
    } catch (error) {
        console.error('Failed to upload PDF to Drive:', error.message);
        throw error;
    }
}

/**
 * Upload PDF from base64 string
 */
async function uploadPdfFromBase64(base64Data, fileName, metadata = {}) {
    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:application\/pdf;base64,/, '');
    const pdfBuffer = Buffer.from(base64Clean, 'base64');

    return uploadPdfToDrive(pdfBuffer, fileName, metadata);
}

/**
 * List files in the backup folder
 */
async function listBackupFiles() {
    const drive = initDriveClient();

    if (!drive) {
        throw new Error('Google Drive client not available');
    }

    try {
        const response = await drive.files.list({
            q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false`,
            fields: 'files(id, name, createdTime, size)',
            orderBy: 'createdTime desc'
        });

        return response.data.files;
    } catch (error) {
        console.error('Failed to list Drive files:', error.message);
        throw error;
    }
}

module.exports = {
    uploadPdfToDrive,
    uploadPdfFromBase64,
    listBackupFiles,
    initDriveClient,
    getAuthUrl,
    getTokensFromCode
};
