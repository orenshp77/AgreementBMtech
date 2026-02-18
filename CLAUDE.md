# Agreement Signing System (מערכת החתמת הסכמים)

Digital agreement signing system for Reshet Times / AIweon, serving companies BMaTek and Bagda.

## Quick Start

```bash
npm install
npm run dev
# Access at http://localhost:2000
```

## System Requirements

- Node.js 18.0.0 or higher
- npm (included with Node.js)

## Project Structure

```
├── server/
│   ├── server.js              # Main entry point
│   ├── database/
│   │   ├── index.js           # PostgreSQL operations
│   │   ├── db.json            # JSON storage (dev fallback)
│   │   └── schema.sql         # Database schema
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── users.js           # User management
│   │   ├── agreements.js      # Agreement CRUD
│   │   └── logs.js            # Activity logs
│   ├── middleware/
│   │   └── auth.js            # JWT verification
│   └── services/
│       ├── emailService.js    # Nodemailer
│       └── driveService.js    # Google Drive backup
├── public/                    # Frontend HTML/CSS/JS
├── package.json
├── .env                       # Environment config
└── render.yaml                # Deployment config
```

## NPM Scripts

- `npm start` - Production server
- `npm run dev` - Development with nodemon (auto-reload)
- `npm run build` - Install dependencies

## Environment Variables

Required in `.env`:

```
NODE_ENV=development
PORT=2000
JWT_SECRET=<secret-key>
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<gmail-address>
EMAIL_PASS=<app-password>
EMAIL_TO=<notification-email>
BASE_URL=http://localhost:2000
```

Optional:
- `DATABASE_URL` - PostgreSQL connection (uses db.json if not set)
- `SMS_API_KEY` / `SMS_SENDER` - SMS integration
- `WHATSAPP_DEFAULT_MESSAGE` - WhatsApp message template

Google Drive backup (OAuth2):
- `GOOGLE_CLIENT_ID` - OAuth2 client ID
- `GOOGLE_CLIENT_SECRET` - OAuth2 client secret
- `GOOGLE_REFRESH_TOKEN` - OAuth2 refresh token (get via `/setup-drive` endpoint)
- `DRIVE_FOLDER_ID` - Target Shared Drive folder ID (default: `1MhNkFlE_4rLoMFGltl4cTGJCNpWY96d7`)

## Database

- **Development:** JSON file at `server/database/db.json` (no setup needed)
- **Production:** PostgreSQL (requires `DATABASE_URL`)

Tables: `users`, `agreements`, `logs`, `templates`

## Routes

### Frontend Pages
| URL | Description |
|-----|-------------|
| `/` | Home page |
| `/login` | Login page |
| `/admin` | Admin dashboard |
| `/dashboard` | User dashboard |
| `/agreement/bmatek` | BMaTek agreement form |
| `/agreement/bagda` | Bagda agreement form |
| `/logs` | Activity logs (admin) |
| `/editor` | Agreement editor (admin) |
| `/client/:id` | Client view agreement |
| `/sign/:id` | Client signature page |

### API Endpoints
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user info
- `GET/POST /api/users` - User management (admin)
- `GET/POST /api/agreements` - Agreement CRUD
- `POST /api/agreements/:id/send` - Send to client
- `POST /api/agreements/:id/sign` - Sign agreement
- `GET /api/logs` - Activity logs (admin)

## Authentication

- JWT tokens with 24-hour expiration
- Passwords hashed with bcryptjs
- Authorization header: `Bearer <token>`

Roles:
- `admin` - Full access, user management, logs
- `user` - Create/view agreements
- `client` - Sign agreements via link (no login)

## Test Accounts

Found in `db.json`:
- `admin` - Administrator
- `ns` - Regular user (Nastya)

## Production

| Setting | Value |
|---------|-------|
| Platform | Render.com |
| Service | `agreement-signing-system` |
| Region | Frankfurt |
| Plan | Starter |
| URL | `https://agreement-signing-system.onrender.com` |

## Key Dependencies

- express (4.18.2) - Web framework
- bcryptjs (2.4.3) - Password hashing
- jsonwebtoken (9.0.2) - JWT auth
- pg (8.11.3) - PostgreSQL
- nodemailer (6.9.7) - Email
- socket.io (4.7.2) - Real-time updates
- googleapis (171.4.0) - Google Drive

## Integrations

### Email (Nodemailer)
- Gmail SMTP (smtp.gmail.com:587)
- Sends agreement links and notifications

### Google Drive (Optional)
- OAuth2 authentication (Shared Drive)
- Backs up signed agreements as PDFs
- Setup: Visit `/setup-drive` to get refresh token, add to Render env vars
- Required env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`

### WhatsApp
- Direct links via `https://wa.me/{phone}?text={message}`

## Notes

- Interface is in Hebrew (RTL)
- Mobile-first design for tablet/phone signatures
- Socket.IO enables real-time dashboard updates
- Change `JWT_SECRET` before production deployment
