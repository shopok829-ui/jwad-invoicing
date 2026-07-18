import { initDashboard } from './dashboard.js';
import { initInvoice, saveDocument, printDocument, loadDocumentForEditing } from './invoice.js';
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
    document.getElementById('saveBtn').addEventListener('click', saveDocument);
    document.getElementById('printBtn').addEventListener('click', printDocument);

    function switchToDashboard() {
        hideAllViews();
        views.dashboard.classList.remove('hidden');
        headerTitle.innerText = 'لوحة التحكم والمؤشرات';
        initDashboard();
    }

    // Global variable for loaded archive documents
    let archiveDocs = [];

    async function openArchive() {
        genericModal.classList.remove('hidden');
        document.getElementById('modalTitle').innerText = 'أرشيف المستندات';
        document.getElementById('modalSubtitle').innerText = 'الفواتير وعروض الأسعار المحفوظة مع إمكانية البحث والفلترة المتقدمة';
        document.getElementById('modalLoader').classList.remove('hidden');
        
        const content = document.getElementById('modalContent');
        content.innerHTML = '';

        try {
            const [invoicesRes, quotesRes] = await Promise.all([
                supabase.from('invoices').select('*, customers(name, customer_number)').order('created_at', { ascending: false }),
                supabase.from('quotes').select('*, customers(name, customer_number)').order('created_at', { ascending: false })
            ]);

            if (invoicesRes.error) throw invoicesRes.error;
            if (quotesRes.error) throw quotesRes.error;

            archiveDocs = [
                ...invoicesRes.data.map(d => ({...d, docType: 'فاتورة', docTypeRaw: 'invoice'})),
                ...quotesRes.data.map(d => ({...d, docType: 'عرض سعر', docTypeRaw: 'quote'}))
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            document.getElementById('modalLoader').classList.add('hidden');
            
            renderArchiveTable();

        } catch (err) {
            console.error('Archive error:', err);
            document.getElementById('modalLoader').classList.add('hidden');
            content.innerHTML = '<p class="p-8 text-center text-red-500">حدث خطأ أثناء جلب الأرشيف.</p>';
        }
    }

    function renderArchiveTable(searchTerm = '', sortCol = 'date', sortAsc = false) {
        const content = document.getElementById('modalContent');
        
        let filteredDocs = archiveDocs.filter(doc => {
            const num = (doc.invoice_number || doc.quote_number || '').toLowerCase();
            const cust = (doc.customers?.name || '').toLowerCase();
            const date = (doc.date || '').toLowerCase();
            const term = searchTerm.toLowerCase();
            return num.includes(term) || cust.includes(term) || date.includes(term) || doc.docType.includes(term);
        });

        // Simple sorting
        filteredDocs.sort((a, b) => {
            let valA = a[sortCol];
            let valB = b[sortCol];
            
            if(sortCol === 'customer') {
                valA = a.customers?.name || '';
                valB = b.customers?.name || '';
            } else if(sortCol === 'number') {
                valA = a.invoice_number || a.quote_number || '';
                valB = b.invoice_number || b.quote_number || '';
            }

            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });

        let html = `
            <div class="px-6 pb-4">
                <input type="text" id="archiveSearch" value="${searchTerm}" placeholder="ابحث برقم الفاتورة، اسم العميل، أو التاريخ..." class="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#c0a070]">
            </div>
            <div class="overflow-x-auto px-6 pb-6">
                <table class="w-full text-sm text-right">
                    <thead class="bg-slate-100 text-[#3b367d] font-bold border-b border-slate-200">
                        <tr>
                            <th class="p-4 cursor-pointer hover:bg-slate-200 transition" onclick="window.sortArchive('number')">رقم المستند ⇅</th>
                            <th class="p-4 cursor-pointer hover:bg-slate-200 transition" onclick="window.sortArchive('docType')">النوع ⇅</th>
                            <th class="p-4 cursor-pointer hover:bg-slate-200 transition" onclick="window.sortArchive('date')">التاريخ ⇅</th>
                            <th class="p-4 cursor-pointer hover:bg-slate-200 transition" onclick="window.sortArchive('customer')">اسم العميل ⇅</th>
                            <th class="p-4 text-center cursor-pointer hover:bg-slate-200 transition" onclick="window.sortArchive('total')">المبلغ ⇅</th>
                            <th class="p-4 text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
        `;

        if (filteredDocs.length > 0) {
            filteredDocs.forEach(doc => {
                const docNum = doc.invoice_number || doc.quote_number;
                const color = doc.docType === 'فاتورة' ? 'text-[#3b367d]' : 'text-[#c0a070]';
                html += `
                    <tr class="hover:bg-slate-50 transition group">
                        <td class="p-4 font-mono font-bold ${color}">${docNum}</td>
                        <td class="p-4 text-xs font-bold ${color}">${doc.docType}</td>
                        <td class="p-4 text-slate-500">${doc.date}</td>
                        <td class="p-4 font-bold text-slate-700">${doc.customers?.name || '--'}</td>
                        <td class="p-4 text-center font-bold text-[#c0a070]">${parseFloat(doc.total).toLocaleString()}</td>
                        <td class="p-4 text-center">
                            <button onclick="window.editDocument('${doc.id}', '${doc.docTypeRaw}')" class="bg-[#f4f1eb] text-[#3b367d] px-4 py-1 rounded text-xs font-bold hover:bg-[#c0a070] hover:text-white transition shadow-sm border border-[#c0a070]/30">تعديل</button>
                        </td>
                    </tr>
                `;
            });
        } else {
            html += `<tr><td colspan="6" class="p-8 text-center text-slate-400">لا توجد نتائج مطابقة للبحث</td></tr>`;
        }

        html += '</tbody></table></div>';
        content.innerHTML = html;

        // Rebind search event
        const searchInput = document.getElementById('archiveSearch');
        searchInput.focus();
        // Move cursor to end
        const val = searchInput.value;
        searchInput.value = '';
        searchInput.value = val;

        searchInput.addEventListener('input', (e) => {
            renderArchiveTable(e.target.value, window.currentArchiveSortCol, window.currentArchiveSortAsc);
        });
    }

    // Global sort state
    window.currentArchiveSortCol = 'date';
    window.currentArchiveSortAsc = false;

    window.sortArchive = function(col) {
        if(window.currentArchiveSortCol === col) {
            window.currentArchiveSortAsc = !window.currentArchiveSortAsc;
        } else {
            window.currentArchiveSortCol = col;
            window.currentArchiveSortAsc = true;
        }
        const searchTerm = document.getElementById('archiveSearch')?.value || '';
        renderArchiveTable(searchTerm, window.currentArchiveSortCol, window.currentArchiveSortAsc);
    };

    window.editDocument = function(docId, type) {
        genericModal.classList.add('hidden');
        hideAllViews();
        views.invoice.classList.remove('hidden');
        headerTitle.innerText = type === 'invoice' ? 'تعديل الفاتورة' : 'تعديل عرض السعر';
        headerActions.classList.remove('hidden');
        loadDocumentForEditing(docId, type, systemSettingsCache);
    };
});
