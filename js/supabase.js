// js/supabase.js

const SUPABASE_URL = 'https://twjcjpsnitwtvfscqwzw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3amNqcHNuaXR3dHZmc2Nxd3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NjQ1MDgsImV4cCI6MjA5NzU0MDUwOH0.hdYwx4xfbYZaCod0xS8g7dxj1zUJpV3r2iJDGy1--PM';

// สร้าง Supabase Client สำหรับฝั่ง Frontend
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
