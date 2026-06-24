// students.js - จัดการรายชื่อนักเรียน (อัปโหลด Excel/CSV และกรอกเอง)

let existingStudents = [];
let currentClassroomId = new URLSearchParams(window.location.search).get('id');

// Menu toggle functions added to global scope
window.toggleTemplateMenu = function(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('templateDownloadMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
};

document.addEventListener('click', function(e) {
    const menu = document.getElementById('templateDownloadMenu');
    if (menu && !e.target.closest('#templateDownloadMenu') && !e.target.closest('button[onclick="toggleTemplateMenu(event)"]')) {
        menu.style.display = 'none';
    }
});

// downloadExcelTemplate is added to global scope
window.downloadExcelTemplate = function(type = 'xlsx') {
    const menu = document.getElementById('templateDownloadMenu');
    if (menu) menu.style.display = 'none';

    const headers = ['เลขที่', 'รหัสประจำตัว', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'เบอร์โทรศัพท์นักเรียน', 'เบอร์โทรศัพท์ผู้ปกครอง', 'หมายเหตุ'];
    
    // ป้องกัน Excel เปลี่ยนเบอร์โทรเป็นเลขยกกำลัง (E+08)
    const phoneVal = type === 'csv' ? "'0812345678" : "0812345678";
    const parentPhoneVal = type === 'csv' ? "'0898765432" : "0898765432";
    
    const sampleRow = ['1', '65001', 'ด.ช.', 'สมชาย', 'เรียนดี', phoneVal, parentPhoneVal, 'แพ้อาหารทะเล'];

    if (type === 'csv') {
        let csvContent = '\uFEFF' + headers.join(',') + '\n';
        csvContent += sampleRow.map(cell => `"${cell}"`).join(',') + '\n';
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'template_รายชื่อนักเรียน.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        if (typeof XLSX === 'undefined') {
            alert('ไม่พบไลบรารี XLSX กรุณารีเฟรชหน้าเว็บ');
            return;
        }
        
        const wsData = [headers, sampleRow];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // บังคับให้คอลัมน์เบอร์โทรเป็น String เสมอ
        ws['F2'] = { t: 's', v: "0812345678", w: "0812345678" };
        ws['G2'] = { t: 's', v: "0898765432", w: "0898765432" };
        
        ws['!cols'] = [
            {wch: 10}, {wch: 15}, {wch: 10}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 25}
        ];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, 'template_รายชื่อนักเรียน.xlsx');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // โหลดรายชื่อนักเรียนที่มีอยู่แล้วในห้องนี้
    if (currentClassroomId) {
        loadExistingStudents();
    }

    // Setup File Dropzone
    const dropzone = document.getElementById('fileDropzone');
    const fileInput = document.getElementById('studentFileInput');
    
    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--primary)';
            dropzone.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
        });
        
        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--border-color)';
            dropzone.style.backgroundColor = 'transparent';
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--border-color)';
            dropzone.style.backgroundColor = 'transparent';
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }

    // Setup Manual Form
    const manualForm = document.getElementById('manualStudentForm');
    if (manualForm) {
        manualForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const student = {
                roll_number: document.getElementById('m_roll_number').value,
                student_id: document.getElementById('m_student_id').value,
                title: document.getElementById('m_title').value,
                first_name: document.getElementById('m_first_name').value,
                last_name: document.getElementById('m_last_name').value,
                phone: document.getElementById('m_phone').value || null,
                parent_phone: document.getElementById('m_parent_phone').value || null,
                remark: document.getElementById('m_remark').value || null,
            };
            
            await processStudents([student]);
            manualForm.reset();
        });
    }

    // Setup Edit Form
    const editForm = document.getElementById('editStudentForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitEditStudent();
        });
    }
});

// Modal UI Functions
function openAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'flex';
}

function closeAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'none';
    document.getElementById('uploadStatus').style.display = 'none';
    if(document.getElementById('studentFileInput')) {
        document.getElementById('studentFileInput').value = '';
    }
}

function switchAddStudentTab(tabId) {
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.borderBottomColor = 'transparent';
        btn.style.color = 'var(--text-sub)';
    });
    
    const activeBtn = event.currentTarget;
    activeBtn.classList.add('active');
    activeBtn.style.borderBottomColor = 'var(--primary)';
    activeBtn.style.color = 'var(--primary)';
    
    document.getElementById('tab-upload').style.display = tabId === 'upload' ? 'block' : 'none';
    document.getElementById('tab-manual').style.display = tabId === 'manual' ? 'block' : 'none';
}

function openEditStudentModal(id) {
    const student = existingStudents.find(s => s.id === id);
    if (!student) return;
    
    document.getElementById('e_student_uuid').value = student.id;
    document.getElementById('e_roll_number').value = student.roll_number || '';
    document.getElementById('e_student_id').value = student.student_id || '';
    document.getElementById('e_title').value = student.title || 'ด.ช.';
    document.getElementById('e_first_name').value = student.first_name || '';
    document.getElementById('e_last_name').value = student.last_name || '';
    document.getElementById('e_phone').value = student.phone || '';
    document.getElementById('e_parent_phone').value = student.parent_phone || '';
    if(document.getElementById('e_remark')) {
        document.getElementById('e_remark').value = student.remark || '';
    }
    
    document.getElementById('editStudentModal').style.display = 'flex';
}

function closeEditStudentModal() {
    document.getElementById('editStudentModal').style.display = 'none';
}

async function submitEditStudent() {
    const id = document.getElementById('e_student_uuid').value;
    const updateData = {
        roll_number: document.getElementById('e_roll_number').value,
        student_id: document.getElementById('e_student_id').value,
        title: document.getElementById('e_title').value,
        first_name: document.getElementById('e_first_name').value,
        last_name: document.getElementById('e_last_name').value,
        phone: document.getElementById('e_phone').value || null,
        parent_phone: document.getElementById('e_parent_phone').value || null,
        remark: document.getElementById('e_remark') ? (document.getElementById('e_remark').value || null) : null,
    };
    
    try {
        const { error } = await supabaseClient.from('students').update(updateData).eq('id', id);
        if (error) throw error;
        
        closeEditStudentModal();
        await loadExistingStudents();
    } catch (err) {
        console.error('Error updating student:', err);
        window.showAppAlert('เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    }
}

function deleteStudent(id) {
    document.getElementById('d_student_uuid').value = id;
    document.getElementById('deleteStudentModal').style.display = 'flex';
}

function closeDeleteStudentModal() {
    document.getElementById('deleteStudentModal').style.display = 'none';
}

async function confirmDeleteStudent() {
    const id = document.getElementById('d_student_uuid').value;
    if (!id) return;
    
    // Disable button to prevent double clicks
    const btn = document.querySelector('#deleteStudentModal .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> กำลังลบ...';
    btn.disabled = true;
    
    try {
        const { error } = await supabaseClient.from('students').delete().eq('id', id);
        if (error) throw error;
        
        closeDeleteStudentModal();
        await loadExistingStudents();
    } catch (err) {
        console.error('Error deleting student:', err);
        window.showAppAlert('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ----------------------------------------------------
// ระบบโหลดข้อมูลและประมวลผล (Backend Sync & Logic)
// ----------------------------------------------------

async function loadExistingStudents() {
    try {
        const { data, error } = await supabaseClient
            .from('students')
            .select('*')
            .eq('classroom_id', currentClassroomId);
            
        if (error) throw error;
        existingStudents = data || [];
        renderStudentsList();
    } catch (err) {
        console.error('Error loading students:', err);
    }
}

function handleFileUpload(file) {
    const reader = new FileReader();
    
    // แบบอ่าน CSV ด้วย Text Reader (แก้ปัญหาภาษาไทยเพี้ยน)
    if (file.name.toLowerCase().endsWith('.csv')) {
        reader.onload = function(e) {
            const text = e.target.result;
            const rows = text.split(/\r?\n/);
            if (rows.length < 2) {
                showUploadStatus('ไฟล์ไม่มีข้อมูล หรือรูปแบบไม่ถูกต้อง', 'error');
                return;
            }
            
            // ลบ BOM (\uFEFF) เผื่อว่าไฟล์มีมาด้วย
            const headers = rows[0].split(',').map(h => h.trim().replace(/^[\uFEFF]/, ''));
            
            const idxRoll = headers.findIndex(h => h.includes('เลขที่'));
            const idxSid = headers.findIndex(h => h.includes('รหัส'));
            const idxTitle = headers.findIndex(h => h.includes('คำนำหน้า'));
            const idxFirst = headers.findIndex(h => h === 'ชื่อ' || h.includes('ชื่อ')); 
            const idxLast = headers.findIndex(h => h === 'นามสกุล' || h.includes('นามสกุล'));
            const idxPhone = headers.findIndex(h => h.includes('เบอร์โทรศัพท์นักเรียน') || h.includes('เบอร์โทร'));
            const idxParentPhone = headers.findIndex(h => h.includes('เบอร์โทรศัพท์ผู้ปกครอง'));
            const idxRemark = headers.findIndex(h => h.includes('หมายเหตุ'));
            
            if (idxFirst === -1) {
                showUploadStatus('ไม่พบคอลัมน์ "ชื่อ" ในไฟล์ กรุณาตรวจสอบหัวตาราง', 'error');
                return;
            }
            
            const parsedStudents = [];
            for (let i = 1; i < rows.length; i++) {
                if (!rows[i].trim()) continue;
                const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                
                const firstName = cols[idxFirst];
                if (!firstName) continue;
                
                const getCol = (idx) => (idx !== -1 && cols[idx]) ? cols[idx].trim() : null;
                const formatPhone = (val) => {
                    if (!val) return null;
                    let p = val.replace(/\D/g, '');
                    if (p.length === 9 && !p.startsWith('0')) return '0' + p;
                    return val;
                };
                
                parsedStudents.push({
                    roll_number: getCol(idxRoll),
                    student_id: getCol(idxSid),
                    title: getCol(idxTitle) || '',
                    first_name: firstName.trim(),
                    last_name: getCol(idxLast) || '',
                    phone: formatPhone(getCol(idxPhone)),
                    parent_phone: formatPhone(getCol(idxParentPhone)),
                    remark: getCol(idxRemark)
                });
            }
            
            if (parsedStudents.length > 0) {
                processStudents(parsedStudents);
            } else {
                showUploadStatus('ไม่พบข้อมูลนักเรียนที่สามารถนำเข้าได้', 'error');
            }
        };
        reader.readAsText(file, 'UTF-8');
        return;
    }
    
    // แบบอ่าน Excel (.xlsx) ด้วย SheetJS
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
        
        if (jsonData.length < 2) {
            showUploadStatus('ไฟล์ไม่มีข้อมูล หรือรูปแบบไม่ถูกต้อง', 'error');
            return;
        }
        
        const headers = jsonData[0].map(h => h ? h.toString().trim() : '');
        
        const idxRoll = headers.findIndex(h => h.includes('เลขที่'));
        const idxSid = headers.findIndex(h => h.includes('รหัส'));
        const idxTitle = headers.findIndex(h => h.includes('คำนำหน้า'));
        const idxFirst = headers.findIndex(h => h === 'ชื่อ' || h.includes('ชื่อ'));
        const idxLast = headers.findIndex(h => h === 'นามสกุล' || h.includes('นามสกุล'));
        const idxPhone = headers.findIndex(h => h.includes('เบอร์โทรศัพท์นักเรียน') || h.includes('เบอร์โทร'));
        const idxParentPhone = headers.findIndex(h => h.includes('เบอร์โทรศัพท์ผู้ปกครอง'));
        const idxRemark = headers.findIndex(h => h.includes('หมายเหตุ'));
        
        if (idxFirst === -1) {
            showUploadStatus('ไม่พบคอลัมน์ "ชื่อ" ในไฟล์ กรุณาตรวจสอบหัวตาราง', 'error');
            return;
        }
        
        const parsedStudents = [];
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            const firstName = row[idxFirst];
            if (!firstName) continue;
            
            const getCol = (idx) => (idx !== -1 && row[idx] != null && row[idx] !== '') ? String(row[idx]).trim() : null;
            const formatPhone = (val) => {
                if (!val) return null;
                let p = val.replace(/\D/g, '');
                if (p.length === 9 && !p.startsWith('0')) return '0' + p;
                return val;
            };
            
            parsedStudents.push({
                roll_number: getCol(idxRoll),
                student_id: getCol(idxSid),
                title: getCol(idxTitle) || '',
                first_name: String(firstName).trim(),
                last_name: getCol(idxLast) || '',
                phone: formatPhone(getCol(idxPhone)),
                parent_phone: formatPhone(getCol(idxParentPhone)),
                remark: getCol(idxRemark)
            });
        }
        
        if (parsedStudents.length > 0) {
            processStudents(parsedStudents);
        } else {
            showUploadStatus('ไม่พบข้อมูลนักเรียนที่สามารถนำเข้าได้', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

// ระบบตรวจสอบความซ้ำซ้อนขั้นสูง (Advanced Deduplication & Upsert)
async function processStudents(incomingStudents) {
    showUploadStatus('<i class="ph ph-spinner ph-spin"></i> กำลังประมวลผลข้อมูล...', 'info');
    
    let insertCount = 0;
    let updateCount = 0;
    
    const inserts = [];
    const updates = [];
    
    for (const inc of incomingStudents) {
        let matchFound = false;
        
        // 1. ตรวจสอบจากฐานข้อมูลเดิมว่ามีคนนี้อยู่แล้วหรือไม่
        for (const ext of existingStudents) {
            let isSame = false;
            
            // เช็กรหัสนักเรียน (ถ้ามี)
            if (inc.student_id && ext.student_id && String(inc.student_id) === String(ext.student_id)) {
                isSame = true;
            }
            // เช็กชื่อ-นามสกุล
            else if (inc.first_name === ext.first_name && inc.last_name === ext.last_name) {
                isSame = true;
            }
            // เช็กเลขที่ (เผื่อกรณีลืมใส่ชื่อ แต่มีเลขที่ตรงกันเป๊ะในห้องนี้)
            else if (inc.roll_number && ext.roll_number && String(inc.roll_number) === String(ext.roll_number)) {
                isSame = true;
            }
            
            if (isSame) {
                matchFound = true;
                updates.push({
                    id: ext.id,
                    classroom_id: currentClassroomId,
                    student_id: inc.student_id || ext.student_id,
                    roll_number: inc.roll_number || ext.roll_number,
                    title: inc.title || ext.title,
                    first_name: inc.first_name || ext.first_name,
                    last_name: inc.last_name || ext.last_name,
                    phone: inc.phone || ext.phone,
                    parent_phone: inc.parent_phone || ext.parent_phone,
                    remark: inc.remark !== undefined ? inc.remark : ext.remark
                });
                break;
            }
        }
        
        if (!matchFound) {
            inserts.push({
                classroom_id: currentClassroomId,
                student_id: inc.student_id,
                roll_number: inc.roll_number,
                title: inc.title,
                first_name: inc.first_name,
                last_name: inc.last_name,
                phone: inc.phone,
                parent_phone: inc.parent_phone,
                remark: inc.remark
            });
        }
    }
    
    try {
        // Execute Updates
        if (updates.length > 0) {
            const { error } = await supabaseClient.from('students').upsert(updates);
            if (error) throw error;
            updateCount = updates.length;
        }
        
        // Execute Inserts
        if (inserts.length > 0) {
            const { error } = await supabaseClient.from('students').insert(inserts);
            if (error) throw error;
            insertCount = inserts.length;
        }
        
        // Reload fresh data from database to ensure sync
        await loadExistingStudents();
        
        showUploadStatus(`<i class="ph ph-check-circle"></i> นำเข้าสำเร็จ! เพิ่มใหม่ ${insertCount} คน, อัปเดตข้อมูล ${updateCount} คน`, 'success');
        
        setTimeout(() => {
            closeAddStudentModal();
        }, 2500);
        
    } catch (err) {
        console.error('Database Error:', err);
        const errMsg = err.message || err.details || JSON.stringify(err);
        showUploadStatus('เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล: ' + errMsg, 'error');
    }
}

function showUploadStatus(htmlMsg, type) {
    const statusDiv = document.getElementById('uploadStatus');
    const statusText = document.getElementById('uploadStatusText');
    statusDiv.style.display = 'block';
    statusText.innerHTML = htmlMsg;
    
    if (type === 'error') {
        statusText.style.color = '#EF4444';
    } else if (type === 'success') {
        statusText.style.color = '#10B981';
    } else {
        statusText.style.color = 'var(--text-main)';
    }
}

// เรนเดอร์รายชื่อนักเรียนบนหน้าเว็บ (UI Sync)
function renderStudentsList() {
    const studentsContainer = document.querySelector('.detail-empty'); // เปลี่ยนพื้นที่ว่างเป็นตาราง
    const parentTab = document.getElementById('students-tab');
    
    if (!studentsContainer || existingStudents.length === 0) {
        if (studentsContainer) studentsContainer.style.display = 'flex';
        const existingTable = parentTab ? parentTab.querySelector('.table-responsive') : null;
        if (existingTable) existingTable.remove();
        return;
    }
    
    // Sort by roll number
    existingStudents.sort((a, b) => parseInt(a.roll_number || 999) - parseInt(b.roll_number || 999));
    
    let tableHtml = `
        <div class="table-responsive" style="margin-top: 1rem; overflow-x: auto; background-color: var(--card-bg); border-radius: 12px; box-shadow: var(--shadow-sm);">
            <table style="width: 100%; border-collapse: collapse; text-align: left; white-space: nowrap;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-sub); background-color: #F8FAFC;">
                        <th style="padding: 1rem; width: 60px;">เลขที่</th>
                        <th style="padding: 1rem;">รหัสนักเรียน</th>
                        <th style="padding: 1rem;">คำนำหน้า</th>
                        <th style="padding: 1rem;">ชื่อ</th>
                        <th style="padding: 1rem;">นามสกุล</th>
                        <th style="padding: 1rem;">เบอร์นักเรียน</th>
                        <th style="padding: 1rem;">เบอร์ผู้ปกครอง</th>
                        <th style="padding: 1rem;">หมายเหตุ</th>
                        <th style="padding: 1rem; width: 100px; text-align: center;">จัดการ</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    existingStudents.forEach(stu => {
        tableHtml += `
            <tr style="border-bottom: 1px solid var(--border-color); transition: background-color 0.2s;">
                <td style="padding: 1rem; font-weight: bold;">${stu.roll_number || '-'}</td>
                <td style="padding: 1rem; color: var(--text-sub);">${stu.student_id || '-'}</td>
                <td style="padding: 1rem; color: var(--text-sub);">${stu.title || '-'}</td>
                <td style="padding: 1rem; font-weight: 500;">
                    ${stu.first_name || '-'}
                </td>
                <td style="padding: 1rem;">${stu.last_name || '-'}</td>
                <td style="padding: 1rem; color: var(--text-sub);">${stu.phone || '-'}</td>
                <td style="padding: 1rem; color: var(--text-sub);">${stu.parent_phone || '-'}</td>
                <td style="padding: 1rem;">
                    ${stu.remark ? `<span style="background-color: #FEE2E2; color: #EF4444; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; display: inline-block;">${stu.remark}</span>` : '<span style="color: var(--border-color);">-</span>'}
                </td>
                <td style="padding: 1rem; text-align: center;">
                    <div style="display: flex; justify-content: center; gap: 0.5rem;">
                        <button onclick="openEditStudentModal('${stu.id}')" style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; border: none; cursor: pointer; color: #3B82F6; background-color: #EFF6FF; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#DBEAFE'" onmouseout="this.style.backgroundColor='#EFF6FF'" title="แก้ไข">
                            <i class="ph ph-pencil-simple" style="font-size: 1.1rem;"></i>
                        </button>
                        <button onclick="deleteStudent('${stu.id}')" style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; border: none; cursor: pointer; color: #EF4444; background-color: #FEF2F2; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#FEE2E2'" onmouseout="this.style.backgroundColor='#FEF2F2'" title="ลบ">
                            <i class="ph ph-trash" style="font-size: 1.1rem;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHtml += `</tbody></table></div>`;
    
    // Replace the empty state with the table
    const card = parentTab.querySelector('.card');
    let existingTable = card.querySelector('.table-responsive');
    if (existingTable) {
        existingTable.outerHTML = tableHtml;
    } else {
        studentsContainer.style.display = 'none';
        card.insertAdjacentHTML('beforeend', tableHtml);
    }
}

// ----------------------------------------------------
// ระบบดาวน์โหลด (Export)
// ----------------------------------------------------
function toggleDownloadMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('downloadMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

document.addEventListener('click', function(e) {
    const menu = document.getElementById('downloadMenu');
    if (menu && !e.target.closest('#downloadMenu') && !e.target.closest('button[onclick="toggleDownloadMenu(event)"]')) {
        menu.style.display = 'none';
    }
});

function exportStudents(type) {
    const menu = document.getElementById('downloadMenu');
    if (menu) menu.style.display = 'none';
    
    if (!existingStudents || existingStudents.length === 0) {
        window.showAppAlert('ไม่มีข้อมูลนักเรียนให้ดาวน์โหลด', 'warning');
        return;
    }
    
    // Sort students by roll number
    const sortedStudents = [...existingStudents].sort((a, b) => parseInt(a.roll_number || 999) - parseInt(b.roll_number || 999));
    
    // Prepare data
    const headers = ['เลขที่', 'รหัสประจำตัวนักเรียน', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'เบอร์โทรศัพท์นักเรียน', 'เบอร์โทรศัพท์ผู้ปกครอง'];
    const data = sortedStudents.map(s => [
        s.roll_number || '',
        s.student_id || '',
        s.title || '',
        s.first_name || '',
        s.last_name || '',
        s.phone || '',
        s.parent_phone || ''
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
    
    // Format: รายชื่อนักเรียน_[ชื่อวิชา/ประจำชั้น]_[ชั้น/ห้อง]
    const fileName = `รายชื่อนักเรียน_${classNamePart}_${gradeRoomPart}`.replace(/\s+/g, '_').replace(/\//g, '-');
    
    if (type === 'csv') {
        let csvContent = '\uFEFF' + headers.join(',') + '\n'; // Add BOM for Excel Thai support
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
        
        // Add styling using xlsx-js-style
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({c: C, r: R});
                if (!ws[cellRef]) continue;
                
                ws[cellRef].s = {
                    font: {
                        name: "THSarabunPSK",
                        sz: 16
                    }
                };
                
                // Bold headers
                if (R === 0) {
                    ws[cellRef].s.font.bold = true;
                    ws[cellRef].s.fill = { fgColor: { rgb: "F1F5F9" } };
                }
            }
        }
        
        // Auto width for columns
        ws['!cols'] = [
            {wch: 10}, {wch: 20}, {wch: 15}, {wch: 25}, {wch: 25}, {wch: 20}, {wch: 20}
        ];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "รายชื่อนักเรียน");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
        
    } else if (type === 'pdf') {
        if (typeof html2pdf === 'undefined') {
            window.showAppAlert('ไม่พบไลบรารีสำหรับสร้าง PDF กรุณารีเฟรชหน้าเว็บแล้วลองใหม่');
            return;
        }
        // Create a temporary hidden div with a nice table for PDF generation
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
                    font-size: 16px;
                    background-color: white;
                    color: #000;
                    width: 1120px;
                    padding: 40px;
                    box-sizing: border-box;
                }
                .pdf-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 16px;
                    margin-bottom: 30px;
                }
                .pdf-table th, .pdf-table td {
                    border: 1px solid #000;
                    padding: 8px;
                }
                .pdf-table th {
                    background-color: #f8fafc;
                    color: #000;
                    text-align: center;
                    font-weight: bold;
                    white-space: nowrap;
                }
            </style>
            <div class="pdf-wrapper">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 10px 0;">แบบบัญชีรายชื่อนักเรียน</h1>
                    <p style="font-size: 18px; margin: 0 0 5px 0;">${classNamePart} ชั้น: ${gradeRoomPart}</p>
                </div>
                <table class="pdf-table">
                    <thead>
                        <tr>
        `;
        headers.forEach((h, index) => {
            // Adjust widths to make sure table fits without breaking Thai words
            let w = 'auto';
            let label = h;
            if (index === 0) w = '8%'; // เลขที่
            else if (index === 1) { w = '15%'; label = 'รหัสประจำตัว'; } // รหัส
            else if (index === 2) w = '10%'; // คำนำหน้า
            else if (index === 3) w = '20%'; // ชื่อ
            else if (index === 4) w = '20%'; // นามสกุล
            else if (index === 5) { w = '13.5%'; label = 'เบอร์โทรนักเรียน'; } // โทรนักเรียน
            else if (index === 6) { w = '13.5%'; label = 'เบอร์โทรผู้ปกครอง'; } // โทรผู้ปกครอง
            
            html += `<th style="width: ${w};">${label}</th>`;
        });
        html += `</tr></thead><tbody>`;
        
        data.forEach((row, index) => {
            html += `<tr>`;
            row.forEach((cell, cellIndex) => {
                let align = 'left';
                if (cellIndex === 0 || cellIndex === 1 || cellIndex === 5 || cellIndex === 6) align = 'center';
                html += `<td style="text-align: ${align};">${cell}</td>`;
            });
            html += `</tr>`;
        });
        html += `
                    </tbody>
                </table>
                <div style="display: flex; justify-content: flex-end; margin-top: 40px; page-break-inside: avoid;">
                    <div style="width: 40%; text-align: center;">
                        <p style="margin-bottom: 10px; font-size: 16px;">ลงชื่อ .....................................................................</p>
                        <p style="font-size: 16px; margin: 5px 0;">( ${teacherName.replace('คุณครู', '')} )</p>
                        <p style="font-size: 16px; margin: 5px 0;">ครูผู้สอน / ครูประจำชั้น</p>
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
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        
        setTimeout(() => {
            html2pdf().set(opt).from(targetElement).save().then(() => {
                document.body.removeChild(previewOverlay);
                document.body.style.overflow = originalOverflow;
                document.documentElement.style.overflow = originalHtmlOverflow;
            });
        }, 500);
    } else if (type === 'qr') {
        const JSZipLib = window.JSZip;
        const saveAsFn = window.saveAs || window.saveAs;
        const QRCodeLib = window.QRCode;

        if (!JSZipLib || !saveAsFn || !QRCodeLib) {
            const missing = [];
            if (!JSZipLib) missing.push('JSZip');
            if (!saveAsFn) missing.push('FileSaver');
            if (!QRCodeLib) missing.push('QRCode');
            
            window.showAppAlert('ไม่พบไลบรารี: ' + missing.join(', ') + ' กรุณารีเฟรชหน้าเว็บอีกครั้ง');
            return;
        }

        Swal.fire({
            title: 'กำลังสร้าง QR Code...',
            html: 'โปรดรอสักครู่ ระบบกำลังสร้างไฟล์ ZIP',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        setTimeout(async () => {
            try {
                const zip = new JSZipLib();
                
                for (let i = 0; i < sortedStudents.length; i++) {
                    const student = sortedStudents[i];
                    const nameStr = `${student.first_name} ${student.last_name}`;
                    const numberStr = student.roll_number || 'ไม่มีเลขที่';
                    const fileName = `${student.title || ''}${nameStr}_${numberStr}.png`.replace(/\s+/g, ' ');
                    
                    const code = student.student_id;
                    if (!code) continue;

                    const el = document.createElement('div');
                    new QRCodeLib(el, {
                        text: String(code),
                        width: 300,
                        height: 300,
                        colorDark: '#000000',
                        colorLight: '#ffffff'
                    });

                    // qrcodejs creates a canvas synchronously
                    const canvas = el.querySelector('canvas');
                    if (canvas) {
                        const dataUrl = canvas.toDataURL("image/png");
                        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
                        zip.file(fileName, base64Data, {base64: true});
                    } else {
                        // Fallback if canvas is not found
                        const img = el.querySelector('img');
                        if (img && img.src) {
                            const base64Data = img.src.replace(/^data:image\/png;base64,/, "");
                            zip.file(fileName, base64Data, {base64: true});
                        }
                    }
                }

                const zipBlob = await zip.generateAsync({type: 'blob'});
                saveAsFn(zipBlob, `${fileName}_QRCodes.zip`);

                Swal.fire({
                    icon: 'success',
                    title: 'ดาวน์โหลดสำเร็จ',
                    text: 'ไฟล์รหัส QR ถูกบันทึกลงในเครื่องของคุณแล้ว',
                    timer: 2000,
                    showConfirmButton: false
                });

            } catch (err) {
                console.error(err);
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ QR Code ได้', 'error');
            }
        }, 100);
    }
}
