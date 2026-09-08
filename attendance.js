// ============================================
// IRIGA PPO - ATTENDANCE SYSTEM
// ============================================

const GOOGLE_CLIENT_ID = '730462253609-l1qob7a4mpeuup1jprlu08417mlvng0j.apps.googleusercontent.com';
const APPS_SCRIPT_URL_DEFAULT = 'https://script.google.com/macros/s/AKfycbyAMO9ijvdnvLbF8PH3KcuuDbH5Eq_5taLoJRlOHBYZ0Mr7uTwUlPXCBsy1_6wVDE4/exec';

const AUTHORIZED_EMAILS = [
    'iace2318i@gmail.com',
    'wq.rodalyn@gmail.com',
    'beta22926@gmail.com',
    'johnrogerargarin@gmail.com',
    'irigacityppo@gmail.com'
];


const LEGACY_AUTO_DOCKET_PATTERN = /^(DOCKET|PS)-\d{10,}-\d{1,4}$/i;

function cleanDocketNumber(id) {
    const trimmed = (id || '').toString().trim();
    if (!trimmed) return '';
    if (LEGACY_AUTO_DOCKET_PATTERN.test(trimmed)) return '';
    return trimmed;
}

// ============================================
// DATE UTILITY FUNCTIONS
// ============================================

/**
 * Normalize various date formats to YYYY-MM-DD
 * Handles: MM/DD/YY, MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD, etc.
 */
function normalizeDate(dateStr) {
    if (!dateStr || dateStr === 'N/A' || dateStr === '') return '';

    const str = String(dateStr).trim();

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // MM/DD/YY with year threshold (00-29 = 2000s, 30-99 = 1900s)
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(str)) {
        const parts = str.split('/');
        let year = parseInt(parts[2], 10);
        year = year < 30 ? 2000 + year : 1900 + year;
        return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }

    // MM/DD/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const parts = str.split('/');
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }

    // MM-DD-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        const parts = str.split('-');
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }

    // Try parsing as Date
    try {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch (e) {
        // ignore
    }

    return str; // return original if can't parse
}

/**
 * Calculate age from date of birth
 * Returns number or null
 */
function calculateAge(dobStr) {
    if (!dobStr) return null;

    try {
        const normalized = normalizeDate(dobStr);
        if (!normalized || normalized === 'N/A') return null;

        const parts = normalized.split('-');
        if (parts.length !== 3) return null;

        const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (isNaN(birthDate.getTime())) return null;

        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    } catch (e) {
        return null;
    }
}

/**
 * Get age display string
 */
function getAgeDisplay(dobStr) {
    const age = calculateAge(dobStr);
    if (age !== null && age >= 0) {
        return age.toString();
    }
    return 'N/A';
}

/**
 * Format date for display (Month Day, Year)
 */
function formatDateDisplay(dateStr) {
    if (!dateStr || dateStr === 'N/A' || dateStr === '') return 'N/A';

    const normalized = normalizeDate(dateStr);
    if (!normalized || normalized === 'N/A') return dateStr;

    try {
        const parts = normalized.split('-');
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

// ============================================
// QR PARSING
// ============================================

function parseQRData(rawText) {
    const text = rawText.trim();

    // ── 1. Your PPO JSON format (primary) ──────────────────────────
    try {
        const json = JSON.parse(text);
        if (json && typeof json === 'object') {
            // Normalize every date field using universal normalizer
            const dateFields = ['dateOfBirth', 'startDate', 'endDate', 'dob', 'birthDate'];
            dateFields.forEach(f => {
                if (json[f]) json[f] = normalizeDate(json[f]);
            });
            return {
                source: 'json',
                pusId:             cleanDocketNumber(json.pusId || json.clientId || json.id || ''),
                pusName:           json.pusName  || json.clientName || json.name        || json.fullName || '',
                gender:            json.gender   || '',
                dateOfBirth:       json.dateOfBirth || json.dob     || json.birthDate   || '',
                offenseCategory:   json.offenseCategory || json.offense || '',
                caseNumber:        json.caseNumber || json.caseNo  || json.case        || '',
                startDate:         json.startDate || '',
                endDate:           json.endDate   || '',
                address:           json.address   || '',
                supervisingOfficer: json.supervisingOfficer || json.officer || '',
                cluster:           json.cluster   || '',
                raw:               text
            };
        }
    } catch (e) { /* not JSON, continue */ }

    // ── 2. URL with query params  e.g. https://ppo.gov/?id=PS-001&name=Juan ──
    if (/^https?:\/\//i.test(text)) {
        try {
            const url = new URL(text);
            const p = url.searchParams;
            return {
                source: 'url',
                pusId:           cleanDocketNumber(p.get('id') || p.get('pusId') || p.get('clientId') || ''),
                pusName:         p.get('name')   || p.get('pusName')  || p.get('fullName') || '',
                gender:          p.get('gender') || '',
                dateOfBirth:     normalizeDate(p.get('dob') || p.get('dateOfBirth') || ''),
                offenseCategory: p.get('offense') || p.get('offenseCategory') || '',
                caseNumber:      p.get('case')   || p.get('caseNumber') || '',
                startDate:       normalizeDate(p.get('start') || p.get('startDate') || ''),
                endDate:         normalizeDate(p.get('end')   || p.get('endDate')   || ''),
                address:         p.get('address') || '',
                supervisingOfficer: p.get('officer') || '',
                cluster:         p.get('cluster') || '',
                raw:             text
            };
        } catch (e) { /* bad URL */ }
    }

    // ── 3. vCard format  (BEGIN:VCARD ... END:VCARD) ──
    if (/BEGIN:VCARD/i.test(text)) {
        const get = (tag) => {
            const m = text.match(new RegExp(tag + '[^:]*:([^\\r\\n]+)', 'i'));
            return m ? m[1].trim() : '';
        };
        const fn  = get('FN')  || get('N').replace(/;/g, ' ').trim();
        const bday = get('BDAY');
        return {
            source: 'vcard',
            pusId:           cleanDocketNumber(get('UID') || get('NOTE')),
            pusName:         fn,
            gender:          '',
            dateOfBirth:     normalizeDate(bday),
            offenseCategory: '',
            caseNumber:      '',
            startDate:       '',
            endDate:         '',
            address:         get('ADR').replace(/;/g, ' ').trim(),
            supervisingOfficer: '',
            cluster:         '',
            raw:             text
        };
    }

    // ── 4. Key:Value plain text  e.g. "Name: Juan\nID: PS-001" ──
    if (/\w+\s*[:=]\s*.+/m.test(text)) {
        const lines = text.split(/[\r\n]+/);
        const kv = {};
        lines.forEach(line => {
            const m = line.match(/^([^:=]+)[:=]\s*(.+)$/);
            if (m) kv[m[1].trim().toLowerCase().replace(/\s+/g, '_')] = m[2].trim();
        });
        return {
            source: 'keyvalue',
            pusId:           cleanDocketNumber(kv['ps_id'] || kv['id'] || kv['client_id'] || ''),
            pusName:         kv['full_name'] || kv['name'] || kv['client_name'] || '',
            gender:          kv['gender'] || '',
            dateOfBirth:     normalizeDate(kv['date_of_birth'] || kv['dob'] || kv['birth_date'] || ''),
            offenseCategory: kv['offense'] || kv['offense_category'] || '',
            caseNumber:      kv['case_number'] || kv['case_no'] || kv['criminal_case_number'] || '',
            startDate:       normalizeDate(kv['start_date'] || kv['start'] || ''),
            endDate:         normalizeDate(kv['end_date']   || kv['end']   || ''),
            address:         kv['address'] || '',
            supervisingOfficer: kv['supervising_officer'] || kv['officer'] || '',
            cluster:         kv['cluster'] || '',
            raw:             text
        };
    }

    // ── 5. Bare text fallback ──
    return {
        source: 'unknown',
        pusId:            '',
        pusName:          text.length < 80 ? text : text.slice(0, 80) + '…',
        gender:           '',
        dateOfBirth:      '',
        offenseCategory:  '',
        caseNumber:       '',
        startDate:        '',
        endDate:          '',
        address:          '',
        supervisingOfficer: '',
        cluster:          '',
        raw:              text
    };
}

// ============================================
// APP STATE
// ============================================

let savedUrl = localStorage.getItem('appsScriptUrl');
if (savedUrl && savedUrl !== APPS_SCRIPT_URL_DEFAULT) {
    localStorage.removeItem('appsScriptUrl');
    savedUrl = null;
}
let APPS_SCRIPT_URL = savedUrl || APPS_SCRIPT_URL_DEFAULT;

let currentUser = null;
let currentPUSData = null;

// DOM Elements
const loginSection = document.getElementById('loginSection');
const userInfo = document.getElementById('userInfo');
const mainContent = document.getElementById('mainContent');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const userNameDisplay = document.getElementById('userNameDisplay');
const userAvatar = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const scannerTrigger = document.getElementById('scannerTrigger');
const scannerModal = document.getElementById('scannerModal');
const scannerVideo = document.getElementById('scannerVideo');
const pusInfoSection = document.getElementById('pusInfoSection');
const attendanceForm = document.getElementById('attendanceForm');
const submitBtn = document.getElementById('submitBtn');
const messageArea = document.getElementById('messageArea');
const configSection = document.getElementById('configSection');
const scriptUrlInput = document.getElementById('scriptUrlInput');
const saveUrlBtn = document.getElementById('saveUrlBtn');
const resetUrlBtn = document.getElementById('resetUrlBtn');
const adminLink = document.getElementById('adminLink');

// ============================================
// GOOGLE SIGN-IN
// ============================================

function initGoogleSignIn() {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false
    });

    google.accounts.id.renderButton(
        document.getElementById('g_id_signin'),
        {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: 280
        }
    );
}

function handleCredentialResponse(response) {
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        const userEmail = payload.email;

        if (AUTHORIZED_EMAILS.includes(userEmail)) {
            currentUser = {
                email: userEmail,
                name: payload.name,
                picture: payload.picture
            };

            userNameDisplay.textContent = currentUser.name || currentUser.email;
            userEmailDisplay.textContent = currentUser.email;
            if (currentUser.picture) userAvatar.src = currentUser.picture;

            userInfo.style.display = 'flex';
            loginSection.style.display = 'none';
            mainContent.style.display = 'block';

            localStorage.setItem('loggedInUser', JSON.stringify(currentUser));
            showMessage(`Welcome, ${currentUser.name || currentUser.email}!`, 'success');
        } else {
            showMessage('Unauthorized: Your email is not registered in the PPO system.', 'error');
            google.accounts.id.disableAutoSelect();
        }
    } catch (e) {
        showMessage('Login failed. Please try again.', 'error');
    }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

function checkSession() {
    try {
        const saved = localStorage.getItem('loggedInUser');
        if (!saved) return;

        const user = JSON.parse(saved);
        if (AUTHORIZED_EMAILS.includes(user.email)) {
            currentUser = user;
            userNameDisplay.textContent = user.name || user.email;
            userEmailDisplay.textContent = user.email;
            if (user.picture) userAvatar.src = user.picture;
            userInfo.style.display = 'flex';
            loginSection.style.display = 'none';
            mainContent.style.display = 'block';
        } else {
            localStorage.removeItem('loggedInUser');
        }
    } catch (e) {
        console.warn('Session corrupted, clearing:', e);
        localStorage.removeItem('loggedInUser');
    }
}

function logout() {
    if (window.google && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }

    localStorage.removeItem('loggedInUser');
    currentUser = null;

    mainContent.style.display = 'none';
    loginSection.style.display = 'block';
    userInfo.style.display = 'none';
    pusInfoSection.style.display = 'none';
    attendanceForm.style.display = 'none';

    currentPUSData = null;

    attendanceForm?.reset();

    showMessage('You have been signed out.', 'info');
}

logoutBtn?.addEventListener('click', logout);

// ============================================
// QR CAMERA SCANNER
// Uses the nimiq/qr-scanner library (worker-based decoding,
// handles camera lifecycle, no manual frame-scanning loop needed).
// https://github.com/nimiq/qr-scanner
// ============================================

let scanning = false;
let scannerStarting = false;
let qrScannerInstance = null;

// Prevent processing the same QR multiple times in a row
let lastQRData = null;
let lastQRTime = 0;

// ============================================
// HANDLE A SUCCESSFULLY DECODED VALUE
// ============================================

function handleDecodedValue(value) {
    const now = Date.now();

    // Ignore an accidental duplicate read of the same QR
    // within a short window (e.g. jitter across two frames)
    if (value === lastQRData && now - lastQRTime < 2000) {
        return;
    }

    lastQRData = value;
    lastQRTime = now;

    scanning = false;

    if (qrScannerInstance) {
        qrScannerInstance.stop();
    }

    if (scannerModal) scannerModal.style.display = 'none';

    processQR(value);
}

// ============================================
// OPEN SCANNER
// ============================================

async function openScanner() {
    // Prevent double camera initialization (e.g. double-tap on trigger)
    if (scannerStarting || scanning) return;

    if (!APPS_SCRIPT_URL) {
        showMessage('Please configure Google Apps Script URL in Settings', 'error');
        if (configSection) configSection.style.display = 'block';
        return;
    }

    if (typeof QrScanner === 'undefined') {
        showMessage('QR scanner library did not load. Check your internet connection and reload the page.', 'error');
        return;
    }

    scannerStarting = true;

    if (scannerModal) scannerModal.style.display = 'flex';

    try {
        // Reuse a single QrScanner instance across sessions instead of
        // recreating it every time the scanner opens.
        if (!qrScannerInstance) {
            if (!scannerVideo) throw new Error('Scanner video element not found.');

            qrScannerInstance = new QrScanner(
                scannerVideo,
                (result) => handleDecodedValue(result.data),
                {
                    preferredCamera: 'environment',
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                    maxScansPerSecond: 10,
                    returnDetailedScanResult: true
                }
            );
        }

        await qrScannerInstance.start();

        scanning = true;
        scannerStarting = false;

        // Reset duplicate-scan protection for this session
        lastQRData = null;
        lastQRTime = 0;

    } catch (error) {
        console.error('Camera initialization error:', error);
        scannerStarting = false;
        scanning = false;

        if (scannerModal) scannerModal.style.display = 'none';

        showMessage('Unable to access camera. Please check camera permissions.', 'error');
    }
}

// ============================================
// CLOSE SCANNER
// ============================================

function closeScanner() {
    scannerStarting = false;
    scanning = false;

    if (qrScannerInstance) {
        qrScannerInstance.stop();
    }

    if (scannerModal) scannerModal.style.display = 'none';

    // Reset duplicate protection so the next session starts clean
    lastQRData = null;
    lastQRTime = 0;
}


// ============================================
// PROCESS QR
// ============================================

async function processQR(qrData) {
    showMessage('Processing QR code...', 'info');

    const data = parseQRData(qrData);
    currentPUSData = data;

    if (data.source !== 'json') {
        showMessage(`⚠️ Non-standard QR format detected (${data.source}). Some fields may be missing.`, 'info');
    }

    // Use universal date functions
    const ageDisplay = getAgeDisplay(data.dateOfBirth);

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || 'N/A';
    };

    setText('displayPUSId',      data.pusId);
    setText('displayPUSName',    data.pusName);
    setText('displayGenderAge',  `${data.gender || 'N/A'} / Age: ${ageDisplay}`);
    setText('displayOffense',    data.offenseCategory);
    setText('displayCaseNumber', data.caseNumber);
    setText('displayAddress',    data.address);
    setText('displayOfficer',    data.supervisingOfficer);
    setText('displayCluster',    data.cluster);

    // Use universal formatters
    const startFormatted = formatDateDisplay(data.startDate);
    const endFormatted   = formatDateDisplay(data.endDate);
    setText('displayPeriod', `${startFormatted} to ${endFormatted}`);

    if (pusInfoSection)  pusInfoSection.style.display  = 'block';
    if (attendanceForm)  attendanceForm.style.display  = 'block';

    const label = data.source === 'json'
        ? '✓ Person Under Supervision loaded. Record attendance.'
        : `✓ QR scanned (${data.source} format). Verify details before submitting.`;
    showMessage(label, 'success');
}

// ============================================
// SHOW MESSAGE
// ============================================

function showMessage(msg, type) {
    const id = Date.now() + '-' + Math.random().toString(36).substr(2, 8);
    const escapedMsg = msg.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });

    messageArea.innerHTML += `<div class="message message-${type}" data-id="${id}">${escapedMsg}</div>`;

    setTimeout(() => {
        const el = messageArea.querySelector(`[data-id="${id}"]`);
        if (el) el.remove();

        // Clean up empty container
        if (messageArea.children.length === 0) {
            messageArea.innerHTML = '';
        }
    }, 4000);
}

// ============================================
// SUBMIT ATTENDANCE
// ============================================

async function submitAttendance(e) {
    e.preventDefault();
    if (!APPS_SCRIPT_URL) {
        showMessage('Please configure Google Apps Script URL in Settings', 'error');
        configSection.style.display = 'block';
        return;
    }
    if (!currentUser) {
        showMessage('Please sign in first.', 'error');
        return;
    }
    if (!currentPUSData) {
        showMessage('Please scan a QR code first.', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    // Use universal date normalizer
    let calculatedAge = '';
    if (currentPUSData.dateOfBirth) {
        const age = calculateAge(currentPUSData.dateOfBirth);
        calculatedAge = age !== null ? age.toString() : '';
    }

    const attendanceData = {
        employeeEmail: currentUser.email,
        clientName: currentPUSData.pusName || currentPUSData.clientName,
        // Already cleaned in parseQRData, but clean again here in case
        // currentPUSData.clientId came from somewhere else.
        clientId: cleanDocketNumber(currentPUSData.pusId || currentPUSData.clientId),
        gender: currentPUSData.gender,
        age: calculatedAge,
        offenseCategory: currentPUSData.offenseCategory,
        caseNumber: currentPUSData.caseNumber,
        address: currentPUSData.address,
        startDate: normalizeDate(currentPUSData.startDate),
        endDate: normalizeDate(currentPUSData.endDate),
        supervisingOfficer: currentPUSData.supervisingOfficer,
        cluster: currentPUSData.cluster,
        remarks: document.getElementById('remarks')?.value || '',
        familySupport: document.getElementById('familySupport')?.value || '',
        notes: document.getElementById('notes')?.value || '',
        timestamp: new Date().toISOString(),
        qrSource: currentPUSData.source || 'json'
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(attendanceData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        showMessage('✓ Attendance recorded successfully!', 'success');

        setTimeout(() => {
            if (pusInfoSection) pusInfoSection.style.display = 'none';
            if (attendanceForm) attendanceForm.style.display = 'none';
            attendanceForm?.reset();
            currentPUSData = null;
        }, 2000);
    } catch (err) {
        console.error('Fetch error:', err);
        if (err.name === 'AbortError') {
            showMessage('Request timeout. Please check your connection and try again.', 'error');
        } else {
            showMessage('Connection error. Please try again.', 'error');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ Record Attendance';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

adminLink?.addEventListener('click', (e) => {
    e.preventDefault();
    if (configSection) {
        configSection.style.display =
            configSection.style.display === 'none' ? 'block' : 'none';
    }

    if (scriptUrlInput) {
        scriptUrlInput.value = APPS_SCRIPT_URL;
    }
});

if (saveUrlBtn) {
    saveUrlBtn.onclick = () => {
        const url = scriptUrlInput.value.trim();
        if (url) {
            APPS_SCRIPT_URL = url;
            localStorage.setItem('appsScriptUrl', url);
            showMessage('✓ URL saved successfully!', 'success');
            if (configSection) configSection.style.display = 'none';
        } else {
            showMessage('Please enter a valid URL', 'error');
        }
    };
}

if (resetUrlBtn) {
    resetUrlBtn.onclick = () => {
        localStorage.removeItem('appsScriptUrl');
        APPS_SCRIPT_URL = APPS_SCRIPT_URL_DEFAULT;
        if (scriptUrlInput) {
            scriptUrlInput.value = APPS_SCRIPT_URL_DEFAULT;
        }
        showMessage('✓ URL reset to default. Click "Save URL" to confirm.', 'success');
    };
}

scannerTrigger?.addEventListener('click', openScanner);
attendanceForm?.addEventListener('submit', submitAttendance);

// Make closeScanner globally available for the close button in modal
window.closeScanner = closeScanner;

// ============================================
// INITIALIZE
// ============================================

checkSession();

if (typeof google !== 'undefined' && google.accounts) {
    initGoogleSignIn();
} else {
    window.addEventListener('load', () => setTimeout(initGoogleSignIn, 500));
}

if (scriptUrlInput) {
    scriptUrlInput.value = APPS_SCRIPT_URL;
}