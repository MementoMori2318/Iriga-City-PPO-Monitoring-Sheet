// ============================================
// IRIGA PPO - ATTENDANCE SYSTEM
// ============================================

const GOOGLE_CLIENT_ID = '615931175551-cnd4ocg43ktu56jpmhdm9ulmbn5tedq1.apps.googleusercontent.com';
const APPS_SCRIPT_URL_DEFAULT = 'https://script.google.com/macros/s/AKfycbyfFeSbQtuLSaj_pSkeufQHtuus9snUO6Of25FmHFp3Re-YWQuIrx-bO6ANjmOEnHN-/exec';

const AUTHORIZED_EMAILS = [
    'iace2318i@gmail.com',
    'wq.rodalyn@gmail.com',
    'beta22926@gmail.com',
    'johnrogerargarin@gmail.com'
];

// Helper function to format date from MM-DD-YYYY to readable format
function formatReadableDate(dateStr) {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
        let date;

        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');

            if (parts[0].length === 4) {
                // YYYY-MM-DD
                date = new Date(dateStr);
            } else {
                // MM-DD-YYYY
                date = new Date(parts[2], parts[0] - 1, parts[1]);
            }
        }

        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateStr;
    }
}

let savedUrl = localStorage.getItem('appsScriptUrl');
if (savedUrl && savedUrl !== APPS_SCRIPT_URL_DEFAULT) {
    localStorage.removeItem('appsScriptUrl');
    savedUrl = null;
}
let APPS_SCRIPT_URL = savedUrl || APPS_SCRIPT_URL_DEFAULT;

let currentUser = null;
let currentPUSData = null;
let videoStream = null;
let scanning = false;

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

function checkSession() {
    const saved = localStorage.getItem('loggedInUser');
    if (saved) {
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

async function openScanner() {
    if (!APPS_SCRIPT_URL) {
        showMessage('Please configure Google Apps Script URL in Settings', 'error');
        configSection.style.display = 'block';
        return;
    }
    
    scannerModal.style.display = 'flex';
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        scannerVideo.srcObject = stream;
        videoStream = stream;
        await scannerVideo.play();
        scanning = true;
        scanQR();
    } catch (err) {
        showMessage('Camera access denied. Please allow camera permissions.', 'error');
        closeScanner();
    }
}

function scanQR() {
    if (!scanning) return;

    if (scannerVideo.readyState === scannerVideo.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas');
        canvas.width = scannerVideo.videoWidth;
        canvas.height = scannerVideo.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(scannerVideo, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        if (typeof jsQR !== 'function') {
            showMessage('QR scanner library not loaded.', 'error');
            scanning = false;
            return;
        }

        const code = jsQR(imgData.data, canvas.width, canvas.height);

        if (code) {
            scanning = false;
            closeScanner();
            processQR(code.data);
            return; // ✅ stop loop immediately
        }
    }

    requestAnimationFrame(scanQR);
}

function closeScanner() {
    scanning = false;

    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }

    if (scannerVideo) {
        scannerVideo.srcObject = null;
    }

    scannerModal.style.display = 'none';
}

async function processQR(qrData) {
    showMessage('Processing QR code...', 'info');

    // ✅ Parse QR safely
    let data;
    try {
        data = JSON.parse(qrData);
    } catch (e) {
        showMessage('Invalid QR code format.', 'error');
        return;
    }

    // ✅ Store data
    currentPUSData = data;

    // ✅ Display data safely
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    
    setText('displayPUSId', data.pusId || data.clientId || 'N/A');
    setText('displayPUSName', data.pusName || data.clientName || 'N/A');
    setText('displayGenderAge', `${data.gender || 'N/A'} / ${data.age || 'N/A'}`);
    setText('displayOffense', data.offenseCategory || 'N/A');
    setText('displayCaseNumber', data.caseNumber || 'N/A');
    setText('displayAddress', data.address || 'N/A');
    
    const startDateFormatted = formatReadableDate(data.startDate);
    const endDateFormatted = formatReadableDate(data.endDate);
    setText('displayPeriod', `${startDateFormatted} to ${endDateFormatted}`);
    
    setText('displayOfficer', data.supervisingOfficer || 'N/A');
    setText('displayCluster', data.cluster || 'N/A');

    // ✅ Show UI
    pusInfoSection?.style && (pusInfoSection.style.display = 'block');
    attendanceForm?.style && (attendanceForm.style.display = 'block');

    showMessage('✓ Person Under Supervision loaded. Record attendance.', 'success');
}

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
    
    const attendanceData = {
        employeeEmail: currentUser.email,
        clientName: currentPUSData.pusName || currentPUSData.clientName,
        clientId: currentPUSData.pusId || currentPUSData.clientId,
        gender: currentPUSData.gender,
        age: currentPUSData.age,
        offenseCategory: currentPUSData.offenseCategory,
        caseNumber: currentPUSData.caseNumber,
        address: currentPUSData.address,
        startDate: currentPUSData.startDate,
        endDate: currentPUSData.endDate,
        supervisingOfficer: currentPUSData.supervisingOfficer,
        cluster: currentPUSData.cluster,
        remarks: document.getElementById('remarks')?.value || '',
        familySupport: document.getElementById('familySupport')?.value || '',
        notes: document.getElementById('notes')?.value || ''
    };
    
    try {
        // Use no-cors mode (required for Apps Script to work from GitHub Pages)
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(attendanceData)
        });
        
        // With no-cors, we cannot read the response, but the request still goes through
        showMessage('✓ Attendance recorded successfully!', 'success');
        
        setTimeout(() => {
            pusInfoSection.style.display = 'none';
            attendanceForm.style.display = 'none';
            attendanceForm?.reset();
            currentPUSData = null;
        }, 2000);
    } catch (err) {
        console.error('Fetch error:', err);
        showMessage('Connection error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ Record Attendance';
    }
}

function showMessage(msg, type) {
    messageArea.innerHTML = `<div class="message message-${type}">${msg}</div>`;
    setTimeout(() => {
        if (messageArea.innerHTML.includes(msg)) messageArea.innerHTML = '';
    }, 4000);
}

adminLink?.addEventListener('click', (e) => {
    e.preventDefault();
    configSection.style.display =
        configSection.style.display === 'none' ? 'block' : 'none';

    if (scriptUrlInput) {
        scriptUrlInput.value = APPS_SCRIPT_URL;
    }
});

saveUrlBtn.onclick = () => {
    const url = scriptUrlInput.value.trim();
    if (url) {
        APPS_SCRIPT_URL = url;
        localStorage.setItem('appsScriptUrl', url);
        showMessage('✓ URL saved successfully!', 'success');
        configSection.style.display = 'none';
    } else {
        showMessage('Please enter a valid URL', 'error');
    }
};

resetUrlBtn.onclick = () => {
    localStorage.removeItem('appsScriptUrl');
    APPS_SCRIPT_URL = APPS_SCRIPT_URL_DEFAULT;
    if (scriptUrlInput) {
        scriptUrlInput.value = APPS_SCRIPT_URL_DEFAULT;
    }
    showMessage('✓ URL reset to default. Click "Save URL" to confirm.', 'success');
};

scannerTrigger?.addEventListener('click', openScanner);
attendanceForm?.addEventListener('submit', submitAttendance);
window.closeScanner = closeScanner;

checkSession();

if (typeof google !== 'undefined' && google.accounts) {
    initGoogleSignIn();
} else {
    window.addEventListener('load', () => setTimeout(initGoogleSignIn, 500));
}

if (scriptUrlInput) {
    scriptUrlInput.value = APPS_SCRIPT_URL;
}