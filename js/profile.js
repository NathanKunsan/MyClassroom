// js/profile.js

function getThaiInitials(fullName) {
    if (!fullName) return "ครู";
    const words = fullName.trim().split(/\s+/);
    const consonantRegex = /[ก-ฮ]/;
    
    let firstInitial = "";
    let lastInitial = "";

    if (words.length > 0) {
        const match = words[0].match(consonantRegex);
        if (match) firstInitial = match[0];
    }
    
    if (words.length > 1) {
        const match = words[words.length - 1].match(consonantRegex);
        if (match) lastInitial = match[0];
    }

    const initials = firstInitial + lastInitial;
    return initials || "ครู";
}

function injectCropperModal() {
    if (document.getElementById('cropperModal')) return;
    const modalHtml = `
    <div id="cropperModal" class="auth-modal-overlay" style="display: none; opacity: 1;">
        <div class="auth-modal-box" style="max-width: 500px; position: relative;">
            <h3 style="margin-bottom: 1rem;">ปรับขนาดรูปภาพโปรไฟล์</h3>
            <div style="width: 100%; height: 300px; background: #f0f0f0; border-radius: 8px; overflow: hidden;">
                <img id="cropperImage" src="" style="max-width: 100%; display: block;">
            </div>
            <div style="margin-top: 1.5rem; display: flex; gap: 1rem; width: 100%;">
                <button class="btn btn-outline" id="cropperCancelBtn" style="flex: 1;">ยกเลิก</button>
                <button class="btn btn-primary" id="cropperSaveBtn" style="flex: 1;">บันทึกรูปภาพ</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

document.addEventListener('DOMContentLoaded', () => {
    const profileImageInput = document.getElementById('profileImageInput');
    const changeProfileBtn = document.getElementById('changeProfileBtn');
    const userProfileImg = document.getElementById('userProfileImg');
    const userProfileName = document.getElementById('userProfileName');

    // 1. สร้าง Modal และผูก Event ทันที (Synchronous) ป้องกันการกดปุ่มแล้วโหลดไม่ทัน
    injectCropperModal();
    let cropper = null;

    if (changeProfileBtn && profileImageInput) {
        changeProfileBtn.addEventListener('click', (e) => {
            e.preventDefault(); // ป้องกันการเด้งไป #
            profileImageInput.click();
        });
    }

    if (profileImageInput) {
        profileImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (!file.type.startsWith('image/')) {
                    window.showAlertModal('กรุณาเลือกไฟล์รูปภาพเท่านั้นครับ', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    const cropperModal = document.getElementById('cropperModal');
                    const cropperImage = document.getElementById('cropperImage');
                    
                    cropperImage.src = event.target.result;
                    cropperModal.style.display = 'flex';

                    if (cropper) {
                        cropper.destroy();
                    }
                    
                    // Initialize Cropper.js
                    cropper = new Cropper(cropperImage, {
                        aspectRatio: 1, // 1:1 Square
                        viewMode: 1,
                        dragMode: 'move',
                        autoCropArea: 0.8,
                        guides: true, // Grid 9 ช่อง
                        center: true,
                        highlight: false,
                        cropBoxMovable: true,
                        cropBoxResizable: true,
                    });
                };
                reader.readAsDataURL(file);
            }
            profileImageInput.value = ''; // Reset input
        });
    }

    // 2. ดึงข้อมูล User จาก Supabase ทำงานอยู่เบื้องหลัง (Asynchronous)
    async function fetchUserData() {
        try {
            if (typeof supabaseClient !== 'undefined') {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (user && user.user_metadata) {
                    const fullName = user.user_metadata.full_name;
                    const avatarUrl = user.user_metadata.avatar_url;
                    
                    if (fullName && userProfileName) {
                        userProfileName.textContent = `คุณครู ${fullName}`;
                    }
                    
                    // ตรวจสอบว่าเคยอัปโหลดรูปภาพขึ้น Supabase ไว้หรือไม่
                    if (userProfileImg) {
                        if (avatarUrl) {
                            // มีรูปใน Database -> ใช้รูปจากเซิร์ฟเวอร์
                            userProfileImg.src = avatarUrl;
                        } else if (fullName) {
                            // ไม่มีรูป -> สร้างรูปพยัญชนะไทย
                            const initials = getThaiInitials(fullName);
                            userProfileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=fff&color=B48ED6`;
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error loading user profile data", e);
        }
    }
    
    fetchUserData(); // เริ่มทำงานดึงข้อมูล

    // Modal Actions
    const cropperModal = document.getElementById('cropperModal');
    
    document.getElementById('cropperCancelBtn')?.addEventListener('click', () => {
        if (cropperModal) cropperModal.style.display = 'none';
        if (cropper) cropper.destroy();
    });
    
    document.getElementById('cropperCloseBtn')?.addEventListener('click', () => {
        if (cropperModal) cropperModal.style.display = 'none';
        if (cropper) cropper.destroy();
    });

    document.getElementById('cropperSaveBtn')?.addEventListener('click', async () => {
        if (!cropper) return;
        
        const saveBtn = document.getElementById('cropperSaveBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'กำลังอัปโหลด...';
        saveBtn.disabled = true;
        
        try {
            // ตัดรูปเป็นขนาด 300x300
            const canvas = cropper.getCroppedCanvas({
                width: 300,
                height: 300
            });
            
            // แปลง Canvas เป็นไฟล์ Blob เพื่อเตรียมส่งขึ้นเซิร์ฟเวอร์
            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error("ไม่สามารถสร้างไฟล์รูปภาพได้");
                
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) throw new Error("โปรดล็อกอินก่อนอัปโหลดรูปภาพ");
                
                // สร้างชื่อไฟล์ไม่ให้ซ้ำกัน
                const fileName = `public/${user.id}-${Date.now()}.jpg`;
                
                // 1. อัปโหลดขึ้น Supabase Storage (ถัง avatars)
                const { data, error } = await supabaseClient.storage
                    .from('avatars')
                    .upload(fileName, blob, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: 'image/jpeg'
                    });
                    
                if (error) throw error;
                
                // 2. ดึงลิงก์ของรูปที่เพิ่งอัปโหลด (Public URL)
                const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
                const publicUrl = urlData.publicUrl;
                
                // 3. บันทึกลิงก์รูปภาพลงในข้อมูลของผู้ใช้ (user_metadata)
                const { error: updateError } = await supabaseClient.auth.updateUser({
                    data: { avatar_url: publicUrl }
                });
                
                if (updateError) throw updateError;
                
                // 4. อัปเดต UI ให้แสดงรูปใหม่ทันที
                if (userProfileImg) {
                    userProfileImg.src = publicUrl;
                }
                
                // ปิด Modal
                if (cropperModal) cropperModal.style.display = 'none';
                cropper.destroy();
                
                // คืนค่าปุ่ม
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
                
            }, 'image/jpeg', 0.8);
            
        } catch (error) {
            console.error("Upload failed", error);
            window.showAlertModal("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: " + error.message, 'error');
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    });
});
