const COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#14B8A6', '#06B6D4', 
    '#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#F43F5E', '#64748B'
];

let currentUser = null;
let classrooms = [];
let hasHomeroom = false;
let editingClassId = null;

document.addEventListener('DOMContentLoaded', async () => {
    initColorPicker();
    setupModalListeners();

    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error || !user) return;
        currentUser = user;

        await loadClassrooms();

    } catch (e) {
        console.error('Error in classes init:', e);
        showErrorState();
    }
});

async function loadClassrooms() {
    try {
        const { data, error } = await supabaseClient
            .from('classrooms')
            .select('*')
            .eq('teacher_id', currentUser.id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        classrooms = data || [];
        renderClassrooms();
    } catch (e) {
        console.error('Failed to load classrooms:', e);
        showErrorState();
    }
}

function renderClassrooms() {
    const unifiedClassesGrid = document.getElementById('unifiedClassesGrid');
    
    // Stats elements
    const statAllClasses = document.getElementById('statAllClasses');
    const statTotalStudents = document.getElementById('statTotalStudents');
    const statPendingHomework = document.getElementById('statPendingHomework');

    // Separate homeroom and subjects
    const homeroom = classrooms.find(c => c.type === 'homeroom');
    const subjects = classrooms.filter(c => c.type === 'subject');
    
    hasHomeroom = !!homeroom;

    // Update stats
    if(statAllClasses) statAllClasses.textContent = classrooms.length;
    if(statTotalStudents) statTotalStudents.textContent = '0'; // Placeholder for total students
    if(statPendingHomework) statPendingHomework.textContent = '0'; // Placeholder for pending homework

    if (classrooms.length === 0) {
        unifiedClassesGrid.innerHTML = `
            <div class="unified-empty-state">
                <i class="ph ph-books" style="font-size: 3rem; color: #CBD5E1; margin-bottom: 1rem;"></i>
                <h3>ยังไม่มีห้องเรียนในระบบ</h3>
                <p>คุณครูสามารถเพิ่มห้องเรียนและห้องประจำชั้นได้โดยคลิกที่ปุ่มเพิ่มห้องเรียน</p>
            </div>
        `;
        return;
    }

    // Render all classrooms (Homeroom first, then subjects)
    let html = '';
    if (homeroom) {
        html += createClassCardHTML(homeroom);
    }
    
    if (subjects.length > 0) {
        html += subjects.map(createClassCardHTML).join('');
    }
    
    unifiedClassesGrid.innerHTML = html;
}

function createClassCardHTML(cls) {
    const isHomeroom = cls.type === 'homeroom';
    const title = isHomeroom ? `ห้องประจำชั้น ${cls.grade_level}/${cls.room_number}` : cls.subject_name;
    const subtitle = isHomeroom ? 'ที่ปรึกษา' : `${cls.grade_level}/${cls.room_number} ${cls.subject_code ? '• '+cls.subject_code : ''}`;
    const cardClass = isHomeroom ? 'class-card homeroom-card' : 'class-card';
    const icon = isHomeroom ? 'ph-crown' : 'ph-chalkboard-teacher';
    const targetPage = isHomeroom ? 'homeroom_detail.html' : 'subject_detail.html';
    
    return `
        <div class="${cardClass}" onclick="window.location.href='${targetPage}?id=${cls.id}'">
            <div class="class-card-actions" onclick="event.stopPropagation()">
                <button class="action-icon-btn action-edit" title="แก้ไขห้องเรียน" onclick="editClass('${cls.id}')">
                    <i class="ph ph-note-pencil"></i>
                </button>
                <button class="action-icon-btn action-delete" title="ลบห้องเรียน" onclick="deleteClass('${cls.id}')">
                    <i class="ph ph-trash"></i>
                </button>
            </div>
            <div class="class-card-header" style="background-color: ${cls.color};">
                <h3 class="class-card-title">${title}</h3>
                <div class="class-card-subtitle">${subtitle}</div>
            </div>
            <div class="class-card-body">
                <div class="class-card-stat">
                    <i class="ph ph-users"></i> นักเรียน 0 คน
                </div>
                <div class="class-card-stat" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span><i class="ph ph-calendar-check"></i> เช็กชื่อล่าสุด: ยังไม่มี</span>
                    <button onclick="event.stopPropagation(); window.location.href='${targetPage}?id=${cls.id}&tab=attendance-tab'" style="background: var(--primary); color: white; border: none; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                        ไปเช็กชื่อ <i class="ph ph-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function showErrorState() {
    document.getElementById('homeroomContainer').innerHTML = '<p style="color: #EF4444;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    document.getElementById('subjectClassesGrid').innerHTML = '<p style="color: #EF4444; grid-column: 1/-1;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
}

// === Modal & Form Logic ===
function openClassroomModal(defaultType = 'subject') {
    editingClassId = null; // Reset editing state
    const modal = document.getElementById('classroomModal');
    const form = document.getElementById('createClassroomForm');
    
    // Reset title and button
    const title = modal.querySelector('.modal-header h2');
    if(title) title.textContent = 'เพิ่มห้องเรียนใหม่';
    const saveBtn = document.getElementById('saveClassBtn');
    if(saveBtn) saveBtn.textContent = 'สร้างห้องเรียน';

    form.reset();
    
    const hrRadio = document.getElementById('homeroomRadio');
    const hrWarning = document.getElementById('homeroomWarning');
    const subjectRadio = document.querySelector('input[value="subject"]');
    
    if (hasHomeroom) {
        hrRadio.disabled = true;
        hrWarning.style.display = 'block';
        subjectRadio.checked = true;
        toggleSubjectNameInput('subject');
    } else {
        hrRadio.disabled = false;
        hrWarning.style.display = 'none';
        if(defaultType === 'homeroom') {
            hrRadio.checked = true;
        } else {
            subjectRadio.checked = true;
        }
        toggleSubjectNameInput(defaultType);
    }
    
    // Select default color (random)
    selectColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    
    modal.style.display = 'flex';
}

function closeClassroomModal() {
    document.getElementById('classroomModal').style.display = 'none';
}

function setupModalListeners() {
    const typeRadios = document.querySelectorAll('input[name="classType"]');
    typeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            toggleSubjectNameInput(e.target.value);
        });
    });

    const form = document.getElementById('createClassroomForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveClassBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> กำลังสร้าง...';

        try {
            const type = document.querySelector('input[name="classType"]:checked').value;
            const subject_name = document.getElementById('classSubjectName').value;
            const grade_level = document.getElementById('classGradeLevel').value;
            const room_number = document.getElementById('classRoomNumber').value;
            const subject_code = document.getElementById('classSubjectCode').value;
            const color = document.getElementById('classColor').value;

            const classData = {
                type,
                subject_name: type === 'homeroom' ? null : subject_name,
                grade_level,
                room_number,
                subject_code: subject_code || null,
                color
            };

            if (editingClassId) {
                // UPDATE
                const { error } = await supabaseClient
                    .from('classrooms')
                    .update(classData)
                    .eq('id', editingClassId);
                if (error) throw error;
            } else {
                // INSERT
                classData.teacher_id = currentUser.id;
                const { error } = await supabaseClient.from('classrooms').insert([classData]);
                if (error) throw error;
            }

            closeClassroomModal();
            await loadClassrooms(); // refresh
        } catch (err) {
            console.error('Error saving class:', err);
            window.showAlertModal('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = editingClassId ? 'บันทึกการแก้ไข' : 'สร้างห้องเรียน';
        }
    });
}

function toggleSubjectNameInput(type) {
    const subjectNameGroup = document.getElementById('subjectNameGroup');
    const subjectNameInput = document.getElementById('classSubjectName');
    const subjectCodeGroup = document.getElementById('subjectCodeGroup');
    
    if (type === 'homeroom') {
        subjectNameGroup.style.display = 'none';
        subjectCodeGroup.style.display = 'none';
        subjectNameInput.removeAttribute('required');
    } else {
        subjectNameGroup.style.display = 'block';
        subjectCodeGroup.style.display = 'block';
        subjectNameInput.setAttribute('required', 'true');
    }
}

function initColorPicker() {
    const container = document.getElementById('colorPickerContainer');
    COLORS.forEach(color => {
        const circle = document.createElement('div');
        circle.className = 'color-circle';
        circle.style.backgroundColor = color;
        circle.dataset.color = color;
        circle.onclick = () => selectColor(color);
        container.appendChild(circle);
    });
}

function selectColor(hex) {
    document.getElementById('classColor').value = hex;
    document.querySelectorAll('.color-circle').forEach(c => {
        if (c.dataset.color === hex) c.classList.add('selected');
        else c.classList.remove('selected');
    });
}

window.openClassroomModal = openClassroomModal;
window.closeClassroomModal = closeClassroomModal;

window.editClass = function(id) {
    const cls = classrooms.find(c => c.id === id);
    if (!cls) return;

    editingClassId = id;
    const modal = document.getElementById('classroomModal');
    const form = document.getElementById('createClassroomForm');
    
    // Change Title & Button text
    const title = modal.querySelector('.modal-header h2');
    if(title) title.textContent = 'แก้ไขห้องเรียน';
    const saveBtn = document.getElementById('saveClassBtn');
    if(saveBtn) saveBtn.textContent = 'บันทึกการแก้ไข';
    
    const hrRadio = document.getElementById('homeroomRadio');
    const hrWarning = document.getElementById('homeroomWarning');
    const subjectRadio = document.querySelector('input[value="subject"]');
    
    if (cls.type === 'homeroom') {
        hrRadio.disabled = false;
        hrRadio.checked = true;
        hrWarning.style.display = 'none';
        toggleSubjectNameInput('homeroom');
    } else {
        subjectRadio.checked = true;
        if (hasHomeroom) {
            hrRadio.disabled = true;
            hrWarning.style.display = 'block';
        } else {
            hrRadio.disabled = false;
            hrWarning.style.display = 'none';
        }
        toggleSubjectNameInput('subject');
    }
    
    // Fill data
    document.getElementById('classSubjectName').value = cls.subject_name || '';
    document.getElementById('classGradeLevel').value = cls.grade_level || 'ม.1';
    document.getElementById('classRoomNumber').value = cls.room_number || '1';
    document.getElementById('classSubjectCode').value = cls.subject_code || '';
    
    selectColor(cls.color || COLORS[0]);
    
    modal.style.display = 'flex';
};

window.deleteClass = async function(id) {
    window.showConfirmModal(
        'คุณต้องการลบห้องเรียนนี้ใช่หรือไม่?<br><small style="color: #64748B;">ข้อมูลทั้งหมดในห้องเรียนนี้จะถูกลบและไม่สามารถกู้คืนได้</small>',
        async () => {
            try {
                const { error } = await supabaseClient.from('classrooms').delete().eq('id', id);
                if (error) throw error;
                
                // Refresh UI
                await loadClassrooms();
            } catch (e) {
                console.error('Error deleting class:', e);
                window.showAlertModal('เกิดข้อผิดพลาดในการลบห้องเรียน', 'error');
            }
        }
    );
};
