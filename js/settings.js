function displayMessage(text, type) {
    const existing = document.getElementById('auth-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'auth-modal-overlay';
    overlay.className = 'auth-modal-overlay';

    const box = document.createElement('div');
    box.className = 'auth-modal-box';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'auth-modal-close';
    closeBtn.innerHTML = '<i class="ph ph-x"></i>';
    closeBtn.onclick = () => {
        overlay.remove();
        if (type === 'success') {
            window.location.href = 'dashboard.html';
        }
    };

    const icon = document.createElement('div');
    icon.className = `auth-modal-icon ${type}`;
    if (type === 'success') {
        icon.innerHTML = '<i class="ph ph-check-circle"></i>';
    } else {
        icon.innerHTML = '<i class="ph ph-warning-circle"></i>';
    }

    const message = document.createElement('p');
    message.className = 'auth-modal-text';
    message.textContent = text;

    const okBtn = document.createElement('button');
    okBtn.className = 'auth-modal-ok-btn';
    okBtn.textContent = 'ตกลง';
    okBtn.onclick = () => {
        overlay.remove();
        if (type === 'success') {
            window.location.href = 'dashboard.html';
        }
    };

    box.appendChild(closeBtn);
    box.appendChild(icon);
    box.appendChild(message);
    box.appendChild(okBtn);
    overlay.appendChild(box);

    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Sticky Header Logic
    const stickyNav = document.getElementById('settingsStickyNav');
    const mainHeader = document.getElementById('mainSettingsHeader');
    
    if (stickyNav && mainHeader) {
        window.addEventListener('scroll', () => {
            // Get the bottom position of the main header relative to the viewport
            const headerBottom = mainHeader.getBoundingClientRect().bottom;
            
            // If the main header is scrolled out of view, show the sticky nav
            if (headerBottom < 0) {
                stickyNav.classList.add('show');
            } else {
                stickyNav.classList.remove('show');
            }
        });
        
        // Also bind the save button in the sticky nav to trigger the main save logic
        const stickySaveBtn = document.getElementById('stickySaveSettingsBtn');
        const mainSaveBtn = document.getElementById('saveSettingsBtn');
        if (stickySaveBtn && mainSaveBtn) {
            stickySaveBtn.addEventListener('click', () => {
                mainSaveBtn.click();
            });
        }
    }

    try {
        // Fetch current user from Supabase
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error) {
            console.error("Error fetching user data:", error);
            return;
        }

        if (user) {
            // Get input elements
            const fullNameInput = document.getElementById('settingsFullName');
            const nicknameInput = document.getElementById('settingsNickname');
            const emailInput = document.getElementById('settingsEmail');
            const phoneInput = document.getElementById('settingsPhone');

            // School inputs
            const schoolNameInput = document.getElementById('settingsSchoolName');
            const schoolAreaInput = document.getElementById('settingsSchoolArea');
            const schoolSubdistrictInput = document.getElementById('settingsSchoolSubdistrict');
            const schoolDistrictInput = document.getElementById('settingsSchoolDistrict');
            const schoolProvinceInput = document.getElementById('settingsSchoolProvince');
            
            // Populate fields with user data
            if (fullNameInput) {
                fullNameInput.value = user.user_metadata?.full_name || user.user_metadata?.username || '';
            }
            if (emailInput) {
                emailInput.value = user.email || '';
            }
            if (nicknameInput) {
                nicknameInput.value = user.user_metadata?.nickname || '';
            }
            if (phoneInput) {
                phoneInput.value = user.user_metadata?.phone || '';
                // Initialize intl-tel-input
                window.iti = window.intlTelInput(phoneInput, {
                    initialCountry: "th",
                    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/js/utils.js",
                });
            }
            if (schoolNameInput) schoolNameInput.value = user.user_metadata?.school_name || '';
            if (schoolAreaInput) schoolAreaInput.value = user.user_metadata?.school_area || '';
            if (schoolSubdistrictInput) schoolSubdistrictInput.value = user.user_metadata?.school_subdistrict || '';
            if (schoolDistrictInput) schoolDistrictInput.value = user.user_metadata?.school_district || '';
            if (schoolProvinceInput) schoolProvinceInput.value = user.user_metadata?.school_province || '';

            // --- Autocomplete Logic ---
            let schoolsData = [];
            
            // Load schools data (mock data for now)
            try {
                const response = await fetch('../data/schools.json');
                schoolsData = await response.json();
            } catch (err) {
                console.error("Failed to load schools data:", err);
            }

            const autocompleteResults = document.getElementById('schoolAutocompleteResults');

            if (schoolNameInput && autocompleteResults) {
                function showSchools(query) {
                    autocompleteResults.innerHTML = '';
                    
                    let filtered = schoolsData;
                    if (query) {
                        filtered = schoolsData.filter(school => school.name.toLowerCase().includes(query));
                    }

                    // จำกัดการแสดงผลไม่เกิน 50 รายการ เพื่อไม่ให้เว็บค้าง
                    filtered = filtered.slice(0, 50);

                    if (filtered.length > 0) {
                        filtered.forEach(school => {
                            const item = document.createElement('div');
                            item.className = 'autocomplete-item';
                            item.innerHTML = `
                                <div class="autocomplete-item-title">${school.name}</div>
                                <div class="autocomplete-item-desc">อ.${school.district} จ.${school.province} | ${school.area}</div>
                            `;
                            item.addEventListener('click', () => {
                                // Fill inputs automatically
                                schoolNameInput.value = school.name;
                                if (schoolAreaInput) schoolAreaInput.value = school.area || '';
                                if (schoolSubdistrictInput) schoolSubdistrictInput.value = school.subdistrict || '';
                                if (schoolDistrictInput) schoolDistrictInput.value = school.district || '';
                                if (schoolProvinceInput) schoolProvinceInput.value = school.province || '';
                                
                                autocompleteResults.classList.remove('show');
                            });
                            autocompleteResults.appendChild(item);
                        });
                        autocompleteResults.classList.add('show');
                    } else {
                        autocompleteResults.innerHTML = '<div class="autocomplete-item"><div class="autocomplete-item-title" style="color: #94A3B8; font-weight: 400;">ไม่พบรายชื่อโรงเรียนที่ค้นหา</div></div>';
                        autocompleteResults.classList.add('show');
                    }
                }

                // Show results when clicking/focusing the input
                schoolNameInput.addEventListener('focus', (e) => {
                    const query = e.target.value.trim().toLowerCase();
                    showSchools(query);
                });

                // Show results while typing
                schoolNameInput.addEventListener('input', (e) => {
                    const query = e.target.value.trim().toLowerCase();
                    
                    // Clear other fields if school name is cleared
                    if (query === '') {
                        if (schoolAreaInput) schoolAreaInput.value = '';
                        if (schoolSubdistrictInput) schoolSubdistrictInput.value = '';
                        if (schoolDistrictInput) schoolDistrictInput.value = '';
                        if (schoolProvinceInput) schoolProvinceInput.value = '';
                    }
                    
                    showSchools(query);
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (e.target !== schoolNameInput && !autocompleteResults.contains(e.target)) {
                        autocompleteResults.classList.remove('show');
                    }
                });
            }

            // Save logic
            const saveBtn = document.getElementById('saveSettingsBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', async () => {
                    const fullNameVal = fullNameInput.value.trim();
                    const nicknameVal = nicknameInput.value.trim();
                    const phoneVal = phoneInput.value.trim();
                    
                    const schoolNameVal = schoolNameInput ? schoolNameInput.value.trim() : '';
                    const schoolAreaVal = schoolAreaInput ? schoolAreaInput.value.trim() : '';
                    const schoolSubdistrictVal = schoolSubdistrictInput ? schoolSubdistrictInput.value.trim() : '';
                    const schoolDistrictVal = schoolDistrictInput ? schoolDistrictInput.value.trim() : '';
                    const schoolProvinceVal = schoolProvinceInput ? schoolProvinceInput.value.trim() : '';

                    if (!fullNameVal) {
                        displayMessage("กรุณากรอกชื่อ-นามสกุล", "error");
                        return;
                    }
                    if (!phoneVal) {
                        displayMessage("กรุณากรอกเบอร์โทรศัพท์ (จำเป็น)", "error");
                        return;
                    }

                    // แปลงเบอร์โทรให้อยู่ในรูปแบบ E.164 สำหรับ Supabase (ถ้าเป็นเบอร์ไทย)
                    let formattedPhone = '';
                    if (window.iti) {
                        formattedPhone = window.iti.getNumber();
                    } else {
                        formattedPhone = phoneVal.replace(/[-\s]/g, '');
                        if (formattedPhone.startsWith('0')) {
                            formattedPhone = '+66' + formattedPhone.substring(1);
                        } else if (!formattedPhone.startsWith('+')) {
                            formattedPhone = '+' + formattedPhone; // กรณีผู้ใช้พิมพ์ 668... มาเลยโดยไม่มี +
                        }
                    }

                    const originalText = saveBtn.textContent;
                    saveBtn.textContent = 'กำลังบันทึก...';
                    saveBtn.disabled = true;

                    try {
                        // พยายามอัปเดตช่อง Phone หลักใน Supabase ด้วย
                        let { data, error } = await supabaseClient.auth.updateUser({
                            phone: formattedPhone,
                            data: {
                                full_name: fullNameVal,
                                nickname: nicknameVal,
                                phone: phoneVal,
                                school_name: schoolNameVal,
                                school_area: schoolAreaVal,
                                school_subdistrict: schoolSubdistrictVal,
                                school_district: schoolDistrictVal,
                                school_province: schoolProvinceVal
                            }
                        });

                        // ถ้าเกิด error ใดๆ (มักจะเป็นเรื่อง SMS Provider หรือ Format เบอร์) ให้เซฟแค่ใน metadata ทันที
                        if (error) {
                            console.warn("Top-level update failed, falling back to metadata only. Error:", error.message || error);
                            const fallback = await supabaseClient.auth.updateUser({
                                data: {
                                    full_name: fullNameVal,
                                    nickname: nicknameVal,
                                    phone: phoneVal,
                                    school_name: schoolNameVal,
                                    school_area: schoolAreaVal,
                                    school_subdistrict: schoolSubdistrictVal,
                                    school_district: schoolDistrictVal,
                                    school_province: schoolProvinceVal
                                }
                            });
                            data = fallback.data;
                            error = fallback.error;
                        }

                        if (error) throw error;

                        displayMessage("บันทึกข้อมูลเรียบร้อยแล้ว!", "success");
                        
                        // Update UI name immediately
                        const nameDisplay = document.getElementById('userProfileName');
                        if (nameDisplay) {
                            nameDisplay.textContent = `คุณครู ${fullNameVal}`;
                        }
                    } catch (err) {
                        console.error("Save error:", err);
                        const errorMsg = err.message || "โปรดลองใหม่อีกครั้ง";
                        displayMessage("เกิดข้อผิดพลาดในการบันทึก: " + errorMsg, "error");
                    } finally {
                        saveBtn.textContent = originalText;
                        saveBtn.disabled = false;
                    }
                });
            }
        }
    } catch (err) {
        console.error("Settings load error:", err);
    }
});
