# Checklist - לפני כל Deploy

## חובה לבדוק לפני העלאה לפרודקשן

### 1. שדות חדשים בדאטאבייס
- [ ] הוספתי את השדות ל-`server/database/schema.sql` (בטבלה הראשית)
- [ ] הוספתי מיגרציה DO $$ ... END $$ לדאטאבייס קיים
- [ ] הוספתי מיפוי ל-`fieldMappings` ב-`server/database/index.js`
- [ ] אם יש JSON fields - הוספתי ל-`jsonFields`

### 2. Routes חדשים
- [ ] ה-route במיקום הנכון (לפני `/:id` אם יש `/:id/something`)
- [ ] יש `verifyToken` אם צריך אימות
- [ ] יש `isAdmin` אם צריך הרשאות מנהל
- [ ] יש `createLog` לכל פעולה חשובה
- [ ] יש `createLog('ERROR', ...)` בכל catch block

### 3. Frontend
- [ ] בדקתי שעובד בלוקלי
- [ ] אין שגיאות ב-Console

### 4. Git & Deploy
- [ ] `git status` - כל הקבצים הרלוונטיים נוספו
- [ ] `git push origin main` - הצליח
- [ ] המתנתי ל-Render deploy (2-3 דקות)
- [ ] בדקתי `/health` - uptime קטן = deploy הצליח
- [ ] בדקתי את הפיצ'ר בפרודקשן

### 5. התראות
- [ ] שגיאות שולחות מייל (סוג ERROR ב-createLog)
- [ ] שגיאות client-side נתפסות ב-main.js

---

## פקודות שימושיות

```bash
# בדיקת סטטוס
git status
git log --oneline -3

# העלאה לפרודקשן
git add [files]
git commit -m "תיאור"
git push origin main

# בדיקת health
curl https://agreement-signing-system.onrender.com/health
```

---

## שדות קיימים ב-agreements

| JavaScript | PostgreSQL |
|------------|------------|
| type | type |
| status | status |
| createdBy | created_by |
| createdByName | created_by_name |
| companyName | company_name |
| companyId | company_id |
| contactName | contact_name |
| contactId | contact_id |
| monthlyAmount | monthly_amount |
| paymentDay | payment_day |
| effectiveDate | effective_date |
| duration | duration |
| agreementDate | agreement_date |
| notes | notes |
| clientSignature | client_signature |
| companyStamp | company_stamp |
| sentAt | sent_at |
| sentVia | sent_via |
| sentTo | sent_to |
| signedAt | signed_at |
| pdfUrl | pdf_url |
| printed | printed |
| printedAt | printed_at |
| printedBy | printed_by |
| printedByName | printed_by_name |
| deletedAt | deleted_at |
| selectedServices | selected_services (JSON) |
| companyTemplate | company_template (JSON) |
| driveBackup | drive_backup (JSON) |
