document.addEventListener('DOMContentLoaded', () => {
    // Password Visibility Toggle Logic
    const toggleButtons = document.querySelectorAll('.password-toggle');

    toggleButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent form submission if it's inside a form
            
            // Find the input relative to this button
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                // Change icon to Eye (open)
                icon.classList.remove('ph-eye-slash');
                icon.classList.add('ph-eye');
            } else {
                input.type = 'password';
                // Change icon to Eye Slash (closed)
                icon.classList.remove('ph-eye');
                icon.classList.add('ph-eye-slash');
            }
        });
    });

    // Password Strength Meter Logic
    const passwordInput = document.getElementById('password');
    const strengthBar = document.querySelector('.strength-bar');

    if (passwordInput && strengthBar) {
        passwordInput.addEventListener('input', function() {
            const val = passwordInput.value;
            let conditionsMet = 0;
            
            // Check conditions
            if (val.match(/[a-z]/)) conditionsMet++;
            if (val.match(/[A-Z]/)) conditionsMet++;
            if (val.match(/[0-9]/)) conditionsMet++;
            
            const isLongEnough = val.length >= 8;

            // Reset class
            strengthBar.className = 'strength-bar';
            
            if (val.length === 0) {
                // Empty, no color
            } else if (!isLongEnough || conditionsMet < 2) {
                // Weak (Red): Too short, or doesn't have enough character types
                strengthBar.classList.add('strength-weak');
            } else if (isLongEnough && conditionsMet >= 2 && conditionsMet < 3) {
                // Medium (Orange): Long enough, but missing 1 requirement type
                strengthBar.classList.add('strength-medium');
            } else if (isLongEnough && conditionsMet === 3) {
                // Strong (Green): Meets all requirements
                strengthBar.classList.add('strength-strong');
            }
        });
    }

    // Supabase Auth Logic (Registration)
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            const name = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const registerMsg = document.getElementById('registerMsg');

            // ตรวจสอบความแข็งแกร่งรหัสผ่านเบื้องต้น
            let conditionsMet = 0;
            if (password.match(/[a-z]/)) conditionsMet++;
            if (password.match(/[A-Z]/)) conditionsMet++;
            if (password.match(/[0-9]/)) conditionsMet++;
            if (password.length < 8 || conditionsMet < 3) {
                displayAuthMessage(registerMsg, 'รหัสผ่านยังไม่แข็งแกร่งพอ กรุณาทำตามเงื่อนไขให้ครบครับ', 'error');
                return;
            }

            submitBtn.textContent = 'กำลังสมัครสมาชิก...';
            submitBtn.disabled = true;

            try {
                // สมัครสมาชิกผ่าน Supabase
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: name
                        }
                    }
                });

                if (error) throw error;

                // สมัครสำเร็จ พาเข้าหน้า Index Login
                window.location.href = 'index_login.html';
            } catch (error) {
                displayAuthMessage(registerMsg, 'เกิดข้อผิดพลาด: ' + error.message, 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Helper message function -> Upgraded to Big Modal
    function displayAuthMessage(element, text, type) {
        // Remove existing modal if any
        const existing = document.getElementById('auth-modal-overlay');
        if (existing) existing.remove();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'auth-modal-overlay';
        overlay.className = 'auth-modal-overlay';

        // Create box
        const box = document.createElement('div');
        box.className = 'auth-modal-box';

        // Create close button (the white circle)
        const closeBtn = document.createElement('button');
        closeBtn.className = 'auth-modal-close';
        closeBtn.innerHTML = '<i class="ph ph-x"></i>';
        closeBtn.onclick = () => overlay.remove();

        // Create icon
        const icon = document.createElement('div');
        icon.className = `auth-modal-icon ${type}`;
        icon.innerHTML = type === 'error' ? '<i class="ph ph-warning-circle"></i>' : '<i class="ph ph-check-circle"></i>';

        // Create text
        const message = document.createElement('div');
        message.className = 'auth-modal-text';
        message.innerHTML = text;

        // Assemble
        box.appendChild(closeBtn);
        box.appendChild(icon);
        box.appendChild(message);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    // --- FORGOT PASSWORD LOGIC ---
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotPassMsg = document.getElementById('forgotPassMsg');
    const forgotPassSubmitBtn = document.getElementById('forgotPassSubmitBtn');

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            
            if (!email) {
                displayAuthMessage(forgotPassMsg, 'กรุณากรอกอีเมล', 'error');
                return;
            }

            forgotPassSubmitBtn.disabled = true;
            forgotPassSubmitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> กำลังส่ง...';

            try {
                // Determine redirect URL dynamically based on current origin
                const redirectUrl = window.location.origin + window.location.pathname.replace('forgot-password.html', 'update-password.html');
                
                const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: redirectUrl
                });

                if (error) throw error;

                // Success
                displayAuthMessage(forgotPassMsg, 'ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลของคุณแล้ว (กรุณาเช็คในกล่องจดหมายขยะ/Spam ด้วย)', 'success');
                forgotPasswordForm.reset();
            } catch (error) {
                console.error("Forgot Password Error:", error);
                displayAuthMessage(forgotPassMsg, error.message || 'เกิดข้อผิดพลาดในการส่งอีเมล', 'error');
            } finally {
                forgotPassSubmitBtn.disabled = false;
                forgotPassSubmitBtn.textContent = 'ยืนยัน Email';
            }
        });
    }

    // --- UPDATE PASSWORD LOGIC ---
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    const updatePassMsg = document.getElementById('updatePassMsg');
    const updatePassSubmitBtn = document.getElementById('updatePassSubmitBtn');

    if (updatePasswordForm) {
        // ดึงอีเมลของคนที่ล็อกอินอยู่ (จากลิงก์) มาใส่ช่องซ่อน เพื่อให้ Chrome จำรหัสผ่านได้
        supabaseClient.auth.getUser().then(({data: { user }}) => {
            if (user && user.email) {
                const hiddenEmail = document.getElementById('hiddenEmail');
                if (hiddenEmail) hiddenEmail.value = user.email;
            }
        });

        updatePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('password').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            // ตรวจสอบความแข็งแกร่งรหัสผ่าน
            let conditionsMet = 0;
            if (newPassword.match(/[a-z]/)) conditionsMet++;
            if (newPassword.match(/[A-Z]/)) conditionsMet++;
            if (newPassword.match(/[0-9]/)) conditionsMet++;
            
            if (newPassword.length < 8 || conditionsMet < 3) {
                displayAuthMessage(updatePassMsg, 'รหัสผ่านยังไม่แข็งแกร่งพอ กรุณาทำตามเงื่อนไขให้ครบครับ', 'error');
                return;
            }
            if (newPassword !== confirmNewPassword) {
                displayAuthMessage(updatePassMsg, 'รหัสผ่านไม่ตรงกัน', 'error');
                return;
            }

            updatePassSubmitBtn.disabled = true;
            updatePassSubmitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> กำลังบันทึก...';

            try {
                const { data, error } = await supabaseClient.auth.updateUser({
                    password: newPassword
                });

                if (error) throw error;

                displayAuthMessage(updatePassMsg, 'เปลี่ยนรหัสผ่านสำเร็จ! ระบบกำลังพาไปหน้าแรก...', 'success');
                
                setTimeout(() => {
                    window.location.replace('dashboard.html');
                }, 2000);
            } catch (error) {
                console.error("Update Password Error:", error);
                displayAuthMessage(updatePassMsg, error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', 'error');
                updatePassSubmitBtn.disabled = false;
                updatePassSubmitBtn.textContent = 'บันทึกรหัสผ่านใหม่';
            }
        });
    }

    // Supabase Auth Logic (Login)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const loginMsg = document.getElementById('loginMsg');

            submitBtn.textContent = 'กำลังเข้าสู่ระบบ...';
            submitBtn.disabled = true;

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // ล็อกอินสำเร็จ พาไปหน้า Index Login
                window.location.href = 'index_login.html'; 
            } catch (error) {
                displayAuthMessage(loginMsg, 'อีเมลหรือรหัสผ่านไม่ถูกต้องครับ', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Supabase Auth Logic (Logout)
    const logoutBtns = document.querySelectorAll('.logout-action-btn');
    if (logoutBtns.length > 0) {
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                await supabaseClient.auth.signOut();
                window.location.href = '../index.html';
            });
        });
    }

    // User Profile Dropdown Logic
    const userDropdownBtn = document.getElementById('userDropdownBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');

    if (userDropdownBtn && userDropdownMenu) {
        userDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!userDropdownBtn.contains(e.target) && !userDropdownMenu.contains(e.target)) {
                userDropdownMenu.classList.remove('show');
            }
        });
    }
});
