let currentClassId = null;

document.addEventListener('DOMContentLoaded', async () => {
    setupTabs();
    
    // Get class ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('id');
    currentClassId = classId;
    
    if (!classId) {
        window.location.href = 'classes.html';
        return;
    }
    
    try {
        // Fetch current user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            window.location.href = 'login.html';
            return;
        }

        // Fetch classroom data
        const { data: cls, error: clsError } = await supabaseClient
            .from('classrooms')
            .select('*')
            .eq('id', classId)
            .single();
            
        if (clsError || !cls) {
            throw new Error('Classroom not found');
        }
        
        // Verify ownership
        if (cls.teacher_id !== user.id) {
            window.location.href = 'classes.html';
            return;
        }
        
        window.currentClassData = cls;
        updateUIWithClassData(cls);
        
        // Handle tab from URL
        const tabParam = urlParams.get('tab');
        if (tabParam) {
            const targetTabBtn = document.querySelector(`.detail-tab[data-tab="${tabParam}"]`);
            if (targetTabBtn) {
                targetTabBtn.click();
            }
        }
        
    } catch (e) {
        console.error('Error loading class details:', e);
        window.showAppAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลห้องเรียน');
        window.location.href = 'classes.html';
    }
});

function setupTabs() {
    const tabs = document.querySelectorAll('.detail-tab');
    const panes = document.querySelectorAll('.tab-pane');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            
            // Add active to clicked
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

function updateUIWithClassData(cls) {
    // Header Background Color
    const header = document.getElementById('classHeader');
    if (header && cls.color) {
        header.style.backgroundColor = cls.color;
    }
    
    // Titles
    const isHomeroom = cls.type === 'homeroom';
    const classNameSpan = document.getElementById('classNameSpan');
    const classSubtitleSpan = document.getElementById('classSubtitleSpan');
    const teacherNameSpan = document.getElementById('teacherNameSpan');
    
    if (classNameSpan) {
        classNameSpan.textContent = isHomeroom ? `ห้องประจำชั้น ${cls.grade_level}/${cls.room_number}` : cls.subject_name;
    }
    
    if (classSubtitleSpan) {
        classSubtitleSpan.textContent = isHomeroom 
            ? 'ดูแลให้คำปรึกษาและแจ้งข่าวสารแก่นักเรียน' 
            : `${cls.grade_level}/${cls.room_number} ${cls.subject_code ? '• ' + cls.subject_code : ''}`;
    }
    
    if (teacherNameSpan) {
        supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user && user.user_metadata && user.user_metadata.full_name) {
                teacherNameSpan.textContent = `คุณครู${user.user_metadata.full_name}`;
            } else {
                teacherNameSpan.textContent = 'คุณครู (ไม่ระบุชื่อ)';
            }
        }).catch(() => {
            teacherNameSpan.textContent = 'คุณครู (เจ้าของห้อง)';
        });
    }
}

// Global SweetAlert function
window.showAppAlert = function(msg, type = 'error') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            text: msg,
            icon: type === 'error' ? 'error' : (type === 'success' ? 'success' : 'info'),
            confirmButtonColor: '#3B82F6',
            confirmButtonText: 'ตกลง',
            customClass: {
                popup: 'rounded-xl border-none shadow-lg',
                confirmButton: 'rounded-lg px-6 py-2 border-none shadow-sm'
            }
        });
    } else if (window.showAlertModal) {
        window.showAlertModal(msg, type);
    } else {
        alert(msg);
    }
};
