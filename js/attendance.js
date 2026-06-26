// js/attendance.js

let attendanceData = [];
let html5QrcodeScanner = null;
let currentAttendanceDate = new Date().toISOString().split('T')[0]; // Default today

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) {
        dateInput.value = currentAttendanceDate;
        updateDateDisplay(currentAttendanceDate);
        dateInput.addEventListener('change', (e) => {
            currentAttendanceDate = e.target.value;
            updateDateDisplay(currentAttendanceDate);
            loadAttendanceData();
        });
    }

    // Set up tab listener to init attendance when tab is clicked
    const attendanceTabBtn = document.querySelector('[data-tab="attendance-tab"]');
    if (attendanceTabBtn) {
        attendanceTabBtn.addEventListener('click', () => {
            setTimeout(initAttendance, 100);
        });
    }
});

let attendanceDates = new Set();
let fpInstance = null;

async function fetchAttendanceDates() {
    if (!currentClassId) return;
    try {
        const { data, error } = await supabaseClient
            .from('attendance')
            .select('date')
            .eq('class_id', currentClassId);
            
        if (error) throw error;
        
        attendanceDates.clear();
        if (data) {
            data.forEach(r => attendanceDates.add(r.date));
        }
    } catch (err) {
        console.error('Error fetching attendance dates:', err);
    }
}

async function initFlatpickr() {
    const btn = document.getElementById('attendanceDateBtn');
    if (!btn) return;
    if (typeof flatpickr === 'undefined') return;

    await fetchAttendanceDates();

    const updateThaiYear = (selectedDates, dateStr, instance) => {
        if (instance.currentYearElement) {
            instance.currentYearElement.value = instance.currentYear + 543;
        }
    };

    fpInstance = flatpickr(btn, {
        locale: "th",
        defaultDate: currentAttendanceDate,
        monthSelectorType: "static",
        onReady: updateThaiYear,
        onYearChange: updateThaiYear,
        onMonthChange: updateThaiYear,
        onChange: function(selectedDates, dateStr, instance) {
            currentAttendanceDate = dateStr;
            updateDateDisplay(currentAttendanceDate);
            loadAttendanceData();
        },
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            const offset = dayElem.dateObj.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(dayElem.dateObj - offset)).toISOString().split('T')[0];
            
            if (attendanceDates.has(localISOTime)) {
                dayElem.innerHTML += '<span class="has-attendance-dot"></span>';
                dayElem.classList.add('has-attendance-day');
            }
        }
    });
}

async function initAttendance() {
    if (!existingStudents || existingStudents.length === 0) {
        document.getElementById('attendanceContentEmpty').style.display = 'block';
        document.getElementById('attendanceContent').style.display = 'none';
        return;
    }

    document.getElementById('attendanceContentEmpty').style.display = 'none';
    document.getElementById('attendanceContent').style.display = 'block';

    if (!fpInstance) {
        await initFlatpickr();
    }

    await loadAttendanceData();
}

async function loadAttendanceData() {
    if (!currentClassId) return;

    // Initialize data from existing students
    attendanceData = existingStudents.map(s => ({
        id: s.id,
        code: s.student_id,
        title: s.title,
        first_name: s.first_name,
        last_name: s.last_name,
        number: s.roll_number,
        status: '', // 'present', 'late', 'sick_leave', 'personal_leave'
        note: ''
    }));

    // Fetch existing attendance from DB for the selected date
    try {
        const { data, error } = await supabaseClient
            .from('attendance')
            .select('*')
            .eq('class_id', currentClassId)
            .eq('date', currentAttendanceDate);

        if (error) throw error;

        if (data && data.length > 0) {
            // Update attendanceData with DB values
            data.forEach(record => {
                const studentIndex = attendanceData.findIndex(s => s.id === record.student_id);
                if (studentIndex !== -1) {
                    attendanceData[studentIndex].status = record.status;
                    attendanceData[studentIndex].note = record.note || '';
                }
            });
        }
    } catch (err) {
        console.error('Error fetching attendance:', err);
        window.showAppAlert('เกิดข้อผิดพลาดในการดึงข้อมูลการเช็กชื่อ');
    }

    renderAttendanceTable();
}

function renderAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    // Sort by number
    attendanceData.sort((a, b) => (a.number || 0) - (b.number || 0));

    attendanceData.forEach((s, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.style.backgroundColor = index % 2 === 0 ? 'white' : '#F8FAFC';
        
        tr.innerHTML = `
            <td style="padding: 1rem;">${s.number || '-'}</td>
            <td style="padding: 1rem;">${s.code || '-'}</td>
            <td style="padding: 1rem; font-weight: 500;">${s.title}${s.first_name} ${s.last_name}</td>
            <td style="padding: 1rem; text-align: center;">
                <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                    <button class="status-btn ${s.status === 'present' ? 'active-present' : ''}" onclick="setStatus('${s.id}', 'present')" style="padding: 0.4rem 0.8rem; border-radius: 20px; border: 1px solid #10B981; background: ${s.status === 'present' ? '#10B981' : 'transparent'}; color: ${s.status === 'present' ? 'white' : '#10B981'}; cursor: pointer; transition: all 0.2s;">
                        มา
                    </button>
                    <button class="status-btn ${s.status === 'late' ? 'active-late' : ''}" onclick="setStatus('${s.id}', 'late')" style="padding: 0.4rem 0.8rem; border-radius: 20px; border: 1px solid #F59E0B; background: ${s.status === 'late' ? '#F59E0B' : 'transparent'}; color: ${s.status === 'late' ? 'white' : '#F59E0B'}; cursor: pointer; transition: all 0.2s;">
                        สาย
                    </button>
                    <button class="status-btn ${s.status === 'sick_leave' ? 'active-sick' : ''}" onclick="setStatus('${s.id}', 'sick_leave')" style="padding: 0.4rem 0.8rem; border-radius: 20px; border: 1px solid #3B82F6; background: ${s.status === 'sick_leave' ? '#3B82F6' : 'transparent'}; color: ${s.status === 'sick_leave' ? 'white' : '#3B82F6'}; cursor: pointer; transition: all 0.2s;">
                        ลาป่วย
                    </button>
                    <button class="status-btn ${s.status === 'personal_leave' ? 'active-personal' : ''}" onclick="setStatus('${s.id}', 'personal_leave')" style="padding: 0.4rem 0.8rem; border-radius: 20px; border: 1px solid #8B5CF6; background: ${s.status === 'personal_leave' ? '#8B5CF6' : 'transparent'}; color: ${s.status === 'personal_leave' ? 'white' : '#8B5CF6'}; cursor: pointer; transition: all 0.2s;">
                        ลากิจ
                    </button>
                    <button class="status-btn ${s.status === 'absent' ? 'active-absent' : ''}" onclick="setStatus('${s.id}', 'absent')" style="padding: 0.4rem 0.8rem; border-radius: 20px; border: 1px solid #EF4444; background: ${s.status === 'absent' ? '#EF4444' : 'transparent'}; color: ${s.status === 'absent' ? 'white' : '#EF4444'}; cursor: pointer; transition: all 0.2s;">
                        ขาด
                    </button>
                </div>
            </td>
            <td style="padding: 1rem;">
                <input type="text" class="form-control" style="padding: 0.5rem; width: 100%; border-radius: 6px; border: 1px solid #e2e8f0;" placeholder="หมายเหตุ..." value="${s.note}" onchange="setNote('${s.id}', this.value)">
            </td>
        `;
        tbody.appendChild(tr);
    });

    const modeAvatar = document.getElementById('modeAvatar');
    if (modeAvatar && modeAvatar.style.display !== 'none') {
        renderAvatarBoard();
    }
}

function setStatus(studentId, status) {
    const student = attendanceData.find(s => s.id === studentId);
    if (student) {
        // Toggle off if same
        student.status = student.status === status ? '' : status;
        renderAttendanceTable();
    }
}

function setNote(studentId, note) {
    const student = attendanceData.find(s => s.id === studentId);
    if (student) {
        student.note = note;
    }
}

function markAllPresent() {
    attendanceData.forEach(s => {
        s.status = 'present';
    });
    renderAttendanceTable();
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'เช็กชื่อว่า "มา" ให้ทุกคนแล้ว',
        showConfirmButton: false,
        timer: 1500
    });
}

function clearAllAttendance() {
    Swal.fire({
        title: 'ยืนยันการเคลียร์?',
        text: 'ระบบจะล้างสถานะการเช็กชื่อของทุกคนกลับเป็นค่าว่าง',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#9CA3AF',
        confirmButtonText: 'เคลียร์เลย',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            attendanceData.forEach(s => {
                s.status = '';
            });
            renderAttendanceTable();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'เคลียร์สถานะทุกคนแล้ว',
                showConfirmButton: false,
                timer: 1500
            });
        }
    });
}

function updateDateDisplay(dateStr) {
    const el = document.getElementById('displayDateText');
    if (!el || !dateStr) return;
    const d = new Date(dateStr);
    el.textContent = d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function switchAttendanceMode(mode) {
    const modes = ['manual', 'qr', 'avatar'];
    modes.forEach(m => {
        const btnIdStr = m.toUpperCase() === 'QR' ? 'QR' : m.charAt(0).toUpperCase() + m.slice(1);
        const btnId = `modeBtn${btnIdStr}`;
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.classList.remove('active');
            btn.style.borderBottomColor = 'transparent';
            btn.style.color = 'var(--text-sub)';
        }
        
        const secId = `mode${btnIdStr}`;
        const sec = document.getElementById(secId);
        if (sec) {
            sec.style.display = 'none';
        }
    });

    const activeBtnStr = mode.toUpperCase() === 'QR' ? 'QR' : mode.charAt(0).toUpperCase() + mode.slice(1);
    const activeBtnId = `modeBtn${activeBtnStr}`;
    const activeSectionId = `mode${activeBtnStr}`;
    
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.borderBottomColor = 'var(--primary)';
        activeBtn.style.color = 'var(--primary)';
    }

    const activeSec = document.getElementById(activeSectionId);
    if (activeSec) {
        activeSec.style.display = 'block';
    }

    if (mode === 'avatar') {
        renderAvatarBoard();
    } else if (mode !== 'qr') {
        stopQRScanner();
    }
}

// Avatar Board Logic
let sortableAbsent = null;
let sortablePresent = null;

function renderAvatarBoard() {
    const listAbsent = document.getElementById('avatarListAbsent');
    const listPresent = document.getElementById('avatarListPresent');
    const countAbsent = document.getElementById('avatarAbsentCount');
    const countPresent = document.getElementById('avatarPresentCount');
    
    if (!listAbsent || !listPresent) return;

    listAbsent.innerHTML = '';
    listPresent.innerHTML = '';

    let absentCount = 0;
    let presentCount = 0;

    const colors = ['#FEE2E2', '#FEF3C7', '#D1FAE5', '#DBEAFE', '#E0E7FF', '#F3E8FF', '#FCE7F3'];

    attendanceData.forEach((s, index) => {
        const color = colors[index % colors.length];
        const isPresent = s.status === 'present';
        
        const card = document.createElement('div');
        card.className = 'avatar-card';
        card.setAttribute('data-id', s.id);
        card.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: white;
            padding: 0.5rem 0.75rem;
            border-radius: 999px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            cursor: grab;
            border: 1px solid #E2E8F0;
            transition: transform 0.2s;
            user-select: none;
        `;
        card.onmousedown = () => card.style.cursor = 'grabbing';
        card.onmouseup = () => card.style.cursor = 'grab';
        card.onmouseleave = () => card.style.cursor = 'grab';
        
        // Tap to move (fallback for mobile / easier click)
        card.onclick = () => {
            const student = attendanceData.find(st => st.id === s.id);
            if (student) {
                student.status = student.status === 'present' ? '' : 'present';
                renderAttendanceTable(); 
            }
        };

        card.innerHTML = `
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #475569; font-size: 0.9rem;">
                ${s.number || '-'}
            </div>
            <div style="font-weight: 500; color: var(--text-main); font-size: 0.9rem; padding-right: 0.5rem;">
                ${s.first_name}
            </div>
        `;

        if (isPresent) {
            listPresent.appendChild(card);
            presentCount++;
        } else {
            listAbsent.appendChild(card);
            absentCount++;
        }
    });

    if (countAbsent) countAbsent.textContent = absentCount;
    if (countPresent) countPresent.textContent = presentCount;

    // Init Sortable
    if (!sortableAbsent && typeof Sortable !== 'undefined') {
        sortableAbsent = new Sortable(listAbsent, {
            group: 'shared',
            animation: 150,
            onEnd: handleAvatarDragEnd
        });
    }
    if (!sortablePresent && typeof Sortable !== 'undefined') {
        sortablePresent = new Sortable(listPresent, {
            group: 'shared',
            animation: 150,
            onEnd: handleAvatarDragEnd
        });
    }
}

function handleAvatarDragEnd(evt) {
    const itemEl = evt.item;
    const studentId = itemEl.getAttribute('data-id');
    const toListId = evt.to.id; 
    
    const student = attendanceData.find(s => s.id === studentId);
    if (student) {
        if (toListId === 'avatarListPresent') {
            student.status = 'present';
        } else {
            student.status = '';
        }
        renderAttendanceTable();
    }
}

// QR Code Logic
function startQRScanner() {
    if (typeof Html5Qrcode === 'undefined') {
        window.showAppAlert('ไม่พบไลบรารีสแกน QR Code');
        return;
    }
    document.getElementById('startQrBtn').style.display = 'none';
    document.getElementById('stopQrBtn').style.display = 'inline-block';
    document.getElementById('qrReader').style.display = 'block';

    html5QrcodeScanner = new Html5Qrcode("qrReader");
    html5QrcodeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error("Error starting scanner", err);
        window.showAppAlert('ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบการอนุญาตใช้งานกล้อง');
        stopQRScanner();
    });
}

function stopQRScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
        }).catch(err => {
            console.error("Failed to stop scanner", err);
            html5QrcodeScanner = null;
        });
    }
    const startBtn = document.getElementById('startQrBtn');
    const stopBtn = document.getElementById('stopQrBtn');
    const qrReader = document.getElementById('qrReader');
    
    if (startBtn) startBtn.style.display = 'inline-block';
    if (stopBtn) stopBtn.style.display = 'none';
    if (qrReader) qrReader.style.display = 'none';
}

let lastScannedCode = '';
let lastScanTime = 0;

function onScanSuccess(decodedText) {
    const code = decodedText.trim();
    const now = Date.now();
    
    // ป้องกันการสแกนโค้ดเดิมซ้ำภายใน 3 วินาที (ป้องกันการสแกนรัวๆ)
    if (code === lastScannedCode && (now - lastScanTime) < 3000) {
        return;
    }
    
    lastScannedCode = code;
    lastScanTime = now;

    const studentIndex = attendanceData.findIndex(s => s.code === code);
    
    if (studentIndex !== -1) {
        // ถ้านักเรียนคนนี้ถูกเช็กชื่อว่า "มา" ไปแล้ว ให้ข้ามไปเลย ไม่ต้องเด้งแจ้งเตือนซ้ำ
        if (attendanceData[studentIndex].status === 'present') {
            return;
        }

        attendanceData[studentIndex].status = 'present';
        renderAttendanceTable();
        
        // Show small success toast
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `เช็กชื่อ ${attendanceData[studentIndex].first_name} แล้ว`,
            showConfirmButton: false,
            timer: 1500
        });
    } else {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: `ไม่พบรหัสนักเรียน ${code} ในห้องนี้`,
            showConfirmButton: false,
            timer: 2000
        });
    }
}

function onScanFailure(error) {
    // ignore
}

// File Import Logic
function handleAttendanceFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
        window.showAppAlert('ไม่พบไลบรารีอ่านไฟล์ Excel');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            const json = XLSX.utils.sheet_to_json(worksheet, {header: 1});

            // Assuming header is at index 0, and format is [..., รหัสนักเรียน, ..., สถานะ]
            // We just do a fuzzy search
            let codeIndex = -1;
            let statusIndex = -1;

            if (json.length > 0) {
                const header = json[0].map(h => String(h).trim().toLowerCase());
                codeIndex = header.findIndex(h => h.includes('รหัส') || h.includes('code') || h.includes('id'));
                statusIndex = header.findIndex(h => h.includes('สถานะ') || h.includes('status'));
            }

            if (codeIndex === -1 || statusIndex === -1) {
                window.showAppAlert('รูปแบบไฟล์ไม่ถูกต้อง ต้องมีคอลัมน์ "รหัสนักเรียน" และ "สถานะ"');
                return;
            }

            let importCount = 0;
            for (let i = 1; i < json.length; i++) {
                const row = json[i];
                if (!row || row.length === 0) continue;
                
                const rawCode = String(row[codeIndex] || '').trim();
                const rawStatus = String(row[statusIndex] || '').trim();

                const studentIndex = attendanceData.findIndex(s => s.code === rawCode);
                if (studentIndex !== -1) {
                    let st = '';
                    if (rawStatus.includes('มา') || rawStatus.toLowerCase().includes('present')) st = 'present';
                    else if (rawStatus.includes('สาย') || rawStatus.toLowerCase().includes('late')) st = 'late';
                    else if (rawStatus.includes('ป่วย') || rawStatus.toLowerCase().includes('sick')) st = 'sick_leave';
                    else if (rawStatus.includes('กิจ') || rawStatus.toLowerCase().includes('personal')) st = 'personal_leave';
                    
                    if (st) {
                        attendanceData[studentIndex].status = st;
                        importCount++;
                    }
                }
            }

            renderAttendanceTable();
            Swal.fire({
                icon: 'success',
                text: `นำเข้าข้อมูลการเช็กชื่อสำเร็จ ${importCount} รายการ`,
                confirmButtonColor: '#3B82F6'
            });

        } catch (err) {
            console.error('Error reading file:', err);
            window.showAppAlert('เกิดข้อผิดพลาดในการอ่านไฟล์');
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // Reset
}

// Save Logic
async function saveAttendance() {
    if (!currentClassId) return;

    // Filter only students with status
    const toSave = attendanceData.filter(s => s.status !== '');

    const btn = document.getElementById('saveAttendanceBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> กำลังบันทึก...';
    btn.disabled = true;

    try {
        if (toSave.length === 0) {
            // Delete all attendance for this class and date
            const { error } = await supabaseClient
                .from('attendance')
                .delete()
                .eq('class_id', currentClassId)
                .eq('date', currentAttendanceDate);

            if (error) throw error;

            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ',
                text: `ยกเลิก/ล้างการเช็กชื่อสำหรับวันที่ ${currentAttendanceDate} เรียบร้อยแล้ว`,
                confirmButtonColor: '#3B82F6',
                confirmButtonText: 'ตกลง'
            });

            // Remove the calendar dot for this date
            attendanceDates.delete(currentAttendanceDate);
            if (fpInstance) {
                fpInstance.redraw();
            }
            return;
        }

        // Fetch current user
        const { data: { user } } = await supabaseClient.auth.getUser();

        // Prepare data for upsert
        const records = toSave.map(s => ({
            class_id: currentClassId,
            student_id: s.id,
            date: currentAttendanceDate,
            status: s.status,
            note: s.note
        }));

        // In Supabase, onConflict must not have spaces between columns
        const { error } = await supabaseClient
            .from('attendance')
            .upsert(records, { onConflict: 'class_id,student_id,date' });

        if (error) {
            console.error('Upsert error:', error);
            throw error;
        }

        Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            text: `บันทึกการเช็กชื่อสำหรับวันที่ ${currentAttendanceDate} เรียบร้อยแล้ว`,
            confirmButtonColor: '#3B82F6',
            confirmButtonText: 'ตกลง'
        });

        // Update the calendar dot for this date
        attendanceDates.add(currentAttendanceDate);
        if (fpInstance) {
            fpInstance.redraw();
        }

    } catch (err) {
        console.error('Error saving attendance:', err);
        window.showAppAlert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (err.message || JSON.stringify(err)));
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Export Attendance Logic
function toggleAttendanceDownloadMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('attendanceDownloadMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

document.addEventListener('click', function(e) {
    const menu = document.getElementById('attendanceDownloadMenu');
    if (menu && !e.target.closest('#attendanceDownloadMenu') && !e.target.closest('button[onclick="toggleAttendanceDownloadMenu(event)"]')) {
        menu.style.display = 'none';
    }
});

function exportAttendance(type) {
    const menu = document.getElementById('attendanceDownloadMenu');
    if (menu) menu.style.display = 'none';
    
    if (!attendanceData || attendanceData.length === 0) {
        window.showAppAlert('ไม่มีข้อมูลการเช็กชื่อให้ดาวน์โหลด', 'warning');
        return;
    }
    
    // Sort students by roll number
    const sortedStudents = [...attendanceData].sort((a, b) => parseInt(a.number || 999) - parseInt(b.number || 999));
    
    const statusMap = {
        'present': 'มาเรียน',
        'late': 'สาย',
        'sick_leave': 'ลาป่วย',
        'personal_leave': 'ลากิจ',
        'absent': 'ขาดเรียน',
        '': 'ยังไม่เช็ก'
    };
    
    // Prepare data
    const headers = ['เลขที่', 'รหัสนักเรียน', 'ชื่อ-นามสกุล', 'สถานะ', 'หมายเหตุ'];
    const data = sortedStudents.map(s => [
        s.number || '',
        s.code || '',
        `${s.title || ''}${s.first_name || ''} ${s.last_name || ''}`,
        statusMap[s.status] || 'ยังไม่เช็ก',
        s.note || ''
    ]);
    
    let classNamePart = 'รายวิชา';
    let gradeRoomPart = '';
    
    if (window.currentClassData) {
        const cls = window.currentClassData;
        classNamePart = cls.type === 'homeroom' ? 'ห้องประจำชั้น' : (cls.subject_name || 'รายวิชา');
        gradeRoomPart = `${cls.grade_level || ''}/${cls.room_number || ''}`;
    } else {
        const classNameEl = document.getElementById('classNameSpan');
        classNamePart = classNameEl ? classNameEl.innerText : 'รายชื่อนักเรียน';
        gradeRoomPart = 'ไม่ระบุชั้น';
    }
    
    if (!gradeRoomPart || gradeRoomPart === '/') gradeRoomPart = 'ไม่ระบุชั้น';
    
    const formattedDate = new Date(currentAttendanceDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const fileName = `บันทึกเวลาเรียน_${classNamePart}_${gradeRoomPart}_${currentAttendanceDate}`.replace(/\s+/g, '_').replace(/\//g, '-');
    
    if (type === 'csv') {
        let csvContent = '\uFEFF' + headers.join(',') + '\n';
        data.forEach(row => {
            csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${fileName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } else if (type === 'xlsx') {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({c: C, r: R});
                if (!ws[cellRef]) continue;
                
                ws[cellRef].s = {
                    font: { name: "THSarabunPSK", sz: 16 }
                };
                
                if (R === 0) {
                    ws[cellRef].s.font.bold = true;
                    ws[cellRef].s.fill = { fgColor: { rgb: "F1F5F9" } };
                }
            }
        }
        
        ws['!cols'] = [{wch: 10}, {wch: 20}, {wch: 35}, {wch: 15}, {wch: 30}];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "การเช็กชื่อ");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
        
    } else if (type === 'pdf') {
        if (typeof html2pdf === 'undefined') {
            window.showAppAlert('ไม่พบไลบรารีสำหรับสร้าง PDF กรุณารีเฟรชหน้าเว็บแล้วลองใหม่');
            return;
        }
        
        let teacherName = '......................................................';
        const teacherEl = document.getElementById('teacherNameSpan');
        if (teacherEl && teacherEl.innerText && teacherEl.innerText !== 'กำลังโหลด...') {
            teacherName = teacherEl.innerText;
        }

        const previewOverlay = document.createElement('div');
        previewOverlay.style.position = 'absolute';
        previewOverlay.style.top = '0';
        previewOverlay.style.left = '0';
        previewOverlay.style.minWidth = '100vw';
        previewOverlay.style.minHeight = '100vh';
        previewOverlay.style.backgroundColor = '#e2e8f0';
        previewOverlay.style.zIndex = '999999';
        previewOverlay.style.display = 'block'; // Use block to prevent negative X overflow
        previewOverlay.style.padding = '80px 20px 40px 20px';
        previewOverlay.style.textAlign = 'center';
        
        let html = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
                .pdf-wrapper {
                    font-family: 'TH Sarabun PSK', 'THSarabunPSK', 'Sarabun', sans-serif;
                    font-size: 16pt;
                    background-color: white;
                    color: #000;
                    width: 800px;
                    padding: 40px;
                    box-sizing: border-box;
                }
                .pdf-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 16pt;
                    margin-bottom: 40px;
                }
                .pdf-table th, .pdf-table td {
                    border: 1px solid #000;
                    padding: 8px;
                }
                .pdf-table th {
                    background-color: #f8fafc;
                    font-weight: bold;
                    text-align: center;
                    white-space: nowrap;
                }
            </style>
            <div class="pdf-wrapper">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h1 style="font-size: 24pt; font-weight: bold; margin: 0 0 10px 0;">แบบบันทึกเวลาเรียน</h1>
                    <p style="font-size: 16pt; margin: 0 0 5px 0;">วิชา: ${classNamePart} ชั้น: ${gradeRoomPart}</p>
                    <p style="font-size: 16pt; margin: 0;">ประจำวันที่: ${formattedDate}</p>
                </div>
                <table class="pdf-table">
                    <thead>
                        <tr>
                            <th style="width: 10%;">เลขที่</th>
                            <th style="width: 20%;">รหัสประจำตัว</th>
                            <th style="width: 35%;">ชื่อ - นามสกุล</th>
                            <th style="width: 15%;">สถานะ</th>
                            <th style="width: 20%;">หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        data.forEach(row => {
            html += `
                        <tr>
                            <td style="text-align: center;">${row[0]}</td>
                            <td style="text-align: center;">${row[1]}</td>
                            <td style="text-align: left;">${row[2]}</td>
                            <td style="text-align: center;">${row[3]}</td>
                            <td style="text-align: left;">${row[4]}</td>
                        </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
                
                <div style="margin-top: 40px; page-break-inside: avoid;">
                    <div>
                        <p style="margin-bottom: 15px; font-size: 16px; font-weight: bold;">สรุปผลการมาเรียน:</p>
                        <p style="font-size: 16px; margin: 5px 0;">มาเรียน: ${sortedStudents.filter(s => s.status === 'present').length} คน, ขาดเรียน: ${sortedStudents.filter(s => s.status === 'absent').length} คน</p>
                        <p style="font-size: 16px; margin: 5px 0;">ลาป่วย: ${sortedStudents.filter(s => s.status === 'sick_leave').length} คน, ลากิจ: ${sortedStudents.filter(s => s.status === 'personal_leave').length} คน</p>
                        <p style="font-size: 16px; margin: 5px 0;">สาย: ${sortedStudents.filter(s => s.status === 'late').length} คน</p>
                        <p style="font-size: 16px; margin: 5px 0; font-weight: bold;">รวมทั้งสิ้น: ${sortedStudents.length} คน</p>
                    </div>
                    <div style="display: flex; justify-content: flex-end; margin-top: 60px;">
                        <div style="width: 45%; text-align: center;">
                            <p style="margin-bottom: 10px; font-size: 16px;">ลงชื่อ .....................................................................</p>
                            <p style="font-size: 16px; margin: 5px 0;">( ${teacherName.replace('คุณครู', '')} )</p>
                            <p style="font-size: 16px; margin: 5px 0;">ครูผู้สอน / ครูประจำชั้น</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        previewOverlay.innerHTML = `
            <div style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #2563eb; color: white; padding: 12px 24px; border-radius: 30px; font-family: 'Sarabun', sans-serif; font-size: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000000; display: flex; align-items: center; gap: 10px;">
                <div style="width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                กำลังจัดเตรียมเอกสาร PDF...
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            <div id="actual-pdf-content" style="background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: max-content; margin: 0 auto; text-align: left;">
                ${html}
            </div>
        `;
        
        document.body.appendChild(previewOverlay);
        
        const originalOverflow = document.body.style.overflow;
        const originalHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'visible';
        document.documentElement.style.overflow = 'visible';
        
        // Scroll to top so the overlay is perfectly visible
        window.scrollTo(0, 0);
        
        const targetElement = document.getElementById('actual-pdf-content');
        
        const opt = {
            margin:       [0, 0, 0, 0], // Margins are handled by the inner .pdf-wrapper padding
            filename:     `${fileName}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true,
                scrollX: 0,
                scrollY: 0
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        setTimeout(() => {
            html2pdf().set(opt).from(targetElement).save().then(() => {
                document.body.removeChild(previewOverlay);
                document.body.style.overflow = originalOverflow;
                document.documentElement.style.overflow = originalHtmlOverflow;
            });
        }, 500);
    }
}
