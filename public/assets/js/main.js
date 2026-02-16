/**
 * Agreement Signing System - Main JavaScript
 */

// API Base URL
const API_URL = '/api';

// ==================== Utility Functions ====================

// Show loader
function showLoader(text = 'טוען...') {
    const existingLoader = document.querySelector('.loader-overlay');
    if (existingLoader) {
        existingLoader.classList.add('active');
        const loaderText = existingLoader.querySelector('.loader-text');
        if (loaderText) loaderText.textContent = text;
        return;
    }

    const loader = document.createElement('div');
    loader.className = 'loader-overlay active';
    loader.innerHTML = `
        <div class="flex flex-col items-center">
            <div class="loader"></div>
            <p class="loader-text">${text}</p>
        </div>
    `;
    document.body.appendChild(loader);
}

// Hide loader
function hideLoader() {
    const loader = document.querySelector('.loader-overlay');
    if (loader) {
        loader.classList.remove('active');
    }
}

// Get auth token
function getToken() {
    return localStorage.getItem('authToken');
}

// Set auth token
function setToken(token) {
    localStorage.setItem('authToken', token);
}

// Remove auth token
function removeToken() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
}

// Get current user
function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Set current user
function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// Check if user is logged in
function isLoggedIn() {
    return !!getToken();
}

// Check if user is admin
function isAdmin() {
    const user = getUser();
    return user && user.role === 'admin';
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

// Redirect to dashboard if already logged in
function redirectIfLoggedIn() {
    if (isLoggedIn()) {
        window.location.href = '/dashboard';
    }
}

// ==================== API Functions ====================

// Make API request
async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            // Handle unauthorized
            if (response.status === 401) {
                removeToken();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
            throw new Error(data.message || 'שגיאה בבקשה');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth API
const authAPI = {
    login: (username, password) =>
        apiRequest('/auth/login', {
            method: 'POST',
            body: { username, password }
        }),

    logout: () =>
        apiRequest('/auth/logout', { method: 'POST' }),

    me: () =>
        apiRequest('/auth/me'),

    changePassword: (currentPassword, newPassword) =>
        apiRequest('/auth/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword }
        }),

    init: () =>
        apiRequest('/auth/init', { method: 'POST' })
};

// Users API
const usersAPI = {
    getAll: () =>
        apiRequest('/users'),

    getById: (id) =>
        apiRequest(`/users/${id}`),

    create: (userData) =>
        apiRequest('/users', {
            method: 'POST',
            body: userData
        }),

    update: (id, userData) =>
        apiRequest(`/users/${id}`, {
            method: 'PUT',
            body: userData
        }),

    delete: (id) =>
        apiRequest(`/users/${id}`, { method: 'DELETE' })
};

// Agreements API
const agreementsAPI = {
    getAll: () =>
        apiRequest('/agreements'),

    getById: (id) =>
        apiRequest(`/agreements/${id}`),

    create: (agreementData) =>
        apiRequest('/agreements', {
            method: 'POST',
            body: agreementData
        }),

    update: (id, agreementData) =>
        apiRequest(`/agreements/${id}`, {
            method: 'PUT',
            body: agreementData
        }),

    send: (id, via, recipient) =>
        apiRequest(`/agreements/${id}/send`, {
            method: 'POST',
            body: { via, recipient }
        }),

    sign: (id, signature) =>
        apiRequest(`/agreements/${id}/sign`, {
            method: 'POST',
            body: { signature }
        }),

    delete: (id) =>
        apiRequest(`/agreements/${id}`, { method: 'DELETE' }),

    getTemplate: (type) =>
        apiRequest(`/agreements/templates/${type}`)
};

// Logs API
const logsAPI = {
    getAll: (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return apiRequest(`/logs${params ? '?' + params : ''}`);
    },

    getStats: () =>
        apiRequest('/logs/stats'),

    export: (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return `${API_URL}/logs/export${params ? '?' + params : ''}`;
    }
};

// ==================== UI Functions ====================

// Show toast notification
function showToast(message, type = 'info') {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: type,
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

// Show confirmation dialog
async function showConfirm(title, text, confirmText = 'אישור', cancelText = 'ביטול') {
    const result = await Swal.fire({
        title,
        text,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true
    });
    return result.isConfirmed;
}

// Show error message
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'שגיאה',
        text: message
    });
}

// Show success message
function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'הצלחה',
        text: message
    });
}

// Format date to Hebrew format
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
}

// Format date for input
function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS'
    }).format(amount);
}

// Get status badge HTML
function getStatusBadge(status) {
    const statusMap = {
        draft: { class: 'badge-draft', text: 'טיוטה' },
        sent: { class: 'badge-sent', text: 'נשלח' },
        signed: { class: 'badge-signed', text: 'נחתם' },
        completed: { class: 'badge-completed', text: 'הושלם' }
    };
    const info = statusMap[status] || { class: 'badge-draft', text: status };
    return `<span class="badge ${info.class}">${info.text}</span>`;
}

// ==================== Send Agreement Functions ====================

// Show send options dialog
async function showSendDialog(agreementId, clientPhone = '', clientEmail = '') {
    const { value: sendMethod } = await Swal.fire({
        title: 'שליחת הסכם ללקוח',
        html: `
            <div class="flex flex-col gap-md" style="text-align: right;">
                <button class="btn btn-success btn-block send-option" data-method="whatsapp">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    שליחה בוואטסאפ
                </button>
                <button class="btn btn-primary btn-block send-option" data-method="sms">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
                    </svg>
                    שליחה ב-SMS
                </button>
                <button class="btn btn-secondary btn-block send-option" data-method="email">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                    שליחה במייל
                </button>
                <button class="btn btn-block send-option" data-method="copy" style="background: var(--bg-tertiary); border: 1px solid var(--border-color);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                    העתק קישור
                </button>
            </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'ביטול',
        didOpen: () => {
            document.querySelectorAll('.send-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    Swal.close({ value: btn.dataset.method });
                });
            });
        },
        preConfirm: () => {
            return null;
        }
    });

    if (!sendMethod) return;

    // Handle copy link separately
    if (sendMethod === 'copy') {
        await handleCopyLink(agreementId);
        return;
    }

    await handleSendMethod(agreementId, sendMethod, clientPhone, clientEmail);
}

// Handle copy link
async function handleCopyLink(agreementId) {
    try {
        showLoader('מייצר קישור...');
        const result = await agreementsAPI.send(agreementId, 'link', '');
        hideLoader();

        const shareLink = result.data.signingLink;

        // Copy to clipboard
        await navigator.clipboard.writeText(shareLink);

        showToast('הקישור הועתק ללוח', 'success');
    } catch (error) {
        hideLoader();
        showError(error.message);
    }
}

// Handle specific send method
async function handleSendMethod(agreementId, method, clientPhone, clientEmail) {
    let recipient = '';

    if (method === 'whatsapp') {
        const { value: formValues } = await Swal.fire({
            title: 'שליחה בוואטסאפ',
            html: `
                <div style="text-align: right;">
                    <label class="form-label">מספר טלפון</label>
                    <input type="tel" id="swal-phone" class="swal2-input" placeholder="05XXXXXXXX" value="${clientPhone}" style="text-align: right; direction: ltr;">
                    <div style="margin-top: 1rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="swal-connect" style="width: 18px; height: 18px;">
                            <span>התחבר לאיש קשר (ללא הודעה)</span>
                        </label>
                    </div>
                </div>
            `,
            showCancelButton: true,
            cancelButtonText: 'ביטול',
            confirmButtonText: 'שלח',
            focusConfirm: false,
            preConfirm: () => {
                const phone = document.getElementById('swal-phone').value;
                const connectOnly = document.getElementById('swal-connect').checked;
                if (!phone) {
                    Swal.showValidationMessage('נא להזין מספר טלפון');
                    return false;
                }
                if (!/^0[0-9]{9}$/.test(phone.replace(/-/g, ''))) {
                    Swal.showValidationMessage('מספר טלפון לא תקין');
                    return false;
                }
                return { phone: phone.replace(/-/g, ''), connectOnly };
            }
        });

        if (!formValues) return;
        recipient = formValues.phone;

        // If connect only - just open WhatsApp contact
        if (formValues.connectOnly) {
            const waPhone = '972' + recipient.substring(1);
            const waUrl = `https://wa.me/${waPhone}`;
            window.open(waUrl, '_blank');
            return;
        }

    } else if (method === 'sms') {
        const { value: phone } = await Swal.fire({
            title: 'שליחה ב-SMS',
            input: 'tel',
            inputLabel: 'מספר טלפון',
            inputValue: clientPhone,
            inputPlaceholder: '05XXXXXXXX',
            showCancelButton: true,
            cancelButtonText: 'ביטול',
            confirmButtonText: 'שלח',
            inputValidator: (value) => {
                if (!value) return 'נא להזין מספר טלפון';
                if (!/^0[0-9]{9}$/.test(value.replace(/-/g, ''))) {
                    return 'מספר טלפון לא תקין';
                }
            }
        });

        if (!phone) return;
        recipient = phone.replace(/-/g, '');

    } else if (method === 'email') {
        const { value: email } = await Swal.fire({
            title: 'שליחה במייל',
            input: 'email',
            inputLabel: 'כתובת מייל',
            inputValue: clientEmail,
            inputPlaceholder: 'email@example.com',
            showCancelButton: true,
            cancelButtonText: 'ביטול',
            confirmButtonText: 'שלח',
            inputValidator: (value) => {
                if (!value) return 'נא להזין כתובת מייל';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return 'כתובת מייל לא תקינה';
                }
            }
        });

        if (!email) return;
        recipient = email;
    }

    try {
        showLoader('שולח הסכם...');
        const result = await agreementsAPI.send(agreementId, method, recipient);
        hideLoader();

        // Generate share link
        const shareLink = result.data.signingLink;
        const shareMessage = `שלום, מצורף הסכם לחתימה:\n\n${shareLink}`;

        if (method === 'whatsapp') {
            // Format phone for WhatsApp (remove leading 0, add Israel code)
            const waPhone = '972' + recipient.substring(1);
            const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(shareMessage)}`;
            window.open(waUrl, '_blank');
        } else if (method === 'sms') {
            // Try SMS link
            const smsUrl = `sms:${recipient}?body=${encodeURIComponent(shareMessage)}`;
            window.location.href = smsUrl;
        }

        showToast('ההסכם נשלח בהצלחה', 'success');

    } catch (error) {
        hideLoader();
        showError(error.message);
    }
}

// ==================== Event Listeners ====================

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Update navbar user info
    const user = getUser();
    if (user) {
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.textContent = user.fullName;
        }

        // Show/hide admin links
        if (user.role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = '';
            });
        }
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await authAPI.logout();
            } catch (e) { }
            removeToken();
            window.location.href = '/login';
        });
    }
});

// Export functions for global use
window.AppUtils = {
    showLoader,
    hideLoader,
    showToast,
    showConfirm,
    showError,
    showSuccess,
    formatDate,
    formatDateForInput,
    formatCurrency,
    getStatusBadge,
    showSendDialog,
    isLoggedIn,
    isAdmin,
    requireAuth,
    getUser,
    getToken
};

window.API = {
    auth: authAPI,
    users: usersAPI,
    agreements: agreementsAPI,
    logs: logsAPI
};
