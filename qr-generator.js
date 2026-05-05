// ============================================
// IRIGA PPO - QR CODE & ID CARD GENERATOR
// SHARES LOGIN SESSION WITH INDEX.HTML
// ============================================

let currentQRData = null;
let currentQRCanvas = null;
let batchQRs = [];
let currentClientDataForCard = null;
let currentUser = null;

const AUTHORIZED_EMAILS = [
    'iace2318i@gmail.com',
    'wq.rodalyn@gmail.com',
    'beta22926@gmail.com'
];

const TEMPLATE_HEADERS = ['PS ID', 'Full Name', 'Gender', 'Age', 'Offense Category', 'Criminal Case Number', 'Start Date', 'End Date', 'Address', 'Supervising Officer', 'Cluster'];

// ============================================
// SESSION CHECK - SHARED WITH INDEX.HTML
// ============================================

function checkSession() {
    const saved = localStorage.getItem('loggedInUser');
    if (saved) {
        const user = JSON.parse(saved);
        if (AUTHORIZED_EMAILS.includes(user.email)) {
            currentUser = user;
            document.getElementById('sessionExpired').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            document.getElementById('userNameDisplay').textContent = user.name || user.email;
            document.getElementById('userEmailDisplay').textContent = user.email;
            if (user.picture) document.getElementById('userAvatar').src = user.picture;
            return true;
        } else {
            localStorage.removeItem('loggedInUser');
        }
    }
    document.getElementById('sessionExpired').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
    return false;
}

function logout() {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'index.html';
}

// ============================================
// QR CODE GENERATION FUNCTIONS
// ============================================

async function generateQRCode(data, size = 300) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        QRCode.toCanvas(canvas, data, { 
            width: size, 
            margin: 2, 
            color: { dark: '#000000', light: '#ffffff' } 
        }, function(error) {
            if (error) reject(error);
            else resolve(canvas);
        });
    });
}

function createSingleIDCardHTML(pusId, pusName, startDate, endDate, cluster, qrImageData) {
    const issueDate = new Date().toLocaleDateString();
    const displayName = pusName || "N/A";
    const displayCluster = cluster || "N/A";
    return `
        <div class="official-id-card" style="width:337px; height:212px; background:white; border-radius:12px; overflow:hidden; font-family:'Segoe UI', Arial, sans-serif; box-shadow:0 2px 5px rgba(0,0,0,0.1); position:relative; display:flex; flex-direction:column;">
            <div style="background:linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color:white; padding:6px 0; text-align:center; flex-shrink:0;">
                <h3 style="font-size:10px; font-weight:600; letter-spacing:0.5px;">IRIGA CITY PAROLE AND PROBATION OFFICE</h3>
            </div>
            <div style="display:flex; padding:10px 12px; gap:12px; flex:1; align-items:center;">
                <div style="width:100px; text-align:center; flex-shrink:0;">
                    <img src="${qrImageData}" style="width:95px; height:95px; border:1px solid #ddd; border-radius:8px; background:white; padding:3px;" alt="QR Code">
                    <div style="font-size:6px; color:#666; margin-top:2px;">Scan for Attendance</div>
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:bold; font-size:9px; color:#1e3c72; border-bottom:1px solid #ddd; margin-bottom:6px; padding-bottom:2px;">PAROLEE</div>
                    <div style="margin-bottom:5px;">
                        <div style="font-size:7px; font-weight:bold; color:#555;">NAME</div>
                        <div style="font-size:9px; font-weight:600; color:#2c3e50; line-height:1.2; word-wrap:break-word;">${escapeHtml(displayName)}</div>
                    </div>
                    <div style="margin-bottom:5px;">
                        <div style="font-size:7px; font-weight:bold; color:#555;">CLUSTER</div>
                        <div style="font-size:9px; font-weight:600; color:#2c3e50;">${escapeHtml(displayCluster)}</div>
                    </div>
                    <div>
                        <div style="font-size:7px; font-weight:bold; color:#555;">SUPERVISION PERIOD</div>
                        <div style="font-size:8px; color:#333;">${startDate || 'N/A'} to ${endDate || 'N/A'}</div>
                    </div>
                </div>
                <div style="width:75px; text-align:center; flex-shrink:0;">
                    <div style="width:68px; height:78px; border:1.5px solid #ccc; border-radius:8px; background:#f9f9f9; display:flex; align-items:center; justify-content:center; margin:0 auto;">
                        <div style="text-align:center; color:#aaa; font-size:10px;">📷<br><span style="font-size:6px;">Photo</span></div>
                    </div>
                    <div style="font-size:5px; color:#aaa; text-align:center; margin-top:1px;">(Paste/glue photo)</div>
                </div>
            </div>
            <div style="background:#f0f0f0; padding:5px 10px; display:flex; justify-content:space-between; font-size:6px; color:#666; border-top:1px solid #ddd; flex-shrink:0;">
                <span>Issued: ${issueDate}</span>
                
                <span>www.irigacityppo@gmail.com</span>
            </div>
        </div>
    `;
}

function escapeHtml(str) { 
    if(!str) return ''; 
    return str.replace(/[&<>]/g, function(m){ 
        if(m==='&') return '&amp;'; 
        if(m==='<') return '&lt;'; 
        if(m==='>') return '&gt;'; 
        return m;
    }); 
}

async function generateIDCardCanvas(pusId, pusName, startDate, endDate, cluster, qrImageData) {
    const container = document.getElementById('idCardContainer');
    const cardHTML = createSingleIDCardHTML(pusId, pusName, startDate, endDate, cluster, qrImageData);
    container.innerHTML = cardHTML;
    await new Promise(r => setTimeout(r, 100));
    const cardElement = container.querySelector('.official-id-card');
    if (!cardElement) return null;
    const canvas = await html2canvas(cardElement, { 
        scale: 3, 
        backgroundColor: '#ffffff', 
        logging: false, 
        useCORS: true 
    });
    container.innerHTML = '';
    return canvas;
}

async function downloadIDCard(pusId, pusName, startDate, endDate, cluster, qrImageData, filename) {
    const canvas = await generateIDCardCanvas(pusId, pusName, startDate, endDate, cluster, qrImageData);
    if (canvas) { 
        const link = document.createElement('a'); 
        link.download = filename; 
        link.href = canvas.toDataURL('image/png'); 
        link.click(); 
        return true; 
    }
    return false;
}

function showQRModal(qrCanvas, clientData) {
    const modal = document.getElementById('qrModal');
    const modalQrcode = document.getElementById('modalQrcode');
    const modalClientInfo = document.getElementById('modalClientInfo');
    
    document.body.style.overflow = 'hidden';
    modalQrcode.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(qrCanvas, 0, 0, 180, 180);
    modalQrcode.appendChild(canvas);
    
    modalClientInfo.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px;">
            <div><strong>📋 PS ID:</strong></div>
            <div>${escapeHtml(clientData.pusId)}</div>
            <div><strong>👤 Full Name:</strong></div>
            <div>${escapeHtml(clientData.pusName)}</div>
            <div><strong>⚥ Gender:</strong></div>
            <div>${clientData.gender}</div>
            <div><strong>🎂 Age:</strong></div>
            <div>${clientData.age}</div>
            <div><strong>⚖️ Offense:</strong></div>
            <div>${clientData.offenseCategory}</div>
            <div><strong>⚖️ Case No.:</strong></div>
            <div>${escapeHtml(clientData.caseNumber || 'N/A')}</div>
            <div><strong>📅 Start Date:</strong></div>
            <div>${clientData.startDate || 'N/A'}</div>
            <div><strong>📅 End Date:</strong></div>
            <div>${clientData.endDate || 'N/A'}</div>
            <div><strong>🏠 Address:</strong></div>
            <div>${escapeHtml(clientData.address || 'N/A')}</div>
            <div><strong>👮 Officer:</strong></div>
            <div>${escapeHtml(clientData.supervisingOfficer || 'N/A')}</div>
            <div><strong>📍 Cluster:</strong></div>
            <div>${escapeHtml(clientData.cluster || 'N/A')}</div>
        </div>
    `;
    
    modal.style.display = 'block';
    currentClientDataForCard = clientData;
    currentQRCanvas = qrCanvas;
}

function closeModal() {
    const modal = document.getElementById('qrModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

// ============================================
// EVENT LISTENERS
// ============================================

document.getElementById('qrForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const pusId = document.getElementById('pusId').value.trim();
    const pusName = document.getElementById('pusName').value.trim();
    const age = document.getElementById('age').value.trim();
    
    if (!pusId || !pusName || !age) { 
        alert('Please fill in PS ID, Full Name, and Age'); 
        return; 
    }
    
    const pusData = { 
        pusId, 
        pusName, 
        gender: document.getElementById('gender').value, 
        age: parseInt(age), 
        offenseCategory: document.getElementById('offenseCategory').value,
        caseNumber: document.getElementById('caseNumber').value,
        startDate: document.getElementById('startDate').value, 
        endDate: document.getElementById('endDate').value,
        address: document.getElementById('address').value,
        supervisingOfficer: document.getElementById('officer').value, 
        cluster: document.getElementById('cluster').value 
    };
    
    currentQRData = JSON.stringify(pusData);
    const canvas = await generateQRCode(currentQRData, 300);
    currentQRCanvas = canvas;
    showQRModal(canvas, pusData);
    saveToLocalStorage(pusData);
});

document.getElementById('modalDownloadQrBtn')?.addEventListener('click', function() {
    if (currentQRCanvas) {
        const pusId = document.getElementById('pusId').value;
        const pusName = document.getElementById('pusName').value.replace(/[^a-z0-9]/gi, '_');
        const link = document.createElement('a');
        link.download = `QR_${pusId}_${pusName}.png`;
        link.href = currentQRCanvas.toDataURL('image/png');
        link.click();
    }
});

document.getElementById('modalDownloadCardBtn')?.addEventListener('click', async function() {
    if (!currentClientDataForCard) { alert('Generate QR first'); return; }
    if (!currentQRCanvas) return;
    
    const qrImageData = currentQRCanvas.toDataURL('image/png');
    const pusId = currentClientDataForCard.pusId;
    const pusName = currentClientDataForCard.pusName;
    const startDate = currentClientDataForCard.startDate;
    const endDate = currentClientDataForCard.endDate;
    const cluster = currentClientDataForCard.cluster;
    
    await downloadIDCard(pusId, pusName, startDate, endDate, cluster, qrImageData, `ID_Card_${pusId}_${pusName.replace(/[^a-z0-9]/gi, '_')}.png`);
});

document.getElementById('modalPrintBtn')?.addEventListener('click', function() {
    if (!currentClientDataForCard) { alert('Generate QR first'); return; }
    if (!currentQRCanvas) return;
    
    const qrImageData = currentQRCanvas.toDataURL('image/png');
    const pusId = currentClientDataForCard.pusId;
    const pusName = currentClientDataForCard.pusName;
    const startDate = currentClientDataForCard.startDate;
    const endDate = currentClientDataForCard.endDate;
    const cluster = currentClientDataForCard.cluster;
    
    printSingleCard(pusId, pusName, startDate, endDate, cluster, qrImageData);
});

document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
document.querySelector('.modal-close')?.addEventListener('click', closeModal);

window.addEventListener('click', function(event) {
    const modal = document.getElementById('qrModal');
    if (event.target === modal) {
        closeModal();
        document.body.style.overflow = '';
    }
});

function printSingleCard(pusId, pusName, startDate, endDate, cluster, qrImageData) {
    const cardHTML = createSingleIDCardHTML(pusId, pusName, startDate, endDate, cluster, qrImageData);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>ID Card - ${pusName}</title><style>*{margin:0;padding:0;box-sizing:border-box;} body{background:white;display:flex;justify-content:center;align-items:center;min-height:100vh;} @media print{body{margin:0;padding:0;}}</style></head><body><div style="margin:20px;">${cardHTML}</div><script>setTimeout(()=>{window.print();window.close();},200);<\/script></body></html>`);
    printWindow.document.close();
}

document.getElementById('downloadTemplateBtn')?.addEventListener('click', function() {
    const templateData = [TEMPLATE_HEADERS, 
        ['PS-2024-001', 'Dela Cruz, Juan A.', 'Male', '35', 'Drug Offense', 'RTC-2024-00123', '08-15-2023', '08-15-2026', '123 Purok 1, Brgy. San Juan, Iriga City', 'SSPO JANET B. PAVIA', 'IRIGA'], 
        ['PS-2024-002', 'Reyes, Maria S.', 'Female', '42', 'Non-Drug Offense', 'RTC-2024-00456', '09-01-2023', '09-01-2026', '456 Mabini St., Iriga City', 'SSPO JANET B. PAVIA', 'NABUA']
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, 'PUS_Template'); 
    XLSX.writeFile(wb, 'Iriga_PPO_QR_Template.xlsx');
});

async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try { 
                const data = new Uint8Array(e.target.result); 
                const workbook = XLSX.read(data, { type: 'array' }); 
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]]; 
                const jsonData = XLSX.utils.sheet_to_json(firstSheet); 
                resolve(jsonData); 
            } catch (error) { 
                reject(error); 
            }
        }; 
        reader.onerror = reject; 
        reader.readAsArrayBuffer(file);
    });
}

document.getElementById('importBtn')?.addEventListener('click', async function() {
    const file = document.getElementById('excelFile').files[0];
    const statusDiv = document.getElementById('importStatus'); 
    const progressBar = document.getElementById('progressBar'); 
    const progressFill = document.getElementById('progressFill');
    
    if (!file) { 
        statusDiv.style.display = 'block'; 
        statusDiv.className = 'status-message status-error'; 
        statusDiv.textContent = 'Select an Excel file'; 
        return; 
    }
    
    statusDiv.style.display = 'block'; 
    statusDiv.className = 'status-message status-info'; 
    statusDiv.textContent = 'Reading...';
    
    try {
        const data = await readExcelFile(file);
        statusDiv.textContent = `Found ${data.length} records. Generating...`;
        progressBar.style.display = 'block';
        batchQRs = [];
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            progressFill.style.width = `${((i+1)/data.length)*100}%`;
            
            const pusData = {
                pusId: row['PS ID'] || row['pusId'] || `PS-${Date.now()}-${i}`,
                pusName: row['Full Name'] || row['pusName'] || row['NAME OF CLIENT'] || 'Unknown',
                gender: row['Gender'] || row['gender'] || 'Female',
                age: parseInt(row['Age'] || row['age'] || 0),
                offenseCategory: row['Offense Category'] || row['offenseCategory'] || 'Drug Offense',
                caseNumber: row['Criminal Case Number'] || row['caseNumber'] || '',
                startDate: row['Start Date'] || row['startDate'] || '',
                endDate: row['End Date'] || row['endDate'] || '',
                address: row['Address'] || row['address'] || '',
                supervisingOfficer: row['Supervising Officer'] || row['supervisingOfficer'] || '',
                cluster: row['Cluster'] || row['cluster'] || ''
            };
            
            if (isNaN(pusData.age)) pusData.age = 0;
            const qrData = JSON.stringify(pusData);
            const canvas = await generateQRCode(qrData, 300);
            const qrImageData = canvas.toDataURL('image/png');
            batchQRs.push({ data: pusData, qrData, canvas, imageUrl: qrImageData });
            saveToLocalStorage(pusData);
        }
        
        progressBar.style.display = 'none';
        statusDiv.className = 'status-message status-success';
        statusDiv.innerHTML = `✅ Successfully generated ${batchQRs.length} QR codes!`;
        displayBatchResults(batchQRs);
        
        // Open the batch modal instead of showing the card
        if (typeof openBatchModal === 'function') {
            openBatchModal();
        }
    } catch (error) {
        statusDiv.className = 'status-message status-error'; 
        statusDiv.textContent = 'Error: '+error.message; 
        progressBar.style.display = 'none';
    }
});

function displayBatchResults(qrs) {
    const batchList = document.getElementById('batchListModal');
    batchList.innerHTML = qrs.map((qr, index) => `
        <div class="batch-item-modal">
            <div class="batch-info-modal">
                <div class="batch-name-modal">${escapeHtml(qr.data.pusName)}</div>
                <div class="batch-details-modal">ID: ${escapeHtml(qr.data.pusId)} | ${qr.data.offenseCategory}</div>
            </div>
            <div class="batch-actions-modal">
                <button class="btn-small" onclick="downloadSingleBatch(${index})">📥 QR</button>
                <button class="btn-small" onclick="downloadSingleBatchCard(${index})">🆔 Card</button>
                <button class="btn-small" onclick="printSingleBatchCard(${index})">🖨️ Print</button>
            </div>
        </div>
    `).join('');
}

window.downloadSingleBatch = function(index) { 
    const qr = batchQRs[index]; 
    if(qr && qr.canvas){ 
        const link = document.createElement('a'); 
        link.download = `QR_${qr.data.pusId}_${qr.data.pusName.replace(/[^a-z0-9]/gi, '_')}.png`; 
        link.href = qr.canvas.toDataURL('image/png'); 
        link.click(); 
    } 
};

window.downloadSingleBatchCard = async function(index) { 
    const qr = batchQRs[index]; 
    if(qr) await downloadIDCard(qr.data.pusId, qr.data.pusName, qr.data.startDate, qr.data.endDate, qr.data.cluster, qr.imageUrl, `ID_Card_${qr.data.pusId}_${qr.data.pusName.replace(/[^a-z0-9]/gi, '_')}.png`); 
};

window.printSingleBatchCard = function(index) { 
    const qr = batchQRs[index]; 
    if(qr) printSingleCard(qr.data.pusId, qr.data.pusName, qr.data.startDate, qr.data.endDate, qr.data.cluster, qr.imageUrl); 
};

// Modal version of mass download buttons
document.getElementById('massDownloadQrsBtnModal')?.addEventListener('click', async function() {
    if(batchQRs.length===0){ alert('No QR codes'); return; }
    const zip = new JSZip();
    for(let qr of batchQRs){ const base64 = qr.imageUrl.split(',')[1]; const safeName = qr.data.pusName.replace(/[^a-z0-9]/gi, '_'); zip.file(`QR_${qr.data.pusId}_${safeName}.png`, base64, { base64: true }); }
    const blob = await zip.generateAsync({ type: 'blob' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `All_QR_Codes_${Date.now()}.zip`; link.click(); URL.revokeObjectURL(link.href);
});

document.getElementById('massDownloadCardsBtnModal')?.addEventListener('click', async function() {
    if (batchQRs.length === 0) { alert('No batch QR codes'); return; }
    const massProgress = document.getElementById('massProgressModal'); const massProgressFill = document.getElementById('massProgressFillModal'); const massStatus = document.getElementById('massStatusModal');
    massProgress.style.display = 'block'; massStatus.textContent = `Generating ${batchQRs.length} ID cards...`; massProgressFill.style.width = '0%';
    const zip = new JSZip();
    for (let i = 0; i < batchQRs.length; i++) {
        const qr = batchQRs[i];
        massProgressFill.style.width = `${((i+1)/batchQRs.length)*100}%`; massStatus.textContent = `Processing ${i+1}/${batchQRs.length}: ${qr.data.pusName}`;
        const canvas = await generateIDCardCanvas(qr.data.pusId, qr.data.pusName, qr.data.startDate, qr.data.endDate, qr.data.cluster, qr.imageUrl);
        if(canvas){ const base64Data = canvas.toDataURL('image/png').split(',')[1]; zip.file(`ID_Card_${qr.data.pusId}_${qr.data.pusName.replace(/[^a-z0-9]/gi, '_')}.png`, base64Data, { base64: true }); }
        await new Promise(r => setTimeout(r, 50));
    }
    const blob = await zip.generateAsync({ type: 'blob' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `All_ID_Cards_${Date.now()}.zip`; link.click(); URL.revokeObjectURL(link.href);
    massStatus.textContent = '✅ All cards ready!'; setTimeout(()=>{ massProgress.style.display='none'; }, 2000);
});

document.getElementById('massPrintCardsBtnModal')?.addEventListener('click', function() {
    if (batchQRs.length === 0) { alert('No batch QR codes to print'); return; }
    
    const cardsPerPage = 6;
    let pagesHtml = '';
    for (let i = 0; i < batchQRs.length; i += cardsPerPage) {
        const pageCards = batchQRs.slice(i, i + cardsPerPage);
        let gridItems = '';
        for (let j = 0; j < pageCards.length; j++) {
            const qr = pageCards[j];
            gridItems += `<div class="print-card-item">${createSingleIDCardHTML(qr.data.pusId, qr.data.pusName, qr.data.startDate, qr.data.endDate, qr.data.cluster, qr.imageUrl)}</div>`;
        }
        pagesHtml += `<div class="print-page"><div class="print-id-grid">${gridItems}</div></div>`;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Iriga PPO ID Cards</title><style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: white; padding: 0.4in; margin: 0; font-family: 'Segoe UI', Arial, sans-serif; }
        .print-id-grid { display: grid; grid-template-columns: repeat(2, 337px); justify-content: center; gap: 20px 36px; margin: 0 auto; width: fit-content; }
        .print-card-item { width: 337px; height: 212px; page-break-inside: avoid; break-inside: avoid; }
        .print-page { page-break-after: always; break-after: page; margin-bottom: 0; }
        .print-page:last-child { page-break-after: auto; break-after: auto; }
        @media print { 
            body { padding: 0.3in; } 
            .print-page { page-break-after: always; } 
            .print-page:last-child { page-break-after: auto; } 
            .print-id-grid { gap: 18px 32px; }
        }
        @page { size: portrait; margin: 0.4in; }
    </style></head><body>${pagesHtml}</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
});

document.getElementById('clearBatchBtnModal')?.addEventListener('click', function() { 
    if(confirm('Clear all batch generated QR codes?')){ 
        batchQRs = []; 
        document.getElementById('batchListModal').innerHTML = '';
        if (typeof closeBatchModal === 'function') {
            closeBatchModal();
        }
    } 
});

function saveToLocalStorage(pusData) {
    let records = JSON.parse(localStorage.getItem('iriga_ppo_pus') || '[]');
    const idx = records.findIndex(r => r.pusId === pusData.pusId);
    if(idx>=0) records[idx] = pusData; else records.push(pusData);
    localStorage.setItem('iriga_ppo_pus', JSON.stringify(records));
    displayPUSList(records);
}

function displayPUSList(records) {
    const container = document.getElementById('pusList');
    if(!records.length){ 
        container.innerHTML = '<p>No records yet. Generate QR codes to add persons.</p>'; 
        return; 
    }
    container.innerHTML = records.map(record => `<div class="batch-item" onclick="loadPUS('${record.pusId}')"><div class="batch-info"><div class="batch-name">${escapeHtml(record.pusName)} <span style="font-size:9px; background:#2a5298; color:white; padding:2px 6px; border-radius:10px;">${escapeHtml(record.pusId)}</span></div><div class="batch-details">${record.offenseCategory} | ${record.cluster||'No Cluster'}</div></div><button class="btn-small" onclick="event.stopPropagation(); regenerateQR('${record.pusId}')">🔄 Regenerate</button></div>`).join('');
}

window.loadPUS = function(pusId) { 
    const records = JSON.parse(localStorage.getItem('iriga_ppo_pus')||'[]'); 
    const record = records.find(r=>r.pusId===pusId); 
    if(record){ 
        document.getElementById('pusId').value=record.pusId; 
        document.getElementById('pusName').value=record.pusName; 
        document.getElementById('gender').value=record.gender; 
        document.getElementById('age').value=record.age; 
        document.getElementById('offenseCategory').value=record.offenseCategory; 
        document.getElementById('caseNumber').value=record.caseNumber || '';
        document.getElementById('startDate').value=record.startDate||''; 
        document.getElementById('endDate').value=record.endDate||''; 
        document.getElementById('address').value=record.address || '';
        document.getElementById('officer').value=record.supervisingOfficer||''; 
        document.getElementById('cluster').value=record.cluster||''; 
        document.getElementById('qrForm').dispatchEvent(new Event('submit')); 
    } 
};

window.regenerateQR = function(pusId) { loadPUS(pusId); };
window.exportAllPUS = function() { 
    const records = JSON.parse(localStorage.getItem('iriga_ppo_pus')||'[]'); 
    if(!records.length){ alert('No records'); return; } 
    const blob = new Blob([JSON.stringify(records,null,2)], {type:'application/json'}); 
    const a=document.createElement('a'); 
    a.download=`iriga_ppo_pus_${new Date().toISOString().split('T')[0]}.json`; 
    a.href=URL.createObjectURL(blob); 
    a.click(); 
    URL.revokeObjectURL(a.href); 
};

window.clearAllPUS = function() { 
    if(confirm('Delete ALL records?')){ 
        localStorage.removeItem('iriga_ppo_pus'); 
        displayPUSList([]); 
        clearForm(); 
    } 
};

function clearForm() { 
    document.getElementById('qrForm').reset(); 
    currentQRData=null; 
    currentClientDataForCard=null; 
}

document.getElementById('templateHelpLink')?.addEventListener('click',(e)=>{ 
    e.preventDefault(); 
    alert("📋 Required headers: PS ID, Full Name, Gender, Age, Offense Category, Criminal Case Number, Start Date, End Date, Address, Supervising Officer, Cluster"); 
});

// Logout button
document.getElementById('logoutBtn')?.addEventListener('click', function() {
    logout();
});

// ============================================
// INITIALIZATION - CHECK SESSION ONLY
// ============================================

checkSession();

const saved = JSON.parse(localStorage.getItem('iriga_ppo_pus')||'[]');
displayPUSList(saved);