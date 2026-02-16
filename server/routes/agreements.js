const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Agreements, Templates } = require('../database');
const { verifyToken, isAdmin, createLog } = require('../middleware/auth');

const router = express.Router();

// Get all agreements (all users see all agreements)
router.get('/', verifyToken, (req, res) => {
    try {
        // All users can see all agreements
        const agreements = Agreements.getAll();

        res.json({
            success: true,
            data: agreements
        });
    } catch (error) {
        console.error('Get agreements error:', error);
        createLog('ERROR', req.user.id, 'Error fetching agreements', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת הסכמים'
        });
    }
});

// Get single agreement (for viewing/signing)
router.get('/:id', (req, res) => {
    try {
        const agreement = Agreements.getById(req.params.id);

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
router.post('/', verifyToken, (req, res) => {
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

        if (!companyName || !companyId || !contactName || !contactId) {
            return res.status(400).json({
                success: false,
                message: 'נא למלא את כל פרטי הלקוח'
            });
        }

        if (!monthlyAmount || !paymentDay || !effectiveDate || !duration) {
            return res.status(400).json({
                success: false,
                message: 'נא למלא את כל פרטי ההסכם'
            });
        }

        // Get company template
        const template = Templates.get(type);

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
            paymentDay: Number(paymentDay),
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

        const createdAgreement = Agreements.create(newAgreement);

        createLog('INFO', req.user.id, 'Agreement created', {
            agreementId: newAgreement.id,
            type,
            clientName: companyName
        }, req);

        res.status(201).json({
            success: true,
            message: 'הסכם נוצר בהצלחה',
            data: createdAgreement
        });

    } catch (error) {
        console.error('Create agreement error:', error);
        createLog('ERROR', req.user.id, 'Error creating agreement', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת הסכם'
        });
    }
});

// Update agreement
router.put('/:id', verifyToken, (req, res) => {
    try {
        const agreementId = req.params.id;
        const agreement = Agreements.getById(agreementId);

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

        const updatedAgreement = Agreements.update(agreementId, updates);

        createLog('INFO', req.user.id, 'Agreement updated', { agreementId }, req);

        res.json({
            success: true,
            message: 'הסכם עודכן בהצלחה',
            data: updatedAgreement
        });

    } catch (error) {
        console.error('Update agreement error:', error);
        createLog('ERROR', req.user.id, 'Error updating agreement', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון הסכם'
        });
    }
});

// Send agreement to client
router.post('/:id/send', verifyToken, (req, res) => {
    try {
        const { via, recipient } = req.body; // via: 'whatsapp' | 'sms' | 'email'
        const agreementId = req.params.id;

        const agreement = Agreements.getById(agreementId);

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

        // Update agreement status
        Agreements.update(agreementId, {
            status: 'sent',
            sentAt: new Date().toISOString(),
            sentVia: via,
            sentTo: recipient
        });

        createLog('SEND', req.user.id, `Agreement sent via ${via}`, {
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
        createLog('ERROR', req.user.id, 'Error sending agreement', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בשליחת הסכם'
        });
    }
});

// Sign agreement (client endpoint - no auth required)
router.post('/:id/sign', (req, res) => {
    try {
        const { signature } = req.body; // Base64 signature image
        const agreementId = req.params.id;

        if (!signature) {
            return res.status(400).json({
                success: false,
                message: 'נא לחתום על ההסכם'
            });
        }

        const agreement = Agreements.getById(agreementId);

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
        const updatedAgreement = Agreements.update(agreementId, {
            status: 'signed',
            clientSignature: signature,
            signedAt: new Date().toISOString()
        });

        createLog('SIGN', null, 'Agreement signed by client', {
            agreementId,
            clientName: agreement.companyName
        }, req);

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
        createLog('ERROR', null, 'Error signing agreement', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בחתימת הסכם'
        });
    }
});

// Delete agreement (admin can delete all, users can delete only their own)
router.delete('/:id', verifyToken, (req, res) => {
    try {
        const agreementId = req.params.id;
        const agreement = Agreements.getById(agreementId);

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

        Agreements.delete(agreementId);

        createLog('INFO', req.user.id, 'Agreement deleted', {
            agreementId,
            clientName: agreement.companyName
        }, req);

        res.json({
            success: true,
            message: 'הסכם נמחק בהצלחה'
        });

    } catch (error) {
        console.error('Delete agreement error:', error);
        createLog('ERROR', req.user.id, 'Error deleting agreement', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה במחיקת הסכם'
        });
    }
});

// Get templates
router.get('/templates/:type', verifyToken, (req, res) => {
    try {
        const template = Templates.get(req.params.type);

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
router.put('/templates/:type', verifyToken, isAdmin, (req, res) => {
    try {
        const type = req.params.type;
        const updates = req.body;

        const updatedTemplate = Templates.update(type, updates);

        createLog('INFO', req.user.id, 'Template updated', { type }, req);

        res.json({
            success: true,
            message: 'תבנית עודכנה בהצלחה',
            data: updatedTemplate
        });
    } catch (error) {
        console.error('Update template error:', error);
        createLog('ERROR', req.user.id, 'Error updating template', { error: error.message }, req);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון תבנית'
        });
    }
});

module.exports = router;
