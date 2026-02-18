const rateLimit = require('express-rate-limit');
const { createLog } = require('./auth');

// Suspicious patterns to detect
const SUSPICIOUS_PATTERNS = [
    // SQL Injection
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
    /('|"|;|--|\*|\/\*|\*\/)/,
    // XSS
    /<script[^>]*>|<\/script>|javascript:|on\w+\s*=/i,
    // Path Traversal
    /\.\.\//,
    /\.\.\\/,
    // Command Injection
    /[;&|`$]/,
    // Common attack payloads
    /eval\s*\(/i,
    /base64_decode/i,
    /document\.(cookie|location|write)/i
];

// Check if request contains suspicious content
function containsSuspiciousContent(obj, path = '') {
    if (!obj) return null;

    if (typeof obj === 'string') {
        for (const pattern of SUSPICIOUS_PATTERNS) {
            if (pattern.test(obj)) {
                return { path, value: obj.substring(0, 100), pattern: pattern.toString() };
            }
        }
    } else if (typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            const result = containsSuspiciousContent(obj[key], path ? `${path}.${key}` : key);
            if (result) return result;
        }
    }
    return null;
}

// Security middleware - detect and log suspicious requests
async function securityCheck(req, res, next) {
    const suspicious = containsSuspiciousContent(req.body) ||
                       containsSuspiciousContent(req.query) ||
                       containsSuspiciousContent(req.params);

    if (suspicious) {
        await createLog('SECURITY', null, 'Suspicious request detected', {
            type: 'POTENTIAL_ATTACK',
            path: req.path,
            method: req.method,
            field: suspicious.path,
            pattern: suspicious.pattern,
            valuePreview: suspicious.value
        }, req);

        // Don't block, just log (to avoid false positives)
        // For strict mode, uncomment:
        // return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    next();
}

// Rate limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: {
        success: false,
        message: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות'
    },
    handler: async (req, res, next, options) => {
        await createLog('SECURITY', null, 'Rate limit exceeded - login', {
            type: 'BRUTE_FORCE_ATTEMPT',
            ip: req.ip,
            username: req.body?.username
        }, req);
        res.status(options.statusCode).json(options.message);
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiter for API requests
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
        success: false,
        message: 'יותר מדי בקשות. נסה שוב בעוד דקה'
    },
    handler: async (req, res, next, options) => {
        await createLog('SECURITY', req.user?.id || null, 'Rate limit exceeded - API', {
            type: 'RATE_LIMIT_EXCEEDED',
            path: req.path
        }, req);
        res.status(options.statusCode).json(options.message);
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiter for signature endpoint (more strict)
const signatureLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 signatures per hour per IP
    message: {
        success: false,
        message: 'יותר מדי חתימות. נסה שוב מאוחר יותר'
    },
    handler: async (req, res, next, options) => {
        await createLog('SECURITY', null, 'Rate limit exceeded - signatures', {
            type: 'SIGNATURE_SPAM_ATTEMPT',
            agreementId: req.params?.id
        }, req);
        res.status(options.statusCode).json(options.message);
    }
});

// Block sensitive endpoints in production
function blockInProduction(req, res, next) {
    if (process.env.NODE_ENV === 'production') {
        createLog('SECURITY', null, 'Blocked access to sensitive endpoint', {
            type: 'SENSITIVE_ENDPOINT_ACCESS',
            path: req.path
        }, req);
        return res.status(403).json({
            success: false,
            message: 'Endpoint disabled in production'
        });
    }
    next();
}

// Log unauthorized access attempts
async function logUnauthorizedAccess(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
        if (res.statusCode === 401 || res.statusCode === 403) {
            createLog('SECURITY', req.user?.id || null, 'Unauthorized access attempt', {
                type: res.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
                path: req.path,
                method: req.method,
                statusCode: res.statusCode
            }, req);
        }
        return originalJson(data);
    };
    next();
}

module.exports = {
    securityCheck,
    loginLimiter,
    apiLimiter,
    signatureLimiter,
    blockInProduction,
    logUnauthorizedAccess
};
