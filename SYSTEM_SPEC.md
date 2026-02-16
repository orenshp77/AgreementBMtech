# מערכת החתמת הסכמים - Reshet Times / AIweon

## סקירה כללית

מערכת דיגיטלית להחתמת הסכמי פרסום עבור חברות **במטק בע"מ** ו**בגדא בע"מ**.
המערכת מאפשרת יצירת הסכמים, שליחתם ללקוחות, וקבלת חתימות דיגיטליות.

---

## טכנולוגיות

| רכיב | טכנולוגיה |
|------|-----------|
| Backend | Node.js / Express |
| Frontend | HTML5, CSS3, JavaScript |
| Build Tool | TurboPack |
| Hosting | Render.com |
| PDF Generation | PDFKit / Puppeteer |
| UI Components | Sweet Alert 2 |

---

## עיצוב ונראות

### צבעי המערכת
- **אפור** - רקעים משניים
- **שחור** - רקע ראשי
- **כחול** - כפתורים ולינקים
- **ירוק** - הצלחה ואישור

### מצב תצוגה
- תמיד במצב **DARK MODE**

### לוגואים
| קובץ | שימוש |
|------|-------|
| `open.jpg` | עמוד ראשון בלבד |
| `33.jpg` | שאר העמודים |

### Loader
- כל פעולה מעל **שנייה אחת** תציג אנימציית טעינה
- הלואדר יהיה מרכזי ונגיש

---

## מבנה המערכת

```
├── /client
│   ├── /pages
│   │   ├── login.html
│   │   ├── admin.html
│   │   ├── agreement-select.html
│   │   ├── agreement-form-bmatek.html
│   │   ├── agreement-form-bagda.html
│   │   ├── client-view.html
│   │   ├── client-signature.html
│   │   ├── agreement-editor.html
│   │   └── logs.html
│   ├── /assets
│   │   ├── /images
│   │   │   ├── open.jpg
│   │   │   ├── 33.jpg
│   │   │   └── company-stamps/
│   │   ├── /css
│   │   │   └── styles.css
│   │   └── /js
│   │       ├── main.js
│   │       ├── signature-pad.js
│   │       └── pdf-generator.js
│   └── /templates
│       ├── agreement-bmatek.html
│       └── agreement-bagda.html
├── /server
│   ├── /routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── agreements.js
│   │   └── logs.js
│   ├── /controllers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── agreementController.js
│   │   └── logController.js
│   ├── /models
│   │   ├── User.js
│   │   ├── Agreement.js
│   │   └── Log.js
│   ├── /middleware
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── /services
│   │   ├── pdfService.js
│   │   ├── emailService.js
│   │   ├── smsService.js
│   │   └── whatsappService.js
│   └── server.js
├── /database
│   └── db.json (או MongoDB)
├── package.json
└── turbo.json
```

---

## תהליך עבודה

### 1. צד מנהל

#### 1.1 התחברות
```
[עמוד התחברות]
├── שם משתמש
├── סיסמא
└── כפתור התחברות
```

#### 1.2 ניהול משתמשים
```
[עמוד מנהל]
├── יצירת משתמש חדש
│   ├── שם מלא
│   ├── טלפון
│   ├── שם משתמש
│   └── סיסמא
├── רשימת משתמשים קיימים
└── עריכה/מחיקה של משתמשים
```

### 2. צד משתמש (עובד)

#### 2.1 התחברות
- כניסה עם שם משתמש וסיסמא שנתקבלו מהמנהל

#### 2.2 בחירת סוג הסכם
```
[תפריט ראשי]
├── כפתור: "הסכם במטק בע"מ"
└── כפתור: "הסכם בגדא בע"מ"
```

#### 2.3 מילוי טופס הסכם

| שדה | מזהה | תיאור |
|-----|------|-------|
| שם החברה | XXX1 | שם החברה/העסק של הלקוח |
| ח.פ | XXX2 | מספר חברה/עוסק |
| שם פרטי | XXX3 | שם איש קשר |
| ת.ז | XXX4 | תעודת זהות |
| סכום חודשי | XXX5 | סכום בש"ח (ללא מע"מ) |
| יום תשלום | XXX6 | תאריך בחודש לתשלום |
| תאריך תוקף | XXX7 | תאריך כניסה לתוקף |
| משך תקופה | XXX8 | מספר חודשים |
| תאריך הסכם | XXX9 | תאריך חתימת ההסכם |

#### 2.4 שליחת ההסכם ללקוח
לאחר לחיצה על "שליחה" יפתח **Sweet Alert** עם 3 אפשרויות:

```
┌─────────────────────────────────────┐
│         שליחת הסכם ללקוח            │
├─────────────────────────────────────┤
│  [📱 WhatsApp]                      │
│  שליחה ישירה / בחירה מאנשי קשר     │
├─────────────────────────────────────┤
│  [💬 SMS]                           │
│  הזנת מספר טלפון                    │
├─────────────────────────────────────┤
│  [📧 Email]                         │
│  הזנת כתובת מייל                    │
└─────────────────────────────────────┘
```

### 3. צד לקוח

#### 3.1 קבלת הקישור
- הלקוח מקבל קישור ב-WhatsApp/SMS/Email

#### 3.2 עמוד צפייה בהסכם
```
[עמוד לקוח]
├── כפתור "פתח PDF" (למעלה)
├── תצוגת ההסכם המלא (גלילה)
├── כפתור "חזור לחתימה"
├── שדה ציור חתימה (XXX10)
└── כפתור "שלח הסכם חתום"
```

#### 3.3 תאימות מובייל - **חשוב מאוד!**
| פלטפורמה | גרסאות |
|----------|--------|
| Android | ישן וחדש (API 21+) |
| iOS | Safari, Chrome |
| אחר | כל דפדפן מודרני |

**נקודות קריטיות:**
- שדות תאריך מותאמים ל-Safari (בעיית גבולות)
- שדה חתימה רספונסיבי
- כפתורים גדולים ונגישים
- טקסט קריא בכל גודל מסך

#### 3.4 שליחת ההסכם החתום
לאחר חתימה יפתח **Sweet Alert** עם 3 אפשרויות:

```
┌─────────────────────────────────────┐
│       שליחת הסכם חתום              │
├─────────────────────────────────────┤
│  [📧 Email]                         │
│  שליחה ל: orenshp77@gmail.com       │
├─────────────────────────────────────┤
│  [📱 WhatsApp]                      │
│  שליחה ישירה / בחירה מאנשי קשר     │
├─────────────────────────────────────┤
│  [💬 SMS]                           │
│  הזנת מספר טלפון                    │
└─────────────────────────────────────┘
```

---

## הסכמים - מבנה ועיצוב

### הסכם במטק בע"מ (ב.מ.טק - PDF)
- **חברה:** Reshet Times מקבוצת במטק בע"מ
- **ח.פ חברה (בחותמת):** 514074???
- **כתובת:** דרך חיפה 19, קריית אתא
- **צבע רקע:** #FFE4E1 (ורוד בהיר)
- **צבע כותרות:** #FF0000 (אדום)

### הסכם בגדא בע"מ (בגדא - PDF)
- **חברה:** RESHET TIMES – AIweon מקבוצת בגדא בע"מ
- **ח.פ חברה (בחותמת):** 515100352
- **כתובת:** דרך חיפה 19, קריית אתא
- **צבע רקע:** #FFE4E1 (ורוד בהיר)
- **צבע כותרות:** #FF0000 (אדום)

### מבנה ההסכם (13 עמודים)
1. **עמוד שער** - לוגו ושנה
2. **עמוד 2** - פרטי הצדדים ועיקרי השירות
3. **עמוד 3** - פירוט שירותים (חבילת AIweon)
4. **עמוד 4** - פירוט שירותים (רשת טיימס + נוספים)
5. **עמוד 5** - חיובים והוצאות
6. **עמוד 6** - שונות וחתימות ראשיות
7. **עמודים 7-13** - נספח א' (פירוט השירותים)

### חותמת חברה
- בכל הסכם מופיעה **חותמת החברה** כציור קבוע
- במטק: חותמת עם ח.פ 514074???
- בגדא: חותמת עם ח.פ 515100352

---

## מערכת LOG

### סוגי לוגים
| סוג | תיאור |
|-----|-------|
| ERROR | שגיאות מערכת |
| WARNING | אזהרות |
| INFO | פעולות רגילות |
| AUTH | התחברויות/התנתקויות |
| SIGN | חתימות הסכמים |
| SEND | שליחות הודעות |

### מבנה לוג
```json
{
  "id": "uuid",
  "timestamp": "2026-02-12T10:30:00Z",
  "type": "ERROR | WARNING | INFO | AUTH | SIGN | SEND",
  "user": "username",
  "action": "תיאור הפעולה",
  "details": {
    "agreementId": "...",
    "clientPhone": "...",
    "error": "..."
  },
  "platform": "Android | iOS | Web",
  "browser": "Chrome | Safari | ..."
}
```

### עמוד לוגים (למנהל)
- תצוגת טבלה עם סינון לפי:
  - סוג לוג
  - תאריך
  - משתמש
  - פלטפורמה
- ייצוא ל-CSV/Excel

---

## עמוד עריכת הסכם

### תכונות
- עריכת טקסט ההסכם
- עריכת שדות הטופס
- תצוגה מקדימה בזמן אמת
- שמירת גרסאות
- שחזור לגרסה קודמת

### הרשאות
- רק מנהלים יכולים לערוך

---

## API Endpoints

### Authentication
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Users
```
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

### Agreements
```
GET    /api/agreements
POST   /api/agreements
GET    /api/agreements/:id
PUT    /api/agreements/:id
POST   /api/agreements/:id/send
POST   /api/agreements/:id/sign
GET    /api/agreements/:id/pdf
```

### Logs
```
GET    /api/logs
GET    /api/logs/export
```

### Templates
```
GET    /api/templates
PUT    /api/templates/:type
```

---

## Database Schema

### Users
```javascript
{
  id: String,
  fullName: String,
  phone: String,
  username: String,
  password: String (hashed),
  role: "admin" | "user",
  createdAt: Date,
  updatedAt: Date
}
```

### Agreements
```javascript
{
  id: String,
  type: "bmatek" | "bagda",
  status: "draft" | "sent" | "signed" | "completed",
  createdBy: String (userId),

  // פרטי הלקוח
  companyName: String,      // XXX1
  companyId: String,        // XXX2
  contactName: String,      // XXX3
  contactId: String,        // XXX4

  // פרטי ההסכם
  monthlyAmount: Number,    // XXX5
  paymentDay: Number,       // XXX6
  effectiveDate: Date,      // XXX7
  duration: Number,         // XXX8
  agreementDate: Date,      // XXX9

  // חתימות
  clientSignature: String,  // XXX10 (base64)
  companyStamp: String,     // חותמת החברה

  // מטא
  sentAt: Date,
  sentVia: "whatsapp" | "sms" | "email",
  signedAt: Date,
  pdfUrl: String,

  createdAt: Date,
  updatedAt: Date
}
```

### Logs
```javascript
{
  id: String,
  timestamp: Date,
  type: String,
  userId: String,
  action: String,
  details: Object,
  platform: String,
  browser: String,
  ip: String
}
```

---

## שירותי שליחה

### WhatsApp
- שימוש ב-WhatsApp Web API
- קישור ישיר: `https://wa.me/{phone}?text={encodedMessage}`
- אופציה לבחירה מאנשי קשר

### SMS
- אינטגרציה עם ספק SMS (לדוגמה: Twilio, InfoBip)
- שליחת קישור קצר

### Email
- שימוש ב-Nodemailer
- תבנית HTML מעוצבת
- צירוף PDF

---

## אבטחה

### הצפנה
- סיסמאות: bcrypt
- JWT לאימות
- HTTPS בלבד

### הרשאות
| פעולה | מנהל | משתמש | לקוח |
|-------|------|-------|------|
| ניהול משתמשים | ✓ | ✗ | ✗ |
| יצירת הסכם | ✓ | ✓ | ✗ |
| צפייה בהסכם | ✓ | ✓ | ✓* |
| חתימה | ✗ | ✗ | ✓ |
| צפייה בלוגים | ✓ | ✗ | ✗ |
| עריכת תבנית | ✓ | ✗ | ✗ |

*לקוח רואה רק את ההסכם שלו

---

## Deployment - Render.com

### Environment Variables
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secret-key
DATABASE_URL=your-database-url
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email
EMAIL_PASS=your-password
SMS_API_KEY=your-sms-api-key
```

### Build Command
```bash
npm install && npm run build
```

### Start Command
```bash
npm start
```

---

## רשימת משימות לפיתוח

### Phase 1 - תשתית
- [ ] הקמת פרויקט Node.js/Express
- [ ] הגדרת TurboPack
- [ ] מבנה תיקיות
- [ ] חיבור למסד נתונים
- [ ] מערכת אימות (JWT)

### Phase 2 - Backend
- [ ] API למשתמשים
- [ ] API להסכמים
- [ ] יצירת PDF
- [ ] שירותי שליחה (WhatsApp, SMS, Email)
- [ ] מערכת לוגים

### Phase 3 - Frontend
- [ ] עמוד התחברות
- [ ] עמוד מנהל
- [ ] עמוד בחירת הסכם
- [ ] טופס הסכם (במטק + בגדא)
- [ ] עמוד לקוח עם חתימה
- [ ] תצוגת PDF

### Phase 4 - עיצוב ו-UX
- [ ] Dark Mode
- [ ] רספונסיביות (מובייל)
- [ ] תאימות Safari
- [ ] Sweet Alerts
- [ ] Loader animations

### Phase 5 - בדיקות
- [ ] בדיקות Android (ישן + חדש)
- [ ] בדיקות iOS/Safari
- [ ] בדיקות Desktop
- [ ] בדיקות אבטחה

### Phase 6 - Deployment
- [ ] העלאה ל-Render.com
- [ ] הגדרת Domain
- [ ] SSL Certificate
- [ ] ניטור ולוגים

---

## הערות נוספות

1. **חותמת החברה** - צריכה להופיע כציור קבוע בכל הסכם
2. **תאימות מובייל** - עדיפות גבוהה! רוב החתימות יהיו ממובייל
3. **Safari** - בדיקה מיוחדת לשדות תאריך
4. **ביצועים** - שימוש ב-TurboPack לטעינה מהירה
5. **לוגים** - תיעוד מקיף לכל פעולה ושגיאה

---

## יצירת קשר

- **מייל לקבלת הסכמים:** orenshp77@gmail.com
- **כתובת החברה:** דרך חיפה 19, קריית אתא

---

*מסמך זה מתאר את מערכת החתמת ההסכמים עבור Reshet Times / AIweon*
*גרסה: 1.0*
*תאריך: פברואר 2026*
