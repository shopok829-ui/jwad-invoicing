import { initDashboard } from './dashboard.js';
import { initInvoice, saveDocumentAndPrint } from './invoice.js';
import { initCustomersView } from './customers.js';
import { initAdminView, loadSystemSettings, systemSettingsCache } from './admin.js';
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Load Settings First
    await loadSystemSettings();

    // Navigation Elements
    const navDashboard = document.getElementById('nav-dashboard');
    const navDashboardBtn = document.getElementById('nav-dashboard-btn');
    const navNewInvoice = document.getElementById('nav-new-invoice');
    const navNewQuote = document.getElementById('nav-new-quote');
    const navCustomers = document.getElementById('nav-customers');
    const navArchive = document.getElementById('nav-archive');
    const navAdmin = document.getElementById('nav-admin');
    
    // View Elements
    const views = {
        dashboard: document.getElementById('dashboard-view'),
        invoice: document.getElementById('invoice-view'),
        customers: document.getElementById('customers-view'),
        admin: document.getElementById('admin-view')
    };
    
    // Header Elements
    const headerTitle = document.getElementById('header-title');
    const headerActions = document.getElementById('header-actions');

    // Archive Modal
    const genericModal = document.getElementById('genericModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // Helper to hide all views
    function hideAllViews() {
        Object.values(views).forEach(v => v.classList.add('hidden'));
        headerActions.classList.add('hidden');
    }

    // Initialize Dashboard as default
    switchToDashboard();

    // Event Listeners for Navigation
    navDashboard.addEventListener('click', switchToDashboard);
    if(navDashboardBtn) navDashboardBtn.addEventListener('click', switchToDashboard);
    
    navNewInvoice.addEventListener('click', () => {
        hideAllViews();
        views.invoice.classList.remove('hidden');
        headerTitle.innerText = 'إصدار فاتورة جديدة';
        headerActions.classList.remove('hidden');
        initInvoice('invoice', systemSettingsCache);
    });

    navNewQuote.addEventListener('click', () => {
        hideAllViews();
        views.invoice.classList.remove('hidden');
        headerTitle.innerText = 'إصدار عرض سعر جديد';
        headerActions.classList.remove('hidden');
        initInvoice('quote', systemSettingsCache);
    });

    navCustomers.addEventListener('click', () => {
        hideAllViews();
        views.customers.classList.remove('hidden');
        headerTitle.innerText = 'قاعدة بيانات العملاء';
        initCustomersView();
    });

    navAdmin.addEventListener('click', () => {
        hideAllViews();
        views.admin.classList.remove('hidden');
        headerTitle.innerText = 'إدارة النظام';
        initAdminView();
    });

    navArchive.addEventListener('click', openArchive);
    closeModalBtn.addEventListener('click', () => genericModal.classList.add('hidden'));

    // Bind Save and Print for documents
    document.getElementById('savePrintBtn').addEventListener('click', saveDocumentAndPrint);

    function switchToDashboard() {
        hideAllViews();
        views.dashboard.classList.remove('hidden');
        headerTitle.innerText = 'لوحة التحكم والمؤشرات';
        initDashboard();
    }

    async function openArchive() {
        genericModal.classList.remove('hidden');
        document.getElementById('modalTitle').innerText = 'أرشيف المستندات';
        document.getElementById('modalSubtitle').innerText = 'الفواتير وعروض الأسعار المحفوظة';
        document.getElementById('modalLoader').classList.remove('hidden');
        
        const content = document.getElementById('modalContent');
        content.innerHTML = '';

        try {
            // Fetch both invoices and quotes (simplified for UI demonstration)
            const [invoicesRes, quotesRes] = await Promise.all([
                supabase.from('invoices').select('*, customers(name, customer_number)').order('created_at', { ascending: false }),
                supabase.from('quotes').select('*, customers(name, customer_number)').order('created_at', { ascending: false })
            ]);

            if (invoicesRes.error) throw invoicesRes.error;
            if (quotesRes.error) throw quotesRes.error;

            const allDocs = [
                ...invoicesRes.data.map(d => ({...d, docType: 'فاتورة'})),
                ...quotesRes.data.map(d => ({...d, docType: 'عرض سعر'}))
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            document.getElementById('modalLoader').classList.add('hidden');
            
            if (allDocs.length > 0) {
                let html = `
                <table class="w-full text-sm text-right">
                    <thead class="bg-slate-100 text-[#3b367d] font-bold border-b border-slate-200">
                        <tr>
                            <th class="p-4">رقم المستند</th>
                            <th class="p-4">النوع</th>
                            <th class="p-4">التاريخ</th>
                            <th class="p-4">اسم العميل</th>
                            <th class="p-4 text-center">المبلغ</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                `;
                allDocs.forEach(doc => {
                    const docNum = doc.invoice_number || doc.quote_number;
                    const color = doc.docType === 'فاتورة' ? 'text-[#3b367d]' : 'text-[#c0a070]';
                    html += `
                        <tr class="hover:bg-slate-50 transition group">
                            <td class="p-4 font-mono font-bold ${color}">${docNum}</td>
                            <td class="p-4 text-xs font-bold ${color}">${doc.docType}</td>
                            <td class="p-4 text-slate-500">${doc.date}</td>
                            <td class="p-4 font-bold text-slate-700">${doc.customers?.name || '--'}</td>
                            <td class="p-4 text-center font-bold text-[#c0a070]">${parseFloat(doc.total).toLocaleString()}</td>
                        </tr>
                    `;
                });
                html += '</tbody></table>';
                content.innerHTML = html;
            } else {
                content.innerHTML = '<p class="p-8 text-center text-slate-400">لا توجد مستندات محفوظة</p>';
            }

        } catch (err) {
            console.error('Archive error:', err);
            document.getElementById('modalLoader').classList.add('hidden');
            content.innerHTML = '<p class="p-8 text-center text-red-500">حدث خطأ أثناء جلب الأرشيف.</p>';
        }
    }
});
