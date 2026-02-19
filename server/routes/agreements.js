const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Agreements, Templates } = require('../database');
const { verifyToken, isAdmin, createLog } = require('../middleware/auth');
const { sendAgreementEmail, sendSignedNotification } = require('../services/emailService');
const { signatureLimiter } = require('../middleware/security');

const router = express.Router();

// Get all agreements (all users see all agreements)
router.get('/', verifyToken, async (req, res) => {
    try {
        // All users can see all agreements
        const agreements = await Agreements.getAll();

        res.json({
            success: true,
            data: agreements
        });
    } catch (error) {
        console.error('Get agreements error:', error);
        await createLog('ERROR', req.user.id, 'Error fetching agreements', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת הסכמים'
        });
    }
});

// Get single agreement (for viewing/signing)
router.get('/:id', async (req, res) => {
    try {
        const agreement = await Agreements.getById(req.params.id);

        if (!agreement) {
            return res.status(404).json({
                success: false,
                message: 'הסכם לא נמצא'
            });
        }

        res.json({
            success: true,
            data: agreement
        });
    } catch (error) {
        console.error('Get agreement error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת הסכם'
        });
    }
});

// Create new agreement
router.post('/', verifyToken, async (req, res) => {
    try {
        const {
            type, // 'bmatek' or 'bagda'
            companyName,    // XXX1
            companyId,      // XXX2
            contactName,    // XXX3
            contactId,      // XXX4
            monthlyAmount,  // XXX5
            paymentDay,     // XXX6
            effectiveDate,  // XXX7
            duration,       // XXX8
            agreementDate,  // XXX9
            selectedServices, // Services from appendix
            notes           // Notes field
        } = req.body;

        // Validation
        if (!type || !['bmatek', 'bagda'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'סוג הסכם לא תקין'
            });
        }

        if (!companyName || !companyId) {
            return res.status(400).json({
                success: false,
                message: 'נא למלא את שם החברה וח.פ/עוסק מורשה'
            });
        }

        if (!monthlyAmount || !effectiveDate || !duration) {
            return res.status(400).json({
                success: false,
                message: 'נא למלא את כל פרטי ההסכם'
            });
        }

        // Get company template
        const template = await Templates.get(type);

        const newAgreement = {
            id: uuidv4(),
            type,
            status: 'draft',
            createdBy: req.user.id,
            createdByName: req.user.fullName,

            // Client details
            companyName,
            companyId,
            contactName,
            contactId,

            // Agreement details
            monthlyAmount: Number(monthlyAmount),
            paymentDay: paymentDay ? Number(paymentDay) : null,
            effectiveDate,
            duration: Number(duration),
            agreementDate: agreementDate || new Date().toISOString().split('T')[0],

            // Selected services
            selectedServices: selectedServices || {},

            // Notes
            notes: notes || '',

            // Company template info
            companyTemplate: template,

            // Signatures (empty until signed)
            clientSignature: null,
            companyStamp: template.companyId,

            // Meta
            sentAt: null,
            sentVia: null,
            signedAt: null,
            pdfUrl: null,

            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const createdAgreement = await Agreements.create(newAgreement);

        await createLog('INFO', req.user.id, 'Agreement created', {
            agreementId: newAgreement.id,
            type,
            clientName: companyName
        }, req);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('agreement:created', createdAgreement);
        }

        res.status(201).json({
            success: true,
            message: 'הסכם נוצר בהצלחה',
            data: createdAgreement
        });

    } catch (error) {
        console.error('Create agreement error:', error);
        await createLog('ERROR', req.user.id, 'Error creating agreement', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת הסכם'
        });
    }
});

// Update agreement
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const agreementId = req.params.id;
        const agreement = await Agreements.getById(agreementId);

        if (!agreement) {
            return res.status(404).json({
                success: false,
                message: 'הסכם לא נמצא'
            });
        }

        // Only creator or admin can update
        if (req.user.role !== 'admin' && req.user.id !== agreement.createdBy) {
            return res.status(403).json({
                success: false,
                message: 'אין הרשאה לעדכן הסכם זה'
            });
        }

        // Cannot update signed agreements
        if (agreement.status === 'signed' || agreement.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'לא ניתן לעדכן הסכם שכבר נחתם'
            });
        }

        const updates = { ...req.body };
        delete updates.id;
        delete updates.createdBy;
        delete updates.createdAt;
        delete updates.clientSignature;

        const updatedAgreement = await Agreements.update(agreementId, updates);

        await createLog('INFO', req.user.id, 'Agreement updated', { agreementId }, req);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('agreement:updated', updatedAgreement);
        }

        res.json({
            success: true,
            message: 'הסכם עודכן בהצלחה',
            data: updatedAgreement
        });

    } catch (error) {
        console.error('Update agreement error:', error);
        await createLog('ERROR', req.user.id, 'Error updating agreement', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון הסכם'
        });
    }
});

// Send agreement to client
router.post('/:id/send', verifyToken, async (req, res) => {
    try {
        const { via, recipient } = req.body; // via: 'whatsapp' | 'sms' | 'email'
        const agreementId = req.params.id;

        const agreement = await Agreements.getById(agreementId);

        if (!agreement) {
            return res.status(404).json({
                success: false,
                message: 'הסכם לא נמצא'
            });
        }

        if (!['whatsapp', 'sms', 'email', 'link'].includes(via)) {
            return res.status(400).json({
                success: false,
                message: 'אמצעי שליחה לא תקין'
            });
        }

        // Generate signing link
        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        const signingLink = `${baseUrl}/sign/${agreementId}`;

        // If sending via email, actually send the email
        if (via === 'email' && recipient) {
            try {
                await sendAgreementEmail(recipient, signingLink, agreement);
            } catch (emailError) {
                console.error('Email send failed:', emailError);
                return res.status(500).json({
                    success: false,
                    message: 'שגיאה בשליחת המייל: ' + emailError.message
                });
            }
        }

        // Update agreement status
        await Agreements.update(agreementId, {
            status: 'sent',
            sentAt: new Date().toISOString(),
            sentVia: via,
            sentTo: recipient
        });

        await createLog('SEND', req.user.id, `Agreement sent via ${via}`, {
            agreementId,
            via,
            recipient
        }, req);

        res.json({
            success: true,
            message: 'ההסכם נשלח בהצלחה',
            data: {
                signingLink,
                via,
                recipient
            }
        });

    } catch (error) {
        console.error('Send agreement error:', error);
        await createLog('ERROR', req.user.id, 'Error sending agreement', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בשליחת הסכם'
        });
    }
});

// Sign agreement (client endpoint - no auth required, rate limited)
router.post('/:id/sign', signatureLimiter, async (req, res) => {
    try {
        const { signature } = req.body; // Base64 signature image
        const agreementId = req.params.id;

        if (!signature) {
            return res.status(400).json({
                success: false,
                message: 'נא לחתום על ההסכם'
            });
        }

        const agreement = await Agreements.getById(agreementId);

        if (!agreement) {
            return res.status(404).json({
                success: false,
                message: 'הסכם לא נמצא'
            });
        }

        if (agreement.status === 'signed' || agreement.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'ההסכם כבר נחתם'
            });
        }

        // Update agreement with signature
        const updatedAgreement = await Agreements.update(agreementId, {
            status: 'signed',
            clientSignature: signature,
            signedAt: new Date().toISOString()
        });

        await createLog('SIGN', null, 'Agreement signed by client', {
            agreementId,
            clientName: agreement.companyName
        }, req);

        // Send notification email to admin
        sendSignedNotification(agreement).catch(err => {
            console.error('Failed to send signed notification:', err);
        });

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('agreement:signed', updatedAgreement);
        }

        res.json({
            success: true,
            message: 'ההסכם נחתם בהצלחה',
            data: {
                agreementId,
                signedAt: updatedAgreement.signedAt
            }
        });

    } catch (error) {
        console.error('Sign agreement error:', error);
        await createLog('ERROR', null, 'Error signing agreement', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בחתימת הסכם'
        });
    }
});

// Delete agreement (admin can delete all, users can delete only their own)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const agreementId = req.params.id;
        const agreement = await Agreements.getById(agreementId);

        if (!agreement) {
            return res.status(404).json({
                success: false,
                message: 'הסכם לא נמצא'
            });
        }

        // Admin can delete any agreement, regular users can only delete their own
        if (req.user.role !== 'admin' && req.user.id !== agreement.createdBy) {
            return res.status(403).json({
                success: false,
                message: `הסכם זה נוצר ע"י ${agreement.createdByName || 'משתמש אחר'}, רק הוא מורשה למחוק אותו`
            });
        }

        await Agreements.delete(agreementId);

        await createLog('INFO', req.user.id, 'Agreement moved to recycle bin', {
            agreementId,
            clientName: agreement.companyName
        }, req);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('agreement:deleted', { id: agreementId });
        }

        res.json({
            success: true,
            message: 'הסכם הועבר לסל המחזור'
        });

    } catch (error) {
        console.error('Delete agreement error:', error);
        await createLog('ERROR', req.user.id, 'Error deleting agreement', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה במחיקת הסכם'
        });
    }
});

// ============== RECYCLE BIN ROUTES (Admin Only) ==============

// Get all deleted agreements (recycle bin)
router.get('/recycle-bin', verifyToken, isAdmin, async (req, res) => {
    try {
        const deletedAgreements = await Agreements.getDeleted();
        res.json({
            success: true,
            data: deletedAgreements
        });
    } catch (error) {
        console.error('Get recycle bin error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת סל המחזור'
        });
    }
});

// Restore agreement from recycle bin
router.post('/recycle-bin/:id/restore', verifyToken, isAdmin, async (req, res) => {
    try {
        const agreementId = req.params.id;
        const agreement = await Agreements.restore(agreementId);

        if (!agreement) {
            return res.status(404).json({
                success: false,
                message: 'הסכם לא נמצא בסל המחזור'
            });
        }

        await createLog('INFO', req.user.id, 'Agreement restored from recycle bin', {
            agreementId,
            clientName: agreement.companyName
        }, req);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('agreement:created', agreement);
        }

        res.json({
            success: true,
            message: 'הסכם שוחזר בהצלחה',
            data: agreement
        });

    } catch (error) {
        console.error('Restore agreement error:', error);
        await createLog('ERROR', req.user.id, 'Error restoring agreement', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בשחזור הסכם'
        });
    }
});

// Permanently delete agreement from recycle bin
router.delete('/recycle-bin/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const agreementId = req.params.id;
        const deleted = await Agreements.permanentDelete(agreementId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'הסכם לא נמצא'
            });
        }

        await createLog('INFO', req.user.id, 'Agreement permanently deleted', {
            agreementId
        }, req);

        res.json({
            success: true,
            message: 'הסכם נמחק לצמיתות'
        });

    } catch (error) {
        console.error('Permanent delete error:', error);
        await createLog('ERROR', req.user.id, 'Error permanently deleting agreement', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה במחיקה לצמיתות'
        });
    }
});

// Empty entire recycle bin
router.delete('/recycle-bin', verifyToken, isAdmin, async (req, res) => {
    try {
        await Agreements.emptyRecycleBin();

        await createLog('INFO', req.user.id, 'Recycle bin emptied', {}, req);

        res.json({
            success: true,
            message: 'סל המחזור רוקן בהצלחה'
        });

    } catch (error) {
        console.error('Empty recycle bin error:', error);
        await createLog('ERROR', req.user.id, 'Error emptying recycle bin', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בריקון סל המחזור'
        });
    }
});

// Get templates
router.get('/templates/:type', verifyToken, async (req, res) => {
    try {
        const template = await Templates.get(req.params.type);

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'תבנית לא נמצאה'
            });
        }

        res.json({
            success: true,
            data: template
        });
    } catch (error) {
        console.error('Get template error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת תבנית'
        });
    }
});


// Update template (admin only)
router.put('/templates/:type', verifyToken, isAdmin, async (req, res) => {
    try {
        const type = req.params.type;
        const updates = req.body;

        const updatedTemplate = await Templates.update(type, updates);

        await createLog('INFO', req.user.id, 'Template updated', { type }, req);

        res.json({
            success: true,
            message: 'תבנית עודכנה בהצלחה',
            data: updatedTemplate
        });
    } catch (error) {
        console.error('Update template error:', error);
        await createLog('ERROR', req.user.id, 'Error updating template', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון תבנית'
        });
    }
});

module.exports = router;
