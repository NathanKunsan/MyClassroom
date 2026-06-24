// Inject Page Loader HTML
(function() {
    // Only inject if it doesn't already exist
    if (!document.getElementById('page-loader')) {
        document.write(`
            <div id="page-loader" style="align-items: flex-start; background-color: var(--bg-color, #FFF9EB);">
                <div style="width: 100%; max-width: 1200px; margin: 0 auto; padding: 2rem; display: flex; flex-direction: column; gap: 2rem; margin-top: 2rem;">
                    <!-- Skeleton Nav -->
                    <div class="skeleton" style="width: 100%; height: 70px; border-radius: 16px;"></div>
                    <!-- Skeleton Hero/Content -->
                    <div class="skeleton" style="width: 60%; height: 40px; border-radius: 8px; margin: 1rem auto;"></div>
                    <div class="skeleton" style="width: 40%; height: 20px; border-radius: 8px; margin: 0 auto 2rem;"></div>
                    <!-- Skeleton Cards -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
                        <div class="skeleton" style="width: 100%; height: 200px; border-radius: 16px;"></div>
                        <div class="skeleton" style="width: 100%; height: 200px; border-radius: 16px;"></div>
                        <div class="skeleton" style="width: 100%; height: 200px; border-radius: 16px;"></div>
                        <div class="skeleton" style="width: 100%; height: 200px; border-radius: 16px;"></div>
                    </div>
                </div>
            </div>
        `);
    }

    // Hide loader when page is fully loaded
    window.addEventListener('load', () => {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.classList.add('hidden');
            // Remove from DOM after fade out transition
            setTimeout(() => {
                loader.remove();
            }, 500);
        }
    });
})();

// Global function for Confirm Modal (using the auth modal design)
window.showConfirmModal = function(messageText, confirmCallback) {
    const existing = document.getElementById('auth-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'auth-modal-overlay';
    overlay.className = 'auth-modal-overlay';

    const box = document.createElement('div');
    box.className = 'auth-modal-box';
    box.style.textAlign = 'center';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'auth-modal-close';
    closeBtn.innerHTML = '<i class="ph ph-x"></i>';
    closeBtn.onclick = () => overlay.remove();

    const icon = document.createElement('div');
    icon.className = 'auth-modal-icon error'; // using error style (red/pink) for warnings
    icon.innerHTML = '<i class="ph ph-warning-circle"></i>';

    const message = document.createElement('div');
    message.className = 'auth-modal-text';
    message.innerHTML = messageText;

    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '1rem';
    btnContainer.style.justifyContent = 'center';
    btnContainer.style.marginTop = '1.5rem';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-outline';
    cancelBtn.textContent = 'ยกเลิก';
    cancelBtn.style.flex = '1';
    cancelBtn.onclick = () => overlay.remove();

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.style.backgroundColor = '#EF4444'; // Red color for delete confirmation
    confirmBtn.style.color = 'white';
    confirmBtn.textContent = 'ตกลง';
    confirmBtn.style.flex = '1';
    confirmBtn.onclick = () => {
        overlay.remove();
        if (confirmCallback) confirmCallback();
    };

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(confirmBtn);

    box.appendChild(closeBtn);
    box.appendChild(icon);
    box.appendChild(message);
    box.appendChild(btnContainer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
};

// Global function for Alert Modal
window.showAlertModal = function(messageText, type = 'error') {
    const existing = document.getElementById('auth-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'auth-modal-overlay';
    overlay.className = 'auth-modal-overlay';

    const box = document.createElement('div');
    box.className = 'auth-modal-box';
    box.style.textAlign = 'center';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'auth-modal-close';
    closeBtn.innerHTML = '<i class="ph ph-x"></i>';
    closeBtn.onclick = () => overlay.remove();

    const icon = document.createElement('div');
    icon.className = `auth-modal-icon ${type}`; 
    icon.innerHTML = type === 'error' ? '<i class="ph ph-warning-circle"></i>' : '<i class="ph ph-check-circle"></i>';

    const message = document.createElement('div');
    message.className = 'auth-modal-text';
    message.innerHTML = messageText;

    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.justifyContent = 'center';
    btnContainer.style.marginTop = '1.5rem';

    const okBtn = document.createElement('button');
    okBtn.className = 'btn btn-primary';
    if (type === 'error') {
        okBtn.style.backgroundColor = '#B48ED6'; // default purple
    }
    okBtn.style.color = 'white';
    okBtn.textContent = 'ตกลง';
    okBtn.style.minWidth = '120px';
    okBtn.onclick = () => overlay.remove();

    btnContainer.appendChild(okBtn);

    box.appendChild(closeBtn);
    box.appendChild(icon);
    box.appendChild(message);
    box.appendChild(btnContainer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
};

// Global function to toggle hamburger sidebar
window.toggleSidebar = function() {
    const sidebar = document.getElementById('dashboardSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('show');
        overlay.classList.toggle('show');
    } else {
        console.warn('Sidebar or Overlay element not found.');
    }
};
