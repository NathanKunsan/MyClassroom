// js/guard.js
// หน้าที่: ตรวจสอบสถานะล็อกอินและบังคับเด้งหน้า (Redirect Guard)

document.addEventListener('DOMContentLoaded', async () => {
    // เช็คว่าอยู่หน้าไหน (สกัดเอาแค่ชื่อไฟล์ออกมาเพื่อป้องกันบัคชื่อไฟล์ซ้ำกัน)
    const path = window.location.pathname;
    const filename = path.split('/').pop().split('\\\\').pop(); // รองรับทั้ง Mac/Linux (/) และ Windows (\\)
    
    const isDashboard = filename === 'dashboard.html';
    const isIndexLogin = filename === 'index_login.html';
    const isPublicAuthPage = filename === 'login.html' || filename === 'register.html' || filename === 'forgot-password.html';
    const isUpdatePassword = filename === 'update-password.html';
    const isIndex = filename === '' || filename === 'index.html';

    // ดึงข้อมูล Session ปัจจุบัน
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        // === กรณี: ล็อกอินแล้ว ===
        
        // ถ้าอยู่หน้าแรก (index) ให้เด้งไป index_login
        if (isIndex) {
            window.location.replace('html/index_login.html');
            return;
        } 
        // ถ้าอยู่หน้า auth (login/register) ให้เด้งไป index_login
        else if (isPublicAuthPage) {
            window.location.replace('index_login.html');
            return;
        }

        // ถ้าอยู่หน้าแดชบอร์ด หรือ index_login ให้ดึงชื่อมาแสดง
        if (isDashboard || isIndexLogin) {
            const profileNameElement = document.getElementById('userProfileName');
            if (profileNameElement && session.user.user_metadata && session.user.user_metadata.full_name) {
                profileNameElement.textContent = `คุณครู ${session.user.user_metadata.full_name}`;
            }
        }
    } else {
        // === กรณี: ยังไม่ล็อกอิน ===
        
        // ถ้าพยายามเข้าหน้า private (dashboard, index_login, update-password) ให้เด้งกลับหน้าแรก
        if (isDashboard || isIndexLogin || isUpdatePassword) {
            window.location.replace(isUpdatePassword ? 'login.html' : '../index.html');
            return;
        }
    }
});
