const AVAILABLE_TOOLS = {
    'attendance': { id: 'attendance', name: 'เช็กชื่อด่วน', icon: 'ph-check-square', url: '#' },
    'random': { id: 'random', name: 'สุ่มเรียกชื่อ', icon: 'ph-user-focus', url: '#' },
    'group': { id: 'group', name: 'จัดกลุ่มนักเรียน', icon: 'ph-users', url: '#' },
    'timer': { id: 'timer', name: 'จับเวลา', icon: 'ph-timer', url: '#' },
    'score': { id: 'score', name: 'ให้คะแนนพฤติกรรม', icon: 'ph-star', url: '#' },
    'note': { id: 'note', name: 'สมุดจดบันทึก', icon: 'ph-notebook', url: '#' }
};

document.addEventListener('DOMContentLoaded', async () => {
    // === Quick Menu State & Fallback ===
    let userQuickMenus = [null, null, null, null]; // Default to 4 empty slots
    let activeSlotIndex = null;
    let currentUser = null;

    const quickMenuGrid = document.getElementById('quickMenuGrid');
    const quickMenuModal = document.getElementById('quickMenuModal');
    const closeQuickMenuModal = document.getElementById('closeQuickMenuModal');
    const availableToolsGrid = document.getElementById('availableToolsGrid');

    // Attempt to get user from Supabase
    try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        currentUser = (!userError && user) ? user : null;

        if (currentUser) {
            // Update greeting name
            if (currentUser.user_metadata?.full_name) {
                const dashName = document.getElementById('dashTeacherName');
                if (dashName) dashName.textContent = `คุณครู${currentUser.user_metadata.full_name}`;
            }

            // Load from Supabase user_metadata if available, else default to some pre-filled
            userQuickMenus = currentUser.user_metadata?.quick_menus || ['attendance', 'random', 'group', 'timer'];
        } else {
            // Fallback for preview mode (if not logged in)
            const saved = localStorage.getItem('localQuickMenus');
            if (saved) {
                userQuickMenus = JSON.parse(saved);
            } else {
                userQuickMenus = [null, null, null, null]; // Start empty to show the '+' boxes as user requested
            }
        }
    } catch (e) {
        console.warn('Supabase auth check failed. Using local state.');
        const saved = localStorage.getItem('localQuickMenus');
        if (saved) userQuickMenus = JSON.parse(saved);
    }

    // === Quick Menu Functions ===
    function renderQuickMenus() {
        if (!quickMenuGrid) return;
        quickMenuGrid.innerHTML = '';
        
        for (let i = 0; i < 4; i++) {
            const toolId = userQuickMenus[i];
            if (toolId && AVAILABLE_TOOLS[toolId]) {
                const tool = AVAILABLE_TOOLS[toolId];
                const el = document.createElement('a');
                el.href = tool.url;
                el.className = 'quick-action-btn';
                el.innerHTML = `
                    <i class="ph ${tool.icon}"></i>
                    ${tool.name}
                    <button class="quick-menu-remove" data-index="${i}" onclick="event.preventDefault(); window.removeQuickMenu(${i})">
                        <i class="ph ph-x" style="font-size: 1rem; color: white;"></i>
                    </button>
                `;
                quickMenuGrid.appendChild(el);
            } else {
                const el = document.createElement('button');
                el.className = 'quick-action-btn empty';
                el.innerHTML = `
                    <i class="ph ph-plus"></i>
                    เพิ่มเมนู
                `;
                el.onclick = () => openModal(i);
                quickMenuGrid.appendChild(el);
            }
        }
    }

    function renderAvailableTools() {
        if (!availableToolsGrid) return;
        availableToolsGrid.innerHTML = '';
        
        Object.values(AVAILABLE_TOOLS).forEach(tool => {
            if (userQuickMenus.includes(tool.id)) return;
            
            const btn = document.createElement('button');
            btn.className = 'tool-option-btn';
            btn.innerHTML = `<i class="ph ${tool.icon}"></i> <span>${tool.name}</span>`;
            btn.onclick = () => selectTool(tool.id);
            availableToolsGrid.appendChild(btn);
        });
    }

    function openModal(index) {
        activeSlotIndex = index;
        renderAvailableTools();
        quickMenuModal.style.display = 'flex';
    }

    function closeModal() {
        quickMenuModal.style.display = 'none';
        activeSlotIndex = null;
    }

    async function selectTool(toolId) {
        if (activeSlotIndex !== null) {
            userQuickMenus[activeSlotIndex] = toolId;
            renderQuickMenus();
            closeModal();
            await saveQuickMenus();
        }
    }

    window.removeQuickMenu = async function(index) {
        userQuickMenus[index] = null;
        renderQuickMenus();
        await saveQuickMenus();
    };

    async function saveQuickMenus() {
        if (currentUser) {
            try {
                await supabase.auth.updateUser({
                    data: { quick_menus: userQuickMenus }
                });
            } catch (e) {
                console.error('Error saving quick menus:', e);
            }
        } else {
            localStorage.setItem('localQuickMenus', JSON.stringify(userQuickMenus));
        }
    }

    if (closeQuickMenuModal) closeQuickMenuModal.onclick = closeModal;
    if (quickMenuModal) {
        quickMenuModal.onclick = (e) => {
            if (e.target === quickMenuModal) closeModal();
        };
    }

    // Initialize UI
    renderQuickMenus();

    // === Dashboard Stats Logic (Supabase Dependent) ===
    if (!currentUser) return; // Stop here if no user, don't try to fetch db stats

    const statTotalClasses = document.getElementById('statTotalClasses');
    const statTotalStudents = document.getElementById('statTotalStudents');
    const statPendingHomework = document.getElementById('statPendingHomework');

    try {
        const { count, error } = await supabaseClient.from('classrooms').select('*', { count: 'exact', head: true }).eq('teacher_id', currentUser.id);
        if (error) console.error(error);
        if (statTotalClasses) statTotalClasses.textContent = count || 0;
    } catch (e) {
        if (statTotalClasses) statTotalClasses.textContent = '0';
    }

    try {
        const { count, error } = await supabaseClient.from('students').select('*', { count: 'exact', head: true }).eq('teacher_id', currentUser.id);
        if (error) console.error(error);
        if (statTotalStudents) statTotalStudents.textContent = count || 0;
    } catch (e) {
        if (statTotalStudents) statTotalStudents.textContent = '0';
    }

    try {
        // Assume 'homework_submissions' table might not exist yet, catch error
        const { count, error } = await supabaseClient.from('homework_submissions').select('*', { count: 'exact', head: true }).eq('teacher_id', currentUser.id).eq('status', 'pending');
        if (statPendingHomework) statPendingHomework.textContent = count || 0;
    } catch (e) {
        if (statPendingHomework) statPendingHomework.textContent = '0';
    }
});
