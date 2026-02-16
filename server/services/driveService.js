const { google } = require('googleapis');
const path = require('path');

// Google Drive folder ID for backups
const DRIVE_FOLDER_ID = '1iksarwV8HB08SfwnD6nryCooogKaTSvZ';

let driveClient = null;

/**
 * Initialize Google Drive client with Service Account
 * This is more reliable for server-to-server communication
 */
function initDriveClient() {
    if (driveClient) return driveClient;

    try {
        // Load service account credentials
        const credentialsPath = path.join(__dirname, '../../drive-credentials.json');
        const auth = new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });

        driveClient = google.drive({ version: 'v3', auth });
        console.log('Google Drive client initialized with Service Account');
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

module.exports = {
    uploadPdfToDrive,
    uploadPdfFromBase64,
    listBackupFiles,
    initDriveClient
};
