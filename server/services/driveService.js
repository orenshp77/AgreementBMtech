const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Google Drive folder ID for backups
const DRIVE_FOLDER_ID = '1iksarwV8HB08SfwnD6nryCooogKaTSvZ';

// Path to service account credentials (for local development)
const CREDENTIALS_PATH = path.join(__dirname, '../../drive-credentials.json');

let driveClient = null;

/**
 * Initialize Google Drive client with service account
 */
function initDriveClient() {
    if (driveClient) return driveClient;

    try {
        let credentials;

        // Try environment variable first (for production)
        if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
            credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
            console.log('Using Drive credentials from environment variable');
        }
        // Fall back to file (for local development)
        else if (fs.existsSync(CREDENTIALS_PATH)) {
            credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
            console.log('Using Drive credentials from file');
        }
        else {
            console.error('No Drive credentials found (env var or file)');
            return null;
        }

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });

        driveClient = google.drive({ version: 'v3', auth });
        console.log('Google Drive client initialized successfully');
        return driveClient;
    } catch (error) {
        console.error('Failed to initialize Google Drive client:', error.message);
        return null;
    }
}

/**
 * Upload a PDF file to Google Drive
 * @param {Buffer} pdfBuffer - The PDF file as a buffer
 * @param {string} fileName - The name for the file in Drive
 * @param {object} metadata - Additional metadata about the agreement
 * @returns {Promise<object>} - The uploaded file info
 */
async function uploadPdfToDrive(pdfBuffer, fileName, metadata = {}) {
    const drive = initDriveClient();

    if (!drive) {
        throw new Error('Google Drive client not available');
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
 * @param {string} base64Data - Base64 encoded PDF data
 * @param {string} fileName - The name for the file
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>}
 */
async function uploadPdfFromBase64(base64Data, fileName, metadata = {}) {
    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:application\/pdf;base64,/, '');
    const pdfBuffer = Buffer.from(base64Clean, 'base64');

    return uploadPdfToDrive(pdfBuffer, fileName, metadata);
}

/**
 * List files in the backup folder
 * @returns {Promise<Array>}
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

// Initialize on module load
initDriveClient();

module.exports = {
    uploadPdfToDrive,
    uploadPdfFromBase64,
    listBackupFiles,
    initDriveClient
};
