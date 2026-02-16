/**
 * Script to get Google OAuth2 Refresh Token
 * Run this once locally to get the refresh token
 *
 * Usage:
 * 1. Run: node get-refresh-token.js
 * 2. Open the URL in browser
 * 3. Sign in with reshetimes@gmail.com
 * 4. Copy the refresh token from the console
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');

// Your OAuth2 credentials
const CLIENT_ID = '1040161889673-t3pm2dod9esa0286h7gd6qk5aj1ovj9q.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3333/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent'
});

console.log('\n========================================');
console.log('Google OAuth2 Refresh Token Generator');
console.log('========================================\n');
console.log('1. Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Sign in with: reshetimes@gmail.com');
console.log('3. Allow the permissions');
console.log('4. Wait for the redirect...\n');

// Create a simple server to handle the callback
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === '/oauth2callback') {
        const code = parsedUrl.query.code;

        if (code) {
            try {
                const { tokens } = await oauth2Client.getToken(code);

                console.log('========================================');
                console.log('SUCCESS! Here is your Refresh Token:');
                console.log('========================================\n');
                console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
                console.log('\n========================================');
                console.log('Add these to Render Environment Variables:');
                console.log('========================================\n');
                console.log('GOOGLE_CLIENT_ID=' + CLIENT_ID);
                console.log('GOOGLE_CLIENT_SECRET=' + CLIENT_SECRET);
                console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
                console.log('\n========================================\n');

                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
                    <html dir="rtl">
                    <head><title>Success!</title></head>
                    <body style="font-family: Arial; padding: 50px; text-align: center;">
                        <h1 style="color: green;">הצלחה!</h1>
                        <p>ה-Refresh Token נוצר בהצלחה.</p>
                        <p>חזור לטרמינל כדי לראות את הפרטים.</p>
                        <p>אפשר לסגור את החלון הזה.</p>
                    </body>
                    </html>
                `);

                // Close server after getting token
                setTimeout(() => {
                    server.close();
                    process.exit(0);
                }, 1000);

            } catch (error) {
                console.error('Error getting tokens:', error.message);
                res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>Error</h1><p>' + error.message + '</p>');
            }
        } else {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Error: No code received</h1>');
        }
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(3333, () => {
    console.log('Waiting for authorization on port 3333...\n');
});
