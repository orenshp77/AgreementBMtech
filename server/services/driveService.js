const { google } = require('googleapis');

// Google Drive folder ID for backups (in user's personal Drive)
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1iksarwV8HB08SfwnD6nryCooogKaTSvZ';

let driveClient = null;
let oauth2Client = null;

/**
 * Initialize Google Drive client with OAuth2 (user's personal account)
 */
function initDriveClient() {
    if (driveClient) return driveClient;

    try {
        // Check for OAuth2 credentials
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken) {
            console.warn('Google OAuth2 credentials not configured. Backup disabled.');
            return null;
        }

        oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        driveClient = google.drive({ version: 'v3', auth: oauth2Client });
        console.log('Google Drive client initialized with OAuth2');
        return driveClient;
    } catch (error) {
        console.error('Failed to initialize Google Drive client:', error.message);
        return null;
    }
}

/**
 * Upload a PDF file to Google Drive
 */
async function uploadPdfToDrive(pdfBuffer, fileName, metadata = {}) {
    const drive = initDriveClient();

    if (!drive) {
        throw new Error('Google Drive client not available. Check drive-credentials.json');
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
            fields: 'id, name, webViewLink, webContentLink',
            supportsAllDrives: true
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
            orderBy: 'createdTime desc',
            supportsAllDrives: true
        });

        return response.data.files;
    } catch (error) {
        console.error('Failed to list Drive files:', error.message);
        throw error;
    }
}

/**
 * Test Drive connection
 */
async function testConnection() {
    const drive = initDriveClient();

    if (!drive) {
        return { success: false, error: 'Drive client not initialized' };
    }

    try {
        // Try to get folder info
        const response = await drive.files.get({
            fileId: DRIVE_FOLDER_ID,
            fields: 'id, name',
            supportsAllDrives: true
        });

        return {
            success: true,
            folderId: response.data.id,
            folderName: response.data.name
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    uploadPdfToDrive,
    uploadPdfFromBase64,
    listBackupFiles,
    initDriveClient,
    testConnection
};
