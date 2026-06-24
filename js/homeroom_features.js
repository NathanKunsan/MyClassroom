// homeroom_features.js - Handles Homeroom Features with Supabase

// Data Storage
let behaviorLogs = [];
let healthRecords = {}; // Key: student_id
let careLogs = [];
let homeroomActivities = [];
let seatingCharts = {};
let cleaningRosters = {};
let morningTalks = [];
let academicRecords = [];
let teachingPlans = [];

// ==========================================
// DATA LOADING
// ==========================================
window.loadFeatureData = async function() {
    if (!window.currentClassData) return;
    const classId = window.currentClassData.id;

    try {
        // Load Behavior
        const { data: bData } = await supabaseClient
            .from('behavior_logs')
            .select('*')
            .eq('class_id', classId)
            .order('date', { ascending: false });
        if (bData) behaviorLogs = bData;

        // Load Health
        const { data: hData } = await supabaseClient
            .from('health_records')
            .select('*')
            .eq('class_id', classId);
        if (hData) {
            healthRecords = {};
            hData.forEach(r => healthRecords[r.student_id] = r);
        }

        // Load Care
        const { data: cData } = await supabaseClient
            .from('care_logs')
            .select('*')
            .eq('class_id', classId)
            .order('date', { ascending: false });
        if (cData) careLogs = cData;

        // Load Activities
        const { data: actData } = await supabaseClient
            .from('homeroom_activities')
            .select('*')
            .eq('class_id', classId)
            .order('activity_date', { ascending: false });
        if (actData) homeroomActivities = actData;

        // Load Seating Charts
        const { data: seatingData } = await supabaseClient.from('seating_charts').select('*').eq('class_id', classId);
        if (seatingData && seatingData.length > 0) seatingCharts = seatingData[0].layout_data || {};

        // Load Cleaning Rosters
        const { data: cleaningData } = await supabaseClient.from('cleaning_rosters').select('*').eq('class_id', classId);
        if (cleaningData && cleaningData.length > 0) cleaningRosters = cleaningData[0].roster_data || {};

        // Load Morning Talks
        const { data: mtData } = await supabaseClient.from('morning_talks').select('*').eq('class_id', classId).order('talk_date', { ascending: false });
        if (mtData) morningTalks = mtData;

        // Load Academic Records
        const { data: acadData } = await supabaseClient.from('academic_records').select('*').eq('class_id', classId);
        if (acadData) academicRecords = acadData;

        // Load Teaching Plans
        const { data: plansData } = await supabaseClient.from('teaching_plans').select('*').eq('class_id', classId).order('created_at', { ascending: false });
        if (plansData) teachingPlans = plansData;

    } catch (e) {
        console.error('Error loading feature data:', e);
    }
};

// ==========================================
// TAB MANAGEMENT
// ==========================================
window.openFeature = async function(featureId) {
    await window.loadFeatureData();

    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));

    const targetPane = document.getElementById(featureId + '-tab');
    if (targetPane) {
        targetPane.classList.add('active');
        
        const topTab = document.querySelector(`.detail-tab[data-tab="${featureId}-tab"]`);
        if(topTab) topTab.classList.add('active');

        // Render depending on feature
        if (featureId === 'behavior') renderBehaviorTable();
        else if (featureId === 'health') renderHealthTable();
        else if (featureId === 'care') renderCareTable();
        else if (featureId === 'seating') window.generateSeatingGrid(6, 6);
        else if (featureId === 'cleaning') window.renderCleaningRoster();
        else if (featureId === 'fund') window.renderFundTable();
        else if (featureId === 'activities') window.renderActivityTable();
        else if (featureId === 'morning_talk') window.renderMorningTalks();
        else if (featureId === 'academic') window.loadAcademicRecords();
        else if (featureId === 'teaching_plans') window.filterPlans('long_term');
    } else {
        window.showAppAlert('ฟังก์ชันนี้อยู่ระหว่างการพัฒนา');
    }
};

window.backToDashboard = function() {
    document.querySelector('.detail-tab[data-tab="dashboard-tab"]').click();
};

// ==========================================
// FEATURE: Behavior & Core Values
// ==========================================
let currentBehaviorFilter = 'all';

window.filterBehaviorCategory = function(category) {
    currentBehaviorFilter = category;
    renderBehaviorTable();
};

window.renderBehaviorTable = function() {
    const tbody = document.getElementById('behaviorTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (typeof existingStudents === 'undefined' || existingStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">ไม่พบข้อมูลนักเรียน กรุณาเพิ่มนักเรียนในเมนู "รายชื่อนักเรียน"</td></tr>';
        return;
    }

    existingStudents.forEach((student, index) => {
        let studentLogs = behaviorLogs.filter(log => log.student_id === student.id);
        if (currentBehaviorFilter !== 'all') {
            studentLogs = studentLogs.filter(log => log.category === currentBehaviorFilter);
        }

        let totalScore = 100; // Base score
        let lastLogText = '-';
        
        if (studentLogs.length > 0) {
            const latest = studentLogs[0];
            const sign = latest.type === 'positive' ? '+' : '-';
            lastLogText = `<span style="color: ${latest.type === 'positive' ? '#10B981' : '#EF4444'}">[${sign}${latest.points}] ${latest.description}</span> <small style="color: #94A3B8;">(${new Date(latest.date).toLocaleDateString('th-TH')})</small>`;
            
            const allStudentLogs = behaviorLogs.filter(log => log.student_id === student.id);
            allStudentLogs.forEach(log => {
                if (log.type === 'positive') totalScore += log.points;
                else totalScore -= log.points;
            });
        }

        const scoreColor = totalScore >= 100 ? '#10B981' : (totalScore >= 80 ? '#F59E0B' : '#EF4444');
        const rowBgColor = index % 2 === 0 ? 'white' : '#F8FAFC';

        const tr = document.createElement('tr');
        tr.style.backgroundColor = rowBgColor;
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = `
            <td style="text-align: center;">${student.roll_number || '-'}</td>
            <td>${student.title}${student.first_name} ${student.last_name}</td>
            <td style="text-align: center;">${currentBehaviorFilter === 'all' ? 'รวมทุกด้าน' : currentBehaviorFilter}</td>
            <td style="text-align: center; font-weight: bold; color: ${scoreColor};">${totalScore}</td>
            <td>${lastLogText}</td>
            <td style="text-align: center; display: flex; justify-content: center; gap: 0.5rem;">
                <button class="btn" onclick="openBehaviorHistoryModal('${student.id}', '${student.title}${student.first_name} ${student.last_name}')" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background-color: #E2E8F0; color: #475569; border: none; border-radius: 8px;">
                    <i class="ph ph-clock-counter-clockwise"></i> ประวัติ
                </button>
                <button class="btn btn-primary" onclick="openAddBehaviorModal('${student.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background-color: #8B5CF6; border: none; border-radius: 8px;">
                    <i class="ph ph-plus"></i> บันทึก
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.openAddBehaviorModal = function(studentId) {
    const select = document.getElementById('b_student_id');
    
    // Populate select if empty
    if (select.options.length === 0 && typeof existingStudents !== 'undefined') {
        // Sort students by roll number if possible
        const sortedStudents = [...existingStudents].sort((a, b) => parseInt(a.roll_number || 999) - parseInt(b.roll_number || 999));
        sortedStudents.forEach(stu => {
            const opt = document.createElement('option');
            opt.value = stu.id;
            opt.textContent = `เลขที่ ${stu.roll_number || '-'} - ${stu.title}${stu.first_name} ${stu.last_name}`;
            select.appendChild(opt);
        });
    }

    if (studentId) {
        select.value = studentId;
    }
    
    document.getElementById('b_desc').value = '';
    document.getElementById('b_points').value = '1';
    document.getElementById('addBehaviorModal').style.display = 'flex';
};

document.getElementById('behaviorForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = 'กำลังบันทึก...';

    const student_id = document.getElementById('b_student_id').value;
    const category = document.getElementById('b_category').value;
    const type = document.querySelector('input[name="b_type"]:checked').value;
    const points = parseInt(document.getElementById('b_points').value);
    const description = document.getElementById('b_desc').value;
    const class_id = window.currentClassData.id;

    try {
        const { error } = await supabaseClient.from('behavior_logs').insert([{
            class_id, student_id, category, type, points, description
        }]);

        if (error) throw error;
        
        document.getElementById('addBehaviorModal').style.display = 'none';
        Swal.fire({ title: 'สำเร็จ!', text: 'บันทึกพฤติกรรมเรียบร้อยแล้ว', icon: 'success', timer: 1500, showConfirmButton: false });
        
        await window.loadFeatureData();
        renderBehaviorTable();
    } catch (err) {
        console.error(err);
        window.showAppAlert('Error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'บันทึกพฤติกรรม';
    }
});

// Behavior History Modal
window.openBehaviorHistoryModal = function(studentId, studentName) {
    document.getElementById('bh_student_name').textContent = studentName;
    const tbody = document.getElementById('behaviorHistoryTableBody');
    tbody.innerHTML = '';
    
    const studentLogs = behaviorLogs.filter(log => log.student_id === studentId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (studentLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94A3B8;">ไม่มีประวัติพฤติกรรม</td></tr>';
    } else {
        studentLogs.forEach(log => {
            const tr = document.createElement('tr');
            const sign = log.type === 'positive' ? '+' : '-';
            const color = log.type === 'positive' ? '#10B981' : '#EF4444';
            tr.innerHTML = `
                <td>${new Date(log.date).toLocaleDateString('th-TH')}</td>
                <td>${log.category}</td>
                <td style="text-align: center; color: ${color}; font-weight: bold;">${sign}${log.points}</td>
                <td>${log.description || '-'}</td>
                <td style="text-align: center;">
                    <button onclick="deleteBehaviorLog('${log.id}')" style="background: none; border: none; color: #EF4444; cursor: pointer; padding: 0.2rem;">
                        <i class="ph ph-trash" style="font-size: 1.1rem;"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    document.getElementById('behaviorHistoryModal').style.display = 'flex';
};

window.deleteBehaviorLog = async function(logId) {
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ',
            text: "คุณต้องการลบประวัติพฤติกรรมนี้ใช่หรือไม่?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#94A3B8',
            confirmButtonText: 'ลบข้อมูล',
            cancelButtonText: 'ยกเลิก'
        });
        if (!result.isConfirmed) return;
    } else {
        if (!confirm('คุณต้องการลบประวัติพฤติกรรมนี้ใช่หรือไม่?')) return;
    }

    try {
        const { error } = await supabaseClient.from('behavior_logs').delete().eq('id', logId);
        if (error) throw error;
        
        document.getElementById('behaviorHistoryModal').style.display = 'none';
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({ title: 'สำเร็จ!', text: 'ลบประวัติพฤติกรรมเรียบร้อยแล้ว', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
            window.showAppAlert('ลบข้อมูลเรียบร้อยแล้ว', 'success');
        }
        
        await window.loadFeatureData();
        renderBehaviorTable();
    } catch (err) {
        console.error(err);
        window.showAppAlert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message);
    }
};

// ==========================================
// FEATURE: Health & BMI Tracker
// ==========================================
window.renderHealthTable = function() {
    const tbody = document.getElementById('healthTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (typeof existingStudents === 'undefined' || existingStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">ไม่พบข้อมูลนักเรียน กรุณาเพิ่มนักเรียนในเมนู "รายชื่อนักเรียน"</td></tr>';
        return;
    }

    existingStudents.forEach(student => {
        const record = healthRecords[student.id] || { weight: '', height: '', bmi: '', status: '-' };

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center;">${student.roll_number || '-'}</td>
            <td>${student.title}${student.first_name} ${student.last_name}</td>
            <td><input type="number" class="form-control" style="padding: 0.4rem; height: auto;" data-h-id="${student.id}" data-h-type="weight" value="${record.weight}" onchange="calculateBMI('${student.id}')" placeholder="กก."></td>
            <td><input type="number" class="form-control" style="padding: 0.4rem; height: auto;" data-h-id="${student.id}" data-h-type="height" value="${record.height}" onchange="calculateBMI('${student.id}')" placeholder="ซม."></td>
            <td id="bmi-val-${student.id}" style="font-weight: bold; text-align: center;">${record.bmi}</td>
            <td id="bmi-status-${student.id}">${getBMIStatusHTML(record.status)}</td>
        `;
        tbody.appendChild(tr);
    });
};

window.calculateBMI = function(studentId) {
    const weightInput = document.querySelector(`input[data-h-id="${studentId}"][data-h-type="weight"]`);
    const heightInput = document.querySelector(`input[data-h-id="${studentId}"][data-h-type="height"]`);
    
    const weight = parseFloat(weightInput.value);
    const heightCm = parseFloat(heightInput.value);

    if (!isNaN(weight) && !isNaN(heightCm) && heightCm > 0) {
        const heightM = heightCm / 100;
        const bmi = (weight / (heightM * heightM)).toFixed(2);
        
        let status = '';
        if (bmi < 18.5) status = 'ผอมเกินไป';
        else if (bmi < 23) status = 'น้ำหนักปกติ';
        else if (bmi < 25) status = 'น้ำหนักเกิน';
        else if (bmi < 30) status = 'โรคอ้วน';
        else status = 'โรคอ้วนอันตราย';

        document.getElementById(`bmi-val-${studentId}`).textContent = bmi;
        document.getElementById(`bmi-status-${studentId}`).innerHTML = getBMIStatusHTML(status);

        // Update local object
        healthRecords[studentId] = { weight, height: heightCm, bmi, status };
    }
};

window.getBMIStatusHTML = function(status) {
    if (status === 'น้ำหนักปกติ') return `<span style="color: #10B981; font-size: 0.9rem;">${status}</span>`;
    if (status === 'ผอมเกินไป') return `<span style="color: #3B82F6; font-size: 0.9rem;">${status}</span>`;
    if (status === 'น้ำหนักเกิน' || status === 'โรคอ้วน' || status === 'โรคอ้วนอันตราย') return `<span style="color: #EF4444; font-size: 0.9rem; font-weight: bold;">${status}</span>`;
    return '-';
};

window.saveAllHealthData = async function() {
    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> กำลังบันทึก...';

    const class_id = window.currentClassData.id;
    const upserts = [];

    existingStudents.forEach(student => {
        const weightInput = document.querySelector(`input[data-h-id="${student.id}"][data-h-type="weight"]`);
        const heightInput = document.querySelector(`input[data-h-id="${student.id}"][data-h-type="height"]`);
        if (weightInput && heightInput && weightInput.value && heightInput.value) {
            const weight = parseFloat(weightInput.value);
            const height = parseFloat(heightInput.value);
            const heightM = height / 100;
            const bmi = (weight / (heightM * heightM)).toFixed(2);
            let status = '';
            if (bmi < 18.5) status = 'ผอมเกินไป';
            else if (bmi < 23) status = 'น้ำหนักปกติ';
            else if (bmi < 25) status = 'น้ำหนักเกิน';
            else if (bmi < 30) status = 'โรคอ้วน';
            else status = 'โรคอ้วนอันตราย';

            upserts.push({
                class_id,
                student_id: student.id,
                weight,
                height,
                bmi: parseFloat(bmi),
                status
            });
        }
    });

    if (upserts.length === 0) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        return Swal.fire('ข้อมูลว่างเปล่า', 'กรุณากรอกน้ำหนักส่วนสูงอย่างน้อย 1 คน', 'warning');
    }

    try {
        const { error } = await supabaseClient.from('health_records').upsert(upserts, { onConflict: 'student_id' });
        if (error) throw error;
        Swal.fire({ title: 'สำเร็จ!', text: 'บันทึกข้อมูลสุขภาพเรียบร้อยแล้ว', icon: 'success', timer: 1500, showConfirmButton: false });
        await window.loadFeatureData();
    } catch (err) {
        console.error(err);
        window.showAppAlert('Error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// ==========================================
// FEATURE: Student Care & Home Visit
// ==========================================
window.renderCareTable = function() {
    const tbody = document.getElementById('careTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (typeof existingStudents === 'undefined' || existingStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">ไม่พบข้อมูลนักเรียน กรุณาเพิ่มนักเรียนในเมนู "รายชื่อนักเรียน"</td></tr>';
        return;
    }

    existingStudents.forEach(student => {
        let studentLogs = careLogs.filter(log => log.student_id === student.id);
        
        let visitStatus = '<span style="color: #94A3B8;">ยังไม่เคยเยี่ยม/ติดต่อ</span>';
        let screening = '-';

        if (studentLogs.length > 0) {
            const latest = studentLogs[0];
            const dateStr = new Date(latest.date).toLocaleDateString('th-TH');
            
            let icon = 'ph-phone';
            if (latest.type === 'home_visit') icon = 'ph-house-line';
            else if (latest.type === 'line') icon = 'ph-chat-circle';
            else if (latest.type === 'parent_meeting') icon = 'ph-users';

            visitStatus = `<span style="color: #10B981; display: flex; align-items: center; justify-content: center; gap: 0.3rem;"><i class="ph ${icon}"></i> ติดต่อล่าสุด: ${dateStr}</span>`;
            
            if (latest.status === 'normal') screening = '<span style="color: #10B981; background: #D1FAE5; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.85rem;">กลุ่มปกติ</span>';
            else if (latest.status === 'risk') screening = '<span style="color: #F59E0B; background: #FEF3C7; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.85rem;">กลุ่มเสี่ยง</span>';
            else if (latest.status === 'problem') screening = '<span style="color: #EF4444; background: #FEE2E2; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.85rem;">กลุ่มมีปัญหา</span>';
            else if (latest.status === 'special') screening = '<span style="color: #8B5CF6; background: #EDE9FE; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.85rem;">ความสามารถพิเศษ</span>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center;">${student.roll_number || '-'}</td>
            <td>${student.title}${student.first_name} ${student.last_name}</td>
            <td>${student.parent_phone || '-'}</td>
            <td style="text-align: center;">${visitStatus}</td>
            <td>${screening}</td>
            <td style="text-align: center;">
                <button class="btn btn-primary" onclick="openAddCareModal('${student.id}', '${student.title}${student.first_name} ${student.last_name}')" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background-color: #F59E0B; border: none;">
                    <i class="ph ph-note-pencil"></i> บันทึก
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.openAddCareModal = function(studentId, studentName) {
    document.getElementById('c_student_id').value = studentId;
    document.getElementById('c_student_name').textContent = studentName;
    document.getElementById('c_type').value = 'home_visit';
    document.getElementById('c_status').value = 'normal';
    document.getElementById('c_note').value = '';
    document.getElementById('addCareModal').style.display = 'flex';
};

document.getElementById('careForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = 'กำลังบันทึก...';

    const student_id = document.getElementById('c_student_id').value;
    const type = document.getElementById('c_type').value;
    const status = document.getElementById('c_status').value;
    const note = document.getElementById('c_note').value;
    const class_id = window.currentClassData.id;

    try {
        const { error } = await supabaseClient.from('care_logs').insert([{
            class_id, student_id, type, status, note, date: new Date().toISOString()
        }]);

        if (error) throw error;
        
        document.getElementById('addCareModal').style.display = 'none';
        Swal.fire({ title: 'สำเร็จ!', text: 'บันทึกข้อมูลเยี่ยมบ้าน/ดูแลเรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false });
        
        await window.loadFeatureData();
        renderCareTable();
    } catch (err) {
        console.error(err);
        window.showAppAlert('Error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'บันทึกข้อมูล';
    }
});

// ==========================================
// PHASE 2 & 3 SUPABASE INTEGRATION
// ==========================================

// --- Seating Chart ---
let currentSeatingData = [];

window.renderSeatingGrid = async function() {
    const container = document.getElementById('seatingGridContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align: center; color: #94A3B8;">กำลังโหลดผังที่นั่ง...</div>';
    const classId = window.currentClassData.id;

    try {
        const { data, error } = await supabaseClient.from('seating_charts').select('*').eq('class_id', classId).single();
        let rows = 6, cols = 6;
        currentSeatingData = [];

        if (data && data.seat_data) {
            rows = data.grid_rows;
            cols = data.grid_cols;
            currentSeatingData = data.seat_data;
        }

        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        for (let i = 0; i < rows * cols; i++) {
            const seat = document.createElement('div');
            seat.style.border = '2px dashed #CBD5E1';
            seat.style.borderRadius = '8px';
            seat.style.padding = '1rem';
            seat.style.minHeight = '80px';
            seat.style.display = 'flex';
            seat.style.flexDirection = 'column';
            seat.style.alignItems = 'center';
            seat.style.justifyContent = 'center';
            seat.style.cursor = 'grab';
            
            let studentName = 'ที่นั่งว่าง';
            let studentColor = '#94A3B8';
            let bgColor = '#F8FAFC';
            
            const seatedStudentId = currentSeatingData[i];
            if (seatedStudentId && typeof existingStudents !== 'undefined') {
                const st = existingStudents.find(s => s.id === seatedStudentId);
                if (st) {
                    studentName = `${st.first_name}`;
                    studentColor = '#1E293B';
                    bgColor = '#E0F2FE';
                    seat.style.border = '2px solid #3B82F6';
                }
            }
            
            seat.style.backgroundColor = bgColor;
            seat.innerHTML = `<i class="ph ph-user" style="font-size: 1.5rem; color: ${studentColor}; margin-bottom: 0.5rem;"></i><span style="font-size: 0.85rem; font-weight: bold; color: ${studentColor};">${studentName}</span>`;
            container.appendChild(seat);
        }

    } catch (e) {
        console.error(e);
    }
};

window.generateSeatingGrid = function(rows, cols) {
    window.renderSeatingGrid();
};

window.autoAssignSeats = async function() {
    if (typeof existingStudents === 'undefined' || existingStudents.length === 0) return window.showAppAlert('ไม่มีนักเรียนในห้อง');
    
    // Shuffle students array
    let shuffled = [...existingStudents].sort(() => 0.5 - Math.random());
    let seatData = [];
    for (let i = 0; i < 36; i++) {
        seatData[i] = shuffled[i] ? shuffled[i].id : null;
    }

    try {
        const { error } = await supabaseClient.from('seating_charts').upsert({
            class_id: window.currentClassData.id,
            grid_rows: 6,
            grid_cols: 6,
            seat_data: seatData
        }, { onConflict: 'class_id' });

        if (error) throw error;
        Swal.fire({ title: 'สำเร็จ!', text: 'สุ่มผังที่นั่งอัตโนมัติแล้ว', icon: 'success', timer: 1500 });
        window.renderSeatingGrid();
    } catch (e) {
        window.showAppAlert('Error: ' + e.message);
    }
};

// --- Cleaning Roster ---
window.renderCleaningRoster = async function() {
    const container = document.getElementById('cleaningDaysContainer');
    if (!container) return;
    
    const days = [
        { key: 'Monday', name: 'วันจันทร์', color: '#FCD34D' },
        { key: 'Tuesday', name: 'วันอังคาร', color: '#F472B6' },
        { key: 'Wednesday', name: 'วันพุธ', color: '#34D399' },
        { key: 'Thursday', name: 'วันพฤหัสบดี', color: '#FB923C' },
        { key: 'Friday', name: 'วันศุกร์', color: '#60A5FA' }
    ];

    try {
        const { data, error } = await supabaseClient.from('cleaning_rosters').select('*').eq('class_id', window.currentClassData.id);
        
        container.innerHTML = '';
        days.forEach(day => {
            const roster = (data || []).find(r => r.day_of_week === day.key);
            let studentIds = roster ? roster.student_ids : [];
            
            const card = document.createElement('div');
            card.className = 'card';
            card.style.padding = '1rem';
            card.style.borderTop = `4px solid ${day.color}`;
            
            let studentListHtml = '<p style="color: #94A3B8; font-size: 0.9rem;">ยังไม่มีผู้รับผิดชอบ</p>';
            if (studentIds.length > 0 && typeof existingStudents !== 'undefined') {
                const students = studentIds.map(id => existingStudents.find(s => s.id === id)).filter(Boolean);
                if (students.length > 0) {
                    studentListHtml = '<ul style="margin: 0; padding-left: 1.2rem; font-size: 0.9rem;">' + 
                        students.map(s => `<li>${s.first_name} ${s.last_name}</li>`).join('') +
                    '</ul>';
                }
            }
            
            card.innerHTML = `
                <h3 style="margin: 0 0 1rem 0; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">${day.name}</h3>
                ${studentListHtml}
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error(e);
    }
};

window.autoAssignCleaning = async function() {
    if (typeof existingStudents === 'undefined' || existingStudents.length === 0) return window.showAppAlert('ไม่มีนักเรียนในห้อง');
    
    // Shuffle students array
    let shuffled = [...existingStudents].sort(() => 0.5 - Math.random());
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const chunkSize = Math.ceil(shuffled.length / 5);
    
    const upserts = days.map((day, i) => {
        const chunk = shuffled.slice(i * chunkSize, (i + 1) * chunkSize);
        return {
            class_id: window.currentClassData.id,
            day_of_week: day,
            student_ids: chunk.map(s => s.id)
        };
    });

    try {
        // First delete existing for this class
        await supabaseClient.from('cleaning_rosters').delete().eq('class_id', window.currentClassData.id);
        
        // Then insert new ones
        const { error } = await supabaseClient.from('cleaning_rosters').insert(upserts);
        if (error) throw error;
        
        Swal.fire({ title: 'สำเร็จ!', text: 'จัดเวรทำความสะอาดอัตโนมัติแล้ว', icon: 'success', timer: 1500 });
        window.renderCleaningRoster();
    } catch (e) {
        window.showAppAlert('Error: ' + e.message);
    }
};

// --- Class Fund ---
let fundLogs = [];

window.renderFundTable = async function() {
    const tbody = document.getElementById('fundTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">กำลังโหลดข้อมูล...</td></tr>';
    
    if (typeof existingStudents === 'undefined' || existingStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">ไม่พบข้อมูลนักเรียน กรุณาเพิ่มนักเรียนในเมนู "รายชื่อนักเรียน"</td></tr>';
        return;
    }

    try {
        const { data, error } = await supabaseClient.from('class_funds').select('*').eq('class_id', window.currentClassData.id);
        if (data) fundLogs = data;

        tbody.innerHTML = '';
        let tSavings = 0;
        let tFund = 0;

        existingStudents.forEach(student => {
            const studentFunds = fundLogs.filter(f => f.student_id === student.id);
            const saving = studentFunds.filter(f => f.type === 'saving').reduce((sum, f) => sum + Number(f.amount), 0);
            const fund = studentFunds.filter(f => f.type === 'expense').reduce((sum, f) => sum + Number(f.amount), 0);
            
            tSavings += saving;
            tFund += fund;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;">${student.roll_number || '-'}</td>
                <td>${student.title}${student.first_name} ${student.last_name}</td>
                <td style="text-align: right; color: #0F766E; font-weight: bold;">฿${saving.toLocaleString()}.00</td>
                <td style="text-align: right; color: #854D0E; font-weight: bold;">฿${fund.toLocaleString()}.00</td>
                <td style="text-align: center; display: flex; gap: 0.5rem; justify-content: center;">
                    <button class="btn btn-secondary" onclick="addFundLog('${student.id}', 'saving')" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: #CCFBF1; color: #0F766E; border: none;"><i class="ph ph-plus"></i> ออมทรัพย์</button>
                    <button class="btn btn-secondary" onclick="addFundLog('${student.id}', 'expense')" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: #FEF08A; color: #854D0E; border: none;"><i class="ph ph-plus"></i> จ่ายกองกลาง</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        document.getElementById('totalSavings').textContent = tSavings.toLocaleString() + '.00';
        document.getElementById('totalFund').textContent = tFund.toLocaleString() + '.00';
    } catch (e) {
        console.error(e);
    }
};

window.addFundLog = async function(studentId, type) {
    const amountStr = prompt(`กรุณาระบุจำนวนเงิน (${type === 'saving' ? 'ฝากออมทรัพย์' : 'จ่ายกองกลาง'}):`, "20");
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return window.showAppAlert('จำนวนเงินไม่ถูกต้อง');

    try {
        const { error } = await supabaseClient.from('class_funds').insert([{
            class_id: window.currentClassData.id,
            student_id: studentId,
            amount: amount,
            type: type,
            date: new Date().toISOString()
        }]);
        if (error) throw error;
        Swal.fire({ title: 'สำเร็จ!', text: 'บันทึกยอดเงินเรียบร้อย', icon: 'success', timer: 1000, showConfirmButton: false });
        window.renderFundTable();
    } catch (e) {
        window.showAppAlert('Error: ' + e.message);
    }
};

// --- Activities (Phase 3) ---
window.renderActivityTable = function() {
    const tbody = document.getElementById('activitiesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (homeroomActivities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">ไม่พบข้อมูลกิจกรรม</td></tr>';
        return;
    }
    
    homeroomActivities.forEach(act => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(act.activity_date).toLocaleDateString('th-TH')}</td>
            <td style="font-weight: bold; color: #1E293B;">${act.activity_name}</td>
            <td>${act.description || '-'}</td>
            <td style="text-align: center;">
                <button class="btn btn-secondary" onclick="deleteActivity('${act.id}')" style="background-color: #FEE2E2; color: #EF4444; border: none; padding: 0.3rem 0.6rem;">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.openAddActivityModal = function() {
    document.getElementById('act_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('act_name').value = '';
    document.getElementById('act_desc').value = '';
    document.getElementById('addActivityModal').style.display = 'flex';
};

document.getElementById('activityForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!window.currentClassData) return;
    
    const actData = {
        class_id: window.currentClassData.id,
        activity_date: document.getElementById('act_date').value,
        activity_name: document.getElementById('act_name').value,
        description: document.getElementById('act_desc').value
    };
    
    try {
        const { data, error } = await supabaseClient.from('homeroom_activities').insert([actData]);
        if (error) throw error;
        
        Swal.fire({ title: 'สำเร็จ!', text: 'บันทึกกิจกรรมเรียบร้อย', icon: 'success', timer: 1000, showConfirmButton: false });
        document.getElementById('addActivityModal').style.display = 'none';
        
        // Reload data
        await window.loadFeatureData();
        window.renderActivityTable();
    } catch (e) {
        window.showAppAlert('Error: ' + e.message);
    }
});

window.deleteActivity = async function(id) {
    if (!confirm('ยืนยันการลบกิจกรรมนี้?')) return;
    try {
        const { error } = await supabaseClient.from('homeroom_activities').delete().eq('id', id);
        if (error) throw error;
        await window.loadFeatureData();
        window.renderActivityTable();
    } catch (e) {
        window.showAppAlert('Error: ' + e.message);
    }
};

// --- Feature 5: Seating Chart ---
window.generateSeatingGrid = function(rows, cols) {
    const container = document.getElementById('seatingGridContainer');
    if (!container) return;
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    container.innerHTML = '';
    
    // We will draw a simple grid and map students if seatingCharts exist
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const key = `${r}-${c}`;
            const studentId = seatingCharts[key] || null;
            const student = studentId ? existingStudents.find(s => s.id === studentId) : null;
            
            const cell = document.createElement('div');
            cell.style.border = '1px dashed #CBD5E1';
            cell.style.borderRadius = '8px';
            cell.style.padding = '1rem';
            cell.style.textAlign = 'center';
            cell.style.minHeight = '80px';
            cell.style.display = 'flex';
            cell.style.flexDirection = 'column';
            cell.style.justifyContent = 'center';
            cell.style.alignItems = 'center';
            cell.style.background = student ? '#E0F2FE' : '#FFFFFF';
            
            if (student) {
                cell.innerHTML = `<strong>${student.first_name}</strong><span style="font-size:0.8rem;color:#64748B">เลขที่ ${student.student_number}</span>`;
            } else {
                cell.innerHTML = `<span style="color:#94A3B8;font-size:0.8rem;">ว่าง</span>`;
            }
            container.appendChild(cell);
        }
    }
};

window.autoAssignSeats = async function() {
    if (!window.currentClassData) return;
    if (typeof existingStudents === 'undefined' || existingStudents.length === 0) return window.showAppAlert('ไม่มีนักเรียนในห้อง');
    
    // Simple random assignment in a 6x6 grid
    const shuffled = [...existingStudents].sort(() => 0.5 - Math.random());
    const newSeating = {};
    let sIdx = 0;
    
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            if (sIdx < shuffled.length) {
                newSeating[`${r}-${c}`] = shuffled[sIdx].id;
                sIdx++;
            }
        }
    }
    
    try {
        const payload = { class_id: window.currentClassData.id, layout_data: newSeating };
        const { error } = await supabaseClient.from('seating_charts').upsert(payload, { onConflict: 'class_id' });
        if (error) throw error;
        seatingCharts = newSeating;
        window.generateSeatingGrid(6, 6);
        Swal.fire('สำเร็จ', 'สุ่มที่นั่งเรียบร้อยแล้ว', 'success');
    } catch (e) {
        window.showAppAlert('Error: ' + e.message);
    }
};

// --- Feature 6: Cleaning Roster ---
window.renderCleaningRoster = function() {
    const container = document.getElementById('cleaningDaysContainer');
    if (!container) return;
    container.innerHTML = '';
    
    const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
    const colors = ['#FEF08A', '#FBCFE8', '#BBF7D0', '#FED7AA', '#BFDBFE'];
    
    days.forEach((day, index) => {
        const studentIds = cleaningRosters[day] || [];
        const studentsListHTML = studentIds.map(id => {
            const s = existingStudents.find(st => st.id === id);
            return s ? `<li style="padding: 0.3rem 0; border-bottom: 1px solid #E2E8F0;">เลขที่ ${s.student_number} ${s.first_name}</li>` : '';
        }).join('');
        
        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderTop = `4px solid ${colors[index]}`;
        card.style.padding = '1rem';
        card.innerHTML = `
            <h3 style="text-align:center; margin-top:0;">วัน${day}</h3>
            <ul style="list-style:none; padding:0; font-size:0.9rem; color:#475569;">
                ${studentsListHTML || '<li style="text-align:center; color:#94A3B8;">ไม่มีเวร</li>'}
            </ul>
        `;
        container.appendChild(card);
    });
};

window.autoAssignCleaning = async function() {
    if (!window.currentClassData) return;
    if (typeof existingStudents === 'undefined' || existingStudents.length === 0) return window.showAppAlert('ไม่มีนักเรียนในห้อง');
    
    const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
    const shuffled = [...existingStudents].sort(() => 0.5 - Math.random());
    const newRoster = { 'จันทร์':[], 'อังคาร':[], 'พุธ':[], 'พฤหัสบดี':[], 'ศุกร์':[] };
    
    shuffled.forEach((s, idx) => {
        newRoster[days[idx % 5]].push(s.id);
    });
    
    try {
        const payload = { class_id: window.currentClassData.id, roster_data: newRoster };
        const { error } = await supabaseClient.from('cleaning_rosters').upsert(payload, { onConflict: 'class_id' });
        if (error) throw error;
        cleaningRosters = newRoster;
        window.renderCleaningRoster();
        Swal.fire('สำเร็จ', 'แบ่งกลุ่มเวรทำความสะอาดเรียบร้อย', 'success');
    } catch (e) {
        window.showAppAlert('Error: ' + e.message);
    }
};

// --- Feature 8: Morning Talk ---
window.renderMorningTalks = function() {
    const tbody = document.getElementById('morningTalkTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (morningTalks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">ไม่พบข้อมูล</td></tr>';
        return;
    }
    
    morningTalks.forEach(mt => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(mt.talk_date).toLocaleDateString('th-TH')}</td>
            <td style="font-weight: bold; color: #1E293B;">${mt.topic}</td>
            <td>${mt.note || '-'}</td>
            <td style="text-align: center;">
                <button class="btn btn-secondary" onclick="deleteMorningTalk('${mt.id}')" style="background-color: #FEE2E2; color: #EF4444; border: none; padding: 0.3rem 0.6rem;">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.openAddMorningTalkModal = function() {
    document.getElementById('mt_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('mt_topic').value = '';
    document.getElementById('mt_note').value = '';
    document.getElementById('addMorningTalkModal').style.display = 'flex';
};

document.getElementById('morningTalkForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!window.currentClassData) return;
    
    const mtData = {
        class_id: window.currentClassData.id,
        talk_date: document.getElementById('mt_date').value,
        topic: document.getElementById('mt_topic').value,
        note: document.getElementById('mt_note').value
    };
    
    try {
        const { error } = await supabaseClient.from('morning_talks').insert([mtData]);
        if (error) throw error;
        Swal.fire({ title: 'สำเร็จ!', text: 'บันทึกเรียบร้อย', icon: 'success', timer: 1000, showConfirmButton: false });
        document.getElementById('addMorningTalkModal').style.display = 'none';
        await window.loadFeatureData();
        window.renderMorningTalks();
    } catch (e) {
        window.showAppAlert('Error: ' + e.message);
    }
});

window.deleteMorningTalk = async function(id) {
    if (!confirm('ยืนยันการลบ?')) return;
    try {
        const { error } = await supabaseClient.from('morning_talks').delete().eq('id', id);
        if (error) throw error;
        await window.loadFeatureData();
        window.renderMorningTalks();
    } catch (e) {
        window.showAppAlert('Error: ' + e.message);
    }
};

// --- Feature 9: Academic Overview ---
window.loadAcademicRecords = function() {
    const tbody = document.getElementById('academicTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (typeof existingStudents === 'undefined' || existingStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">ไม่พบข้อมูลนักเรียน</td></tr>';
        return;
    }
    
    const semester = document.getElementById('academicSemesterSelect').value;
    const subjectGroup = document.getElementById('academicSubjectSelect').value;
    
    existingStudents.forEach(student => {
        const record = academicRecords.find(r => r.student_id === student.id && r.semester === semester && r.subject_group === subjectGroup);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.student_number || '-'}</td>
            <td>${student.first_name} ${student.last_name}</td>
            <td style="text-align: center;">
                <input type="number" class="form-control acad-score" data-studentid="${student.id}" min="0" max="100" value="${record ? record.score : ''}" style="width: 80px; text-align: center; margin: 0 auto;" onchange="calculateGrade(this)">
            </td>
            <td style="text-align: center; font-weight: bold; font-size: 1.2rem; color: var(--primary);" class="acad-grade">
                ${record ? record.grade : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.calculateGrade = function(inputElem) {
    const score = parseInt(inputElem.value);
    let grade = '-';
    if (!isNaN(score)) {
        if (score >= 80) grade = '4.0';
        else if (score >= 75) grade = '3.5';
        else if (score >= 70) grade = '3.0';
        else if (score >= 65) grade = '2.5';
        else if (score >= 60) grade = '2.0';
        else if (score >= 55) grade = '1.5';
        else if (score >= 50) grade = '1.0';
        else grade = '0';
    }
    inputElem.parentElement.nextElementSibling.innerText = grade;
};

window.saveAcademicRecords = async function() {
    if (!window.currentClassData) return;
    const semester = document.getElementById('academicSemesterSelect').value;
    const subjectGroup = document.getElementById('academicSubjectSelect').value;
    
    const inputs = document.querySelectorAll('.acad-score');
    const recordsToSave = [];
    
    inputs.forEach(input => {
        const studentId = input.getAttribute('data-studentid');
        const score = input.value ? parseFloat(input.value) : null;
        const gradeText = input.parentElement.nextElementSibling.innerText;
        const grade = gradeText !== '-' ? parseFloat(gradeText) : null;
        
        if (score !== null && grade !== null) {
            recordsToSave.push({
                class_id: window.currentClassData.id,
                student_id: studentId,
                semester: semester,
                subject_group: subjectGroup,
                score: score,
                grade: grade
            });
        }
    });
    
    if (recordsToSave.length === 0) return window.showAppAlert('ไม่มีข้อมูลให้บันทึก');
    
    try {
        await supabaseClient.from('academic_records').delete().eq('class_id', window.currentClassData.id).eq('semester', semester).eq('subject_group', subjectGroup);
        const { error } = await supabaseClient.from('academic_records').insert(recordsToSave);
        if (error) throw error;
        
        Swal.fire('สำเร็จ', 'บันทึกผลการเรียนเรียบร้อย', 'success');
        await window.loadFeatureData();
    } catch (e) {
        window.showAppAlert('Error: ' + e.message);
    }
};

// --- Feature 10: Teaching Plans ---
let currentPlanTypeFilter = 'long_term';

window.filterPlans = function(type) {
    currentPlanTypeFilter = type;
    window.renderTeachingPlans();
};

window.renderTeachingPlans = function() {
    const tbody = document.getElementById('teachingPlansTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const filteredPlans = teachingPlans.filter(p => p.plan_type === currentPlanTypeFilter);
    
    if (filteredPlans.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">ไม่พบข้อมูลแผนการสอน</td></tr>';
        return;
    }
    
    const typeNames = {
        'long_term': 'แผนการสอนระยะยาว',
        'unit': 'แผนการสอนรายหน่วย',
        'period': 'แผนการสอนรายคาบ',
        'homeroom': 'แผนจัดกิจกรรมโฮมรูม'
    };
    
    filteredPlans.forEach(plan => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(plan.created_at).toLocaleDateString('th-TH')}</td>
            <td><span style="background: #F1F5F9; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.85rem;">${typeNames[plan.plan_type]}</span></td>
            <td style="font-weight: bold; color: #1E293B;">${plan.title}</td>
            <td style="text-align: center;">
                <button class="btn btn-outline" onclick="downloadPlanPDF('${plan.id}')" style="color: #EF4444; border-color: #EF4444; padding: 0.3rem 0.6rem;">
                    <i class="ph ph-file-pdf"></i> PDF
                </button>
            </td>
            <td style="text-align: center;">
                <button class="btn btn-secondary" onclick="deleteTeachingPlan('${plan.id}')" style="background-color: #FEE2E2; color: #EF4444; border: none; padding: 0.3rem 0.6rem;">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.openCreatePlanModal = function() {
    document.getElementById('tp_type').value = currentPlanTypeFilter;
    document.getElementById('tp_title').value = '';
    window.updatePlanFields();
    document.getElementById('createPlanModal').style.display = 'flex';
};

window.updatePlanFields = function() {
    const type = document.getElementById('tp_type').value;
    const container = document.getElementById('tp_dynamic_fields');
    container.innerHTML = ''; // clear
    
    if (type === 'long_term') {
        container.innerHTML = `
            <div class="form-group" style="margin-bottom: 0.5rem;"><label>คำอธิบายรายวิชา (โดยย่อ)</label><textarea id="tp_desc" class="form-control" rows="2"></textarea></div>
            <div class="form-group" style="margin-bottom: 0.5rem;"><label>มาตรฐานการเรียนรู้/ตัวชี้วัด</label><textarea id="tp_standards" class="form-control" rows="2"></textarea></div>
            <div class="form-group"><label>สัดส่วนคะแนน (เก็บ:สอบ)</label><input type="text" id="tp_ratio" class="form-control" placeholder="เช่น 70:30"></div>
        `;
    } else if (type === 'unit') {
        container.innerHTML = `
            <div class="form-group" style="margin-bottom: 0.5rem;"><label>สาระสำคัญ / ความคิดรวบยอด</label><textarea id="tp_concept" class="form-control" rows="2"></textarea></div>
            <div class="form-group" style="margin-bottom: 0.5rem;"><label>จุดประสงค์การเรียนรู้</label><textarea id="tp_obj" class="form-control" rows="2"></textarea></div>
            <div class="form-group"><label>จำนวนชั่วโมง</label><input type="number" id="tp_hours" class="form-control" value="1"></div>
        `;
    } else if (type === 'period') {
        container.innerHTML = `
            <div class="form-group" style="margin-bottom: 0.5rem;"><label>จุดประสงค์เชิงพฤติกรรม (K-P-A)</label><textarea id="tp_kpa" class="form-control" rows="2"></textarea></div>
            <div class="form-group" style="margin-bottom: 0.5rem;"><label>กิจกรรมการเรียนรู้ (ขั้นนำ-สอน-สรุป)</label><textarea id="tp_activities" class="form-control" rows="3"></textarea></div>
            <div class="form-group"><label>สื่อ/แหล่งเรียนรู้</label><input type="text" id="tp_media" class="form-control"></div>
        `;
    } else {
        container.innerHTML = `
            <div class="form-group" style="margin-bottom: 0.5rem;"><label>หัวข้อ/กิจกรรม</label><textarea id="tp_activity" class="form-control" rows="2"></textarea></div>
            <div class="form-group"><label>ระยะเวลา (นาที)</label><input type="number" id="tp_duration" class="form-control" value="20"></div>
        `;
    }
};

document.getElementById('teachingPlanForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!window.currentClassData) return;
    
    const type = document.getElementById('tp_type').value;
    const title = document.getElementById('tp_title').value;
    let content = {};
    
    if (type === 'long_term') {
        content = { desc: document.getElementById('tp_desc').value, standards: document.getElementById('tp_standards').value, ratio: document.getElementById('tp_ratio').value };
    } else if (type === 'unit') {
        content = { concept: document.getElementById('tp_concept').value, obj: document.getElementById('tp_obj').value, hours: document.getElementById('tp_hours').value };
    } else if (type === 'period') {
        content = { kpa: document.getElementById('tp_kpa').value, activities: document.getElementById('tp_activities').value, media: document.getElementById('tp_media').value };
    } else {
        content = { activity: document.getElementById('tp_activity').value, duration: document.getElementById('tp_duration').value };
    }
    
    try {
        const payload = {
            class_id: window.currentClassData.id,
            plan_type: type,
            title: title,
            content: content
        };
        const { error } = await supabaseClient.from('teaching_plans').insert([payload]);
        if (error) throw error;
        
        Swal.fire({ title: 'สำเร็จ!', text: 'บันทึกและสร้างแผนเรียบร้อย', icon: 'success', timer: 1000, showConfirmButton: false });
        document.getElementById('createPlanModal').style.display = 'none';
        currentPlanTypeFilter = type;
        await window.loadFeatureData();
        window.renderTeachingPlans();
    } catch (e) {
        window.showAppAlert('Error: ' + e.message);
    }
});

window.deleteTeachingPlan = async function(id) {
    if (!confirm('ยืนยันการลบแผนนี้?')) return;
    try {
        const { error } = await supabaseClient.from('teaching_plans').delete().eq('id', id);
        if (error) throw error;
        await window.loadFeatureData();
        window.renderTeachingPlans();
    } catch (e) {
        window.showAppAlert('Error: ' + e.message);
    }
};

window.downloadPlanPDF = function(id) {
    const plan = teachingPlans.find(p => p.id === id);
    if (!plan) return;
    
    const printDiv = document.createElement('div');
    printDiv.style.fontFamily = "'Sarabun', 'THSarabunPSK', sans-serif";
    printDiv.style.fontSize = "16px";
    printDiv.style.padding = "40px";
    printDiv.style.color = "#000";
    printDiv.style.background = "#fff";
    printDiv.style.lineHeight = "1.5";
    
    let htmlContent = `<h2 style="text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 1rem;">${plan.title}</h2><hr style="margin-bottom: 1.5rem;"/>`;
    
    if (plan.plan_type === 'long_term') {
        htmlContent += `<p style="margin-bottom: 1rem;"><strong>คำอธิบายรายวิชา:</strong><br>${plan.content.desc.replace(/n/g, '<br>')}</p>
                        <p style="margin-bottom: 1rem;"><strong>มาตรฐานการเรียนรู้/ตัวชี้วัด:</strong><br>${plan.content.standards.replace(/n/g, '<br>')}</p>
                        <p style="margin-bottom: 1rem;"><strong>สัดส่วนคะแนน (เก็บ:สอบ):</strong> ${plan.content.ratio}</p>`;
    } else if (plan.plan_type === 'unit') {
        htmlContent += `<p style="margin-bottom: 1rem;"><strong>สาระสำคัญ / ความคิดรวบยอด:</strong><br>${plan.content.concept.replace(/n/g, '<br>')}</p>
                        <p style="margin-bottom: 1rem;"><strong>จุดประสงค์การเรียนรู้:</strong><br>${plan.content.obj.replace(/n/g, '<br>')}</p>
                        <p style="margin-bottom: 1rem;"><strong>จำนวนชั่วโมง:</strong> ${plan.content.hours} ชั่วโมง</p>`;
    } else if (plan.plan_type === 'period') {
        htmlContent += `<p style="margin-bottom: 1rem;"><strong>จุดประสงค์เชิงพฤติกรรม:</strong><br>${plan.content.kpa.replace(/n/g, '<br>')}</p>
                        <p style="margin-bottom: 1rem;"><strong>กิจกรรมการเรียนรู้:</strong><br>${plan.content.activities.replace(/n/g, '<br>')}</p>
                        <p style="margin-bottom: 1rem;"><strong>สื่อ/แหล่งเรียนรู้:</strong> ${plan.content.media}</p>`;
    } else {
        htmlContent += `<p style="margin-bottom: 1rem;"><strong>หัวข้อ/กิจกรรม:</strong><br>${plan.content.activity.replace(/n/g, '<br>')}</p>
                        <p style="margin-bottom: 1rem;"><strong>ระยะเวลา:</strong> ${plan.content.duration} นาที</p>`;
    }
    
    printDiv.innerHTML = htmlContent;
    document.body.appendChild(printDiv);
    
    const opt = {
        margin:       0.5,
        filename:     `${plan.title}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(printDiv).save().then(() => {
        document.body.removeChild(printDiv);
    });
};
