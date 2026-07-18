import { supabase } from './supabase.js';
import { currentUser } from './auth.js';

export let systemSettingsCache = {};

export async function loadSystemSettings() {
    try {
        const { data, error } = await supabase.from('system_settings').select('*');
        if (error) throw error;
        
        data.forEach(setting => {
            systemSettingsCache[setting.setting_key] = setting.setting_value;
        });
        
        return systemSettingsCache;
    } catch (err) {
        console.error('Failed to load settings:', err);
        return {};
    }
}

export async function initAdminView() {
    // Populate form with current cache
    document.getElementById('set_company_name').value = systemSettingsCache.company_name || '';
    document.getElementById('set_tax_rate').value = systemSettingsCache.tax_rate || '15';
    document.getElementById('set_currency').value = systemSettingsCache.currency || 'SAR';
    document.getElementById('set_address').value = systemSettingsCache.address || '';

    // Bind form submit
    const form = document.getElementById('settingsForm');
    
    // Remove old listener if exists to prevent duplicates
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loader = document.getElementById('settingsLoader');
        loader.classList.remove('hidden');

        const updates = [
            { setting_key: 'company_name', setting_value: document.getElementById('set_company_name').value },
            { setting_key: 'tax_rate', setting_value: document.getElementById('set_tax_rate').value },
            { setting_key: 'currency', setting_value: document.getElementById('set_currency').value },
            { setting_key: 'address', setting_value: document.getElementById('set_address').value }
        ];

        try {
            // Upsert settings (requires setting_key to be unique)
            const { error } = await supabase
                .from('system_settings')
                .upsert(updates, { onConflict: 'setting_key' });
                
            if (error) throw error;
            
            alert('تم حفظ الإعدادات بنجاح!');
            // Reload cache
            await loadSystemSettings();
            
        } catch (err) {
            console.error(err);
            alert('فشل الحفظ.');
        } finally {
            loader.classList.add('hidden');
        }
    });

    // Initialize User Management if Super Admin
    if (currentUser && currentUser.role === 'super_admin') {
        const userSection = document.getElementById('users-management-section');
        if(userSection) userSection.classList.remove('hidden');
        loadUsersTable();
        bindUserForm();
    }
}

async function loadUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    try {
        const { data, error } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        tbody.innerHTML = data.map(u => `
            <tr>
                <td class="p-4 font-bold text-[#3b367d]">${u.name}</td>
                <td class="p-4 font-mono">${u.password}</td>
                <td class="p-4 text-xs font-bold">${u.role === 'super_admin' ? 'سوبر أدمن' : 'مستخدم عادي'}</td>
                <td class="p-4 text-center">
                    <button onclick="window.editAppUser('${u.id}', '${u.name}', '${u.password}', '${u.role}')" class="text-[#c0a070] hover:text-[#a08050] px-2 font-bold transition">تعديل</button>
                    ${u.role === 'super_admin' ? '' : `<button onclick="window.deleteAppUser('${u.id}')" class="text-red-500 hover:text-red-700 px-2 font-bold transition">حذف</button>`}
                </td>
            </tr>
        `).join('');

    } catch(err) {
        console.error('Error loading users:', err);
    }
}

function bindUserForm() {
    const btn = document.getElementById('showAddUserModal');
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');

    btn.addEventListener('click', () => {
        document.getElementById('userModalTitle').innerText = 'إضافة مستخدم جديد';
        form.reset();
        document.getElementById('editUserId').value = '';
        modal.classList.remove('hidden');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editUserId').value;
        const name = document.getElementById('u_name').value;
        const password = document.getElementById('u_password').value;
        const role = document.getElementById('u_role').value;

        try {
            if (id) {
                const { error } = await supabase.from('app_users').update({ name, password, role }).eq('id', id);
                if(error) throw error;
            } else {
                const { error } = await supabase.from('app_users').insert([{ name, password, role }]);
                if(error) throw error;
            }
            modal.classList.add('hidden');
            loadUsersTable();
            alert('تم الحفظ بنجاح!');
        } catch(err) {
            console.error('User save error:', err);
            alert('تعذر حفظ بيانات المستخدم (قد يكون رمز الدخول مكرراً)');
        }
    });

    window.editAppUser = function(id, name, pass, role) {
        document.getElementById('userModalTitle').innerText = 'تعديل مستخدم';
        document.getElementById('editUserId').value = id;
        document.getElementById('u_name').value = name;
        document.getElementById('u_password').value = pass;
        document.getElementById('u_role').value = role;
        modal.classList.remove('hidden');
    };

    window.deleteAppUser = async function(id) {
        if(!confirm('هل تريد بالتأكيد حذف هذا المستخدم؟')) return;
        try {
            const { error } = await supabase.from('app_users').delete().eq('id', id);
            if(error) throw error;
            loadUsersTable();
        } catch(err) {
            console.error('Delete user error:', err);
            alert('تعذر حذف المستخدم');
        }
    };
}
