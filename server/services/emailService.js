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

module.exports = {
    sendAgreementEmail,
    sendSignedNotification
};
