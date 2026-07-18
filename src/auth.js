import { supabase } from './supabase.js';

// Cache for current user
export let currentUser = null;

// Initialize auth state
export async function initAuth() {
    const savedUser = localStorage.getItem('jwad_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        return true;
    }
    return false;
}

// Login function using password only
export async function login(password) {
    try {
        const { data, error } = await supabase
            .from('app_users')
            .select('*')
            .eq('password', password)
            .single();

        if (error) {
            return { success: false, message: 'خطأ تقني: ' + error.message };
        }
        if (!data) {
            return { success: false, message: 'كلمة المرور غير صحيحة' };
        }

        currentUser = data;
        localStorage.setItem('jwad_user', JSON.stringify(currentUser));
        return { success: true, user: data };
    } catch (err) {
        console.error('Login error:', err);
        return { success: false, message: 'حدث خطأ أثناء الاتصال بالنظام' };
    }
}

// Logout function
export function logout() {
    currentUser = null;
    localStorage.removeItem('jwad_user');
    window.location.reload();
}
