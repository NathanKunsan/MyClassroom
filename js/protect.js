// protect.js
// สคริปต์พื้นฐานสำหรับป้องกันการกด F12, คลิกขวา และคีย์ลัดสำหรับเปิดโหมดนักพัฒนา

// 1. บล็อกการคลิกขวา (Context Menu)
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// 2. บล็อกคีย์ลัดบนคีย์บอร์ด
document.addEventListener('keydown', function(e) {
    // ป้องกัน F12
    if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
    }
    
    // ป้องกัน Ctrl+Shift+I (เปิด Inspect Element)
    if ((e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.shiftKey && e.keyCode === 73) || (e.ctrlKey && e.shiftKey && e.key === 'i')) {
        e.preventDefault();
        return false;
    }

    // ป้องกัน Ctrl+Shift+J (เปิด Console)
    if ((e.ctrlKey && e.shiftKey && e.key === 'J') || (e.ctrlKey && e.shiftKey && e.keyCode === 74) || (e.ctrlKey && e.shiftKey && e.key === 'j')) {
        e.preventDefault();
        return false;
    }
    
    // ป้องกัน Ctrl+Shift+C (เปิด Inspect tool)
    if ((e.ctrlKey && e.shiftKey && e.key === 'C') || (e.ctrlKey && e.shiftKey && e.keyCode === 67) || (e.ctrlKey && e.shiftKey && e.key === 'c')) {
        e.preventDefault();
        return false;
    }

    // ป้องกัน Ctrl+U (ดู Source Code)
    if ((e.ctrlKey && e.key === 'u') || (e.ctrlKey && e.key === 'U') || (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault();
        return false;
    }
});
