import { supabase } from './supabase.js';

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
            alert('حدث خطأ أثناء حفظ الإعدادات.');
        } finally {
            loader.classList.add('hidden');
        }
    });
}
