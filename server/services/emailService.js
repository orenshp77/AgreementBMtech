const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Send agreement link to client
async function sendAgreementEmail(recipientEmail, signingLink, agreementData) {
    const mailOptions = {
        from: `"Reshet Times" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `הסכם לחתימה - ${agreementData.companyName}`,
        html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: #fff; margin: 0; text-align: center;">Reshet Times</h1>
                </div>

                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333; margin-top: 0;">שלום,</h2>

                    <p style="color: #555; font-size: 16px; line-height: 1.6;">
                        מצורף הסכם לחתימה עבור <strong>${agreementData.companyName}</strong>.
                    </p>

                    <p style="color: #555; font-size: 16px; line-height: 1.6;">
                        לצפייה וחתימה על ההסכם, לחץ על הכפתור:
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${signingLink}"
                           style="background: linear-gradient(135deg, #00b894, #00cec9);
                                  color: #fff;
                                  padding: 15px 40px;
                                  text-decoration: none;
                                  border-radius: 25px;
                                  font-size: 18px;
                                  font-weight: bold;
                                  display: inline-block;">
                            לחתימה על ההסכם
                        </a>
                    </div>

                    <p style="color: #777; font-size: 14px; margin-top: 30px;">
                        או העתק את הקישור:<br>
                        <a href="${signingLink}" style="color: #0066cc;">${signingLink}</a>
                    </p>

                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

                    <p style="color: #999; font-size: 12px; text-align: center;">
                        Reshet Times - מקבוצת במטק בע"מ<br>
                        דרך חיפה 19, קריית אתא
                    </p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
}

// Send signed agreement notification
async function sendSignedNotification(agreementData) {
    const adminEmail = process.env.EMAIL_TO || 'orenshp77@gmail.com';
    const baseUrl = process.env.BASE_URL || 'https://agreement-signing-system.onrender.com';
    const viewLink = `${baseUrl}/client/${agreementData.id}`;

    const mailOptions = {
        from: `"Reshet Times" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: `הסכם נחתם! - ${agreementData.companyName}`,
        html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #00b894, #00cec9); padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: #fff; margin: 0; text-align: center;">✅ הסכם נחתם!</h1>
                </div>

                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333; margin-top: 0;">פרטי ההסכם:</h2>

                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">שם החברה:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${agreementData.companyName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">איש קשר:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${agreementData.contactName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">סכום חודשי:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">₪${agreementData.monthlyAmount?.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">תאריך חתימה:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date().toLocaleDateString('he-IL')}</td>
                        </tr>
                    </table>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${viewLink}"
                           style="background: linear-gradient(135deg, #3b82f6, #2563eb);
                                  color: #fff;
                                  padding: 15px 40px;
                                  text-decoration: none;
                                  border-radius: 25px;
                                  font-size: 18px;
                                  font-weight: bold;
                                  display: inline-block;">
                            צפייה בהסכם החתום
                        </a>
                    </div>

                    <p style="color: #777; font-size: 14px; margin-top: 20px; text-align: center;">
                        או העתק את הקישור:<br>
                        <a href="${viewLink}" style="color: #0066cc;">${viewLink}</a>
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Notification email error:', error);
        // Don't throw - notification failure shouldn't break the flow
        return { success: false, error: error.message };
    }
}

// Send error notification to admin with code for AI debugging
async function sendErrorNotification(errorData) {
    const adminEmail = process.env.EMAIL_TO || 'orenshp77@gmail.com';
    const baseUrl = process.env.BASE_URL || 'https://agreement-signing-system.onrender.com';

    const {
        error,
        stack,
        action,
        details,
        endpoint,
        method,
        userId,
        timestamp,
        ip,
        userAgent
    } = errorData;

    // Format the AI-ready debug block
    const aiDebugBlock = `
=== שגיאה במערכת הסכמים ===
תאריך: ${timestamp}
פעולה: ${action}
Endpoint: ${method || 'N/A'} ${endpoint || 'N/A'}
משתמש: ${userId || 'אנונימי'}
IP: ${ip || 'N/A'}

=== הודעת שגיאה ===
${error}

=== Stack Trace ===
${stack || 'לא זמין'}

=== פרטים נוספים ===
${JSON.stringify(details, null, 2)}

=== הוראות ל-AI ===
אנא נתח את השגיאה הזו ותן פתרון.
קבצים רלוונטיים במערכת:
- server/server.js - שרת ראשי
- server/routes/agreements.js - ניהול הסכמים
- server/routes/auth.js - אימות
- server/routes/users.js - ניהול משתמשים
- server/middleware/auth.js - middleware אימות
- server/database/index.js - פעולות מסד נתונים
`.trim();

    const mailOptions = {
        from: `"מערכת הסכמים - התראה" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: `⚠️ שגיאה במערכת: ${action}`,
        html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: #fff; margin: 0; text-align: center;">⚠️ התראת שגיאה</h1>
                </div>

                <div style="background: #fef2f2; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #dc2626; margin-top: 0;">פרטי השגיאה:</h2>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #fecaca; font-weight: bold; width: 120px;">תאריך:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #fecaca;">${new Date(timestamp).toLocaleString('he-IL')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #fecaca; font-weight: bold;">פעולה:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #fecaca;">${action}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #fecaca; font-weight: bold;">Endpoint:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #fecaca;">${method || ''} ${endpoint || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #fecaca; font-weight: bold;">שגיאה:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #fecaca; color: #dc2626;">${error}</td>
                        </tr>
                    </table>

                    <h3 style="color: #333;">📋 העתק את הקוד הזה ל-AI לתיקון:</h3>
                    <div style="background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 12px; overflow-x: auto; white-space: pre-wrap; direction: ltr; text-align: left;">
${aiDebugBlock.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                    </div>

                    <div style="margin-top: 20px; text-align: center;">
                        <a href="${baseUrl}/logs"
                           style="background: #3b82f6; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            צפה בלוגים המלאים
                        </a>
                    </div>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Error notification sent to admin');
        return { success: true };
    } catch (emailError) {
        console.error('Failed to send error notification:', emailError);
        return { success: false, error: emailError.message };
    }
}

module.exports = {
    sendAgreementEmail,
    sendSignedNotification,
    sendErrorNotification
};
