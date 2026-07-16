import { supabase } from './supabase.js';

export async function initCustomersView() {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">جاري التحميل...</td></tr>';
    
    try {
        const { data: customers, error } = await supabase
            .from('customers')
            .select(`
                *,
                invoices ( total, status )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        tbody.innerHTML = '';
        if(customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">لا يوجد عملاء حالياً</td></tr>';
            return;
        }

        customers.forEach(cust => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 transition";
            
            // Calculate total balance roughly (unpaid invoices)
            let balance = 0;
            if(cust.invoices) {
                cust.invoices.forEach(inv => {
                    if(inv.status !== 'paid') balance += parseFloat(inv.total || 0);
                });
            }

            const date = new Date(cust.created_at).toLocaleDateString('en-GB');

            tr.innerHTML = `
                <td class="p-4 font-mono text-[#3b367d] font-bold">${cust.customer_number}</td>
                <td class="p-4 font-bold text-slate-700">${cust.name}</td>
                <td class="p-4 text-slate-500 font-mono">${cust.phone || '--'}</td>
                <td class="p-4 text-slate-500 font-mono">${cust.vat_number || '--'}</td>
                <td class="p-4 text-slate-500 text-xs">${date}</td>
                <td class="p-4 text-center space-x-2 space-x-reverse">
                    <button class="stmt-btn bg-[#c0a070]/10 text-[#c0a070] px-3 py-1.5 rounded hover:bg-[#c0a070] hover:text-white transition text-xs font-bold">كشف حساب</button>
                    <button class="edit-btn bg-slate-100 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-200 transition text-xs font-bold">تعديل</button>
                </td>
            `;
            
            tr.querySelector('.stmt-btn').addEventListener('click', () => openCustomerStatement(cust));
            tr.querySelector('.edit-btn').addEventListener('click', () => alert('ميزة التعديل ستتوفر قريباً.'));
            
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-red-500">حدث خطأ أثناء تحميل العملاء</td></tr>';
    }
}

async function openCustomerStatement(customer) {
    const modal = document.getElementById('genericModal');
    document.getElementById('modalTitle').innerText = 'كشف حساب عميل';
    document.getElementById('modalSubtitle').innerText = `${customer.name} (${customer.customer_number})`;
    document.getElementById('modalIcon').innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`;
    
    modal.classList.remove('hidden');
    document.getElementById('modalLoader').classList.remove('hidden');
    const content = document.getElementById('modalContent');
    content.innerHTML = '';

    try {
        const { data: invoices, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('customer_id', customer.id)
            .order('date', { ascending: false });

        if (error) throw error;
        document.getElementById('modalLoader').classList.add('hidden');

        let html = `
            <table class="w-full text-right text-sm">
                <thead class="bg-slate-100 text-[#3b367d] font-bold border-b border-slate-200">
                    <tr>
                        <th class="p-4 w-32">رقم الفاتورة</th>
                        <th class="p-4 w-32">التاريخ</th>
                        <th class="p-4 w-32 text-center">المبلغ</th>
                        <th class="p-4 w-24">الحالة</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
        `;

        if(invoices.length === 0) {
            html += `<tr><td colspan="4" class="p-8 text-center text-slate-400">لا توجد فواتير لهذا العميل</td></tr>`;
        } else {
            invoices.forEach(inv => {
                html += `
                    <tr class="hover:bg-slate-50">
                        <td class="p-4 font-mono font-bold text-[#3b367d]">${inv.invoice_number}</td>
                        <td class="p-4 text-slate-500">${inv.date}</td>
                        <td class="p-4 text-center font-bold text-[#c0a070]">${parseFloat(inv.total).toLocaleString()} ${inv.currency}</td>
                        <td class="p-4 text-center text-xs bg-slate-100 rounded m-2">${inv.status}</td>
                    </tr>
                `;
            });
        }
        
        html += `</tbody></table>`;
        content.innerHTML = html;

    } catch (err) {
        console.error(err);
        document.getElementById('modalLoader').classList.add('hidden');
        content.innerHTML = '<p class="p-8 text-center text-red-500">حدث خطأ أثناء جلب كشف الحساب</p>';
    }
}
