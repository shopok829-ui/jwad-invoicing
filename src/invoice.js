import { supabase } from './supabase.js';

const currencyData = {
    'SAR': {symbol: 'ر.س', name: 'ريال سعودي'}, 
    'USD': {symbol: '$', name: 'دولار أمريكي'}, 
    'YER': {symbol: 'ر.ي', name: 'ريال يمني'}
};

let currentDocType = 'invoice'; // 'invoice' or 'quote'
let systemSettings = {};
let isEditMode = false;
let currentDocId = null;

export function initInvoice(type = 'invoice', settings = {}) {
    currentDocType = type;
    systemSettings = settings;
    isEditMode = false;
    currentDocId = null;
    
    // Update UI text based on type
    document.getElementById('docTypeEn').innerText = type === 'invoice' ? 'INVOICE' : 'QUOTATION';
    document.getElementById('docTypeAr').innerText = type === 'invoice' ? 'رقم الفاتورة' : 'رقم عرض السعر';
    
    // Apply settings
    if(settings.company_name) document.getElementById('disp_company_name').innerText = settings.company_name;
    if(settings.address) document.getElementById('disp_address').innerText = settings.address;
    if(settings.currency) {
        document.getElementById('currencySelector').value = settings.currency;
    }
    if(settings.tax_rate) {
        document.getElementById('taxRateDisplay').innerText = settings.tax_rate;
    }

    resetForm();
    
    // Clean up old event listeners if they exist (by replacing the node)
    const oldBtn = document.getElementById('addRowBtn');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    newBtn.addEventListener('click', () => addRow());
    
    document.getElementById('taxToggle').addEventListener('change', calculateAll);
    document.getElementById('currencySelector').addEventListener('change', calculateAll);

    const oldSelectBtn = document.getElementById('selectCustomerBtn');
    const newSelectBtn = oldSelectBtn.cloneNode(true);
    oldSelectBtn.parentNode.replaceChild(newSelectBtn, oldSelectBtn);
    newSelectBtn.addEventListener('click', openCustomerSelector);
}

export async function loadDocumentForEditing(docId, type, settings = {}) {
    currentDocType = type;
    systemSettings = settings;
    isEditMode = true;
    currentDocId = docId;

    document.getElementById('docTypeEn').innerText = type === 'invoice' ? 'INVOICE' : 'QUOTATION';
    document.getElementById('docTypeAr').innerText = type === 'invoice' ? 'رقم الفاتورة' : 'رقم عرض السعر';

    if(settings.company_name) document.getElementById('disp_company_name').innerText = settings.company_name;
    if(settings.address) document.getElementById('disp_address').innerText = settings.address;
    if(settings.tax_rate) document.getElementById('taxRateDisplay').innerText = settings.tax_rate;

    const table = type === 'invoice' ? 'invoices' : 'quotes';
    const itemsTable = type === 'invoice' ? 'invoice_items' : 'quote_items';
    const docField = type === 'invoice' ? 'invoice_id' : 'quote_id';

    try {
        const { data: doc, error: docErr } = await supabase.from(table).select('*, customers(*)').eq('id', docId).single();
        if (docErr) throw docErr;

        const { data: items, error: itemsErr } = await supabase.from(itemsTable).select('*').eq(docField, docId);
        if (itemsErr) throw itemsErr;

        document.getElementById('invoiceDate').innerText = doc.date.split('-').reverse().join('/'); 
        document.getElementById('invoiceNumber').innerText = doc.invoice_number || doc.quote_number;
        document.getElementById('invoiceNotes').innerText = doc.notes || '';
        document.getElementById('currencySelector').value = doc.currency || 'SAR';
        document.getElementById('taxToggle').checked = doc.tax > 0;

        if (doc.customers) {
            document.getElementById('custId').innerText = doc.customers.customer_number;
            document.getElementById('custName').innerText = doc.customers.name;
            document.getElementById('custAddress').innerText = doc.customers.address || 'لا يوجد عنوان';
            document.getElementById('custVat').innerText = doc.customers.vat_number || 'لا يوجد';
        }

        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        if (items && items.length > 0) {
            items.forEach(item => addRow(item));
        } else {
            addRow();
        }

        calculateAll();

    } catch (err) {
        console.error('Error loading doc for edit', err);
        alert('حدث خطأ أثناء تحميل المستند للتعديل');
    }
}

export function resetForm() {
    document.getElementById('invoiceDate').innerText = new Date().toLocaleDateString('en-GB');
    const prefix = currentDocType === 'invoice' ? 'INV-' : 'QTE-';
    document.getElementById('invoiceNumber').innerText = prefix + Math.floor(Math.random() * 900000 + 100000);
    document.getElementById('custId').innerText = 'C-' + Math.floor(Math.random() * 9000 + 1000);
    document.getElementById('custName').innerText = 'اسم العميل الموقر';
    document.getElementById('custAddress').innerText = 'أدخل عنوان العميل هنا...';
    document.getElementById('custVat').innerText = '300000000000003';
    document.getElementById('tableBody').innerHTML = '';
    addRow(); 
    calculateAll();
}

function addRow(item = null) {
    const tbody = document.getElementById('tableBody');
    const tr = document.createElement('tr');
    tr.className = 'item-row border-b border-slate-100 group transition hover:bg-brand-light/30';
    
    const desc = item ? item.description : 'وصف الخدمة';
    const details = item ? item.details : 'اضف التفاصيل هنا...';
    const price = item ? item.price : 0.00;
    const qty = item ? item.quantity : 1;

    tr.innerHTML = `
        <td class="py-5 px-6 text-right">
            <div class="font-bold text-[#3b367d] text-sm item-desc" contenteditable="true">${desc}</div>
            <div class="text-[9px] text-slate-400 item-details" contenteditable="true">${details}</div>
        </td>
        <td class="py-5 px-2 text-center">
            <input type="number" step="0.01" value="${price}" class="w-full text-center bg-transparent outline-none item-price text-sm">
        </td>
        <td class="py-5 px-2 text-center">
            <input type="number" step="1" value="${qty}" class="w-full text-center bg-[#f4f1eb] rounded font-bold text-[#3b367d] item-qty outline-none text-sm">
        </td>
        <td class="py-5 px-6 text-left font-black text-[#3b367d] text-sm text-left">
            <span class="row-total">0.00</span>
            <span class="currency-symbol text-[10px] text-[#c0a070] mr-1 font-bold"></span>
        </td>
        <td class="py-5 no-print text-center">
            <button class="text-slate-300 hover:text-red-500 transition px-2 remove-btn">×</button>
        </td>
    `;
    
    tr.querySelector('.item-price').addEventListener('input', calculateAll);
    tr.querySelector('.item-qty').addEventListener('input', calculateAll);
    tr.querySelector('.remove-btn').addEventListener('click', (e) => {
        e.target.closest('tr').remove();
        calculateAll();
    });

    tbody.appendChild(tr);
    calculateAll();
}

function calculateAll() {
    const isTaxable = document.getElementById('taxToggle').checked;
    const taxRate = isTaxable ? (parseFloat(systemSettings.tax_rate) || 15) : 0;
    
    const currencyKey = document.getElementById('currencySelector').value;
    const symbol = currencyData[currencyKey].symbol;
    
    document.querySelectorAll('.currency-symbol').forEach(el => el.innerText = symbol);
    document.querySelectorAll('.footer-currency-symbol').forEach(el => el.innerText = symbol);
    document.getElementById('taxLabel').innerText = `الضريبة (${taxRate}%):`;
    document.getElementById('printCurrency').innerText = currencyData[currencyKey].name;

    let subtotal = 0;
    document.querySelectorAll('.item-row').forEach(row => {
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const total = price * qty;
        row.querySelector('.row-total').innerText = total.toLocaleString('en-US', {minimumFractionDigits: 2});
        subtotal += total;
    });

    const tax = subtotal * (taxRate / 100);
    const grandTotal = subtotal + tax;
    
    const format = (v) => v.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('grandSubtotal').innerText = format(subtotal);
    document.getElementById('grandTax').innerText = format(tax);
    document.getElementById('grandTotal').innerText = format(grandTotal);
}

export function printDocument() {
    const docNum = document.getElementById('invoiceNumber').innerText.trim();
    const custName = document.getElementById('custName').innerText.trim();
    const originalDocTitle = document.title;
    document.title = `${custName} - ${docNum}`;
    window.print();
    document.title = originalDocTitle;
}

export async function saveDocument() {
    const btn = document.getElementById('saveBtn');
    const icon = document.getElementById('saveIcon');
    const text = document.getElementById('saveText');
    const custName = document.getElementById('custName').innerText.trim();
    const docNum = document.getElementById('invoiceNumber').innerText.trim();

    btn.disabled = true; 
    icon.classList.remove('hidden'); 
    text.innerText = 'جاري الحفظ...';

    try {
        // 1. Insert or Get Customer
        const custNumber = document.getElementById('custId').innerText.trim();
        let customerId;
        
        const { data: existingCust } = await supabase
            .from('customers')
            .select('id')
            .eq('customer_number', custNumber)
            .single();

        if (existingCust) {
            customerId = existingCust.id;
            await supabase.from('customers').update({
                name: custName,
                address: document.getElementById('custAddress').innerText.trim(),
                vat_number: document.getElementById('custVat').innerText.trim()
            }).eq('id', customerId);
        } else {
            const { data: newCust, error: custErr } = await supabase
                .from('customers')
                .insert([{
                    customer_number: custNumber,
                    name: custName,
                    address: document.getElementById('custAddress').innerText.trim(),
                    vat_number: document.getElementById('custVat').innerText.trim(),
                    phone: document.getElementById('vendorPhone1')?.innerText.trim()
                }])
                .select()
                .single();
            if (custErr) throw custErr;
            customerId = newCust.id;
        }

        // 2. Format Data
        const parseNum = (str) => parseFloat(str.replace(/,/g, ''));
        const subtotal = parseNum(document.getElementById('grandSubtotal').innerText);
        const tax = parseNum(document.getElementById('grandTax').innerText);
        const total = parseNum(document.getElementById('grandTotal').innerText);

        const dateParts = document.getElementById('invoiceDate').innerText.trim().split('/');
        let isoDate = new Date().toISOString().split('T')[0];
        if (dateParts.length === 3) isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

        // 3. Save Document (Insert or Update)
        let docId = currentDocId;
        const docData = {
            customer_id: customerId, date: isoDate,
            currency: document.getElementById('currencySelector').value,
            subtotal: subtotal, tax: tax, total: total, status: 'draft',
            notes: document.getElementById('invoiceNotes').innerText.trim()
        };

        if (currentDocType === 'invoice') docData.invoice_number = docNum;
        else docData.quote_number = docNum;

        const table = currentDocType === 'invoice' ? 'invoices' : 'quotes';
        const itemsTable = currentDocType === 'invoice' ? 'invoice_items' : 'quote_items';
        const docField = currentDocType === 'invoice' ? 'invoice_id' : 'quote_id';

        if (isEditMode && currentDocId) {
            // UPDATE
            const { error: updErr } = await supabase.from(table).update(docData).eq('id', currentDocId);
            if (updErr) throw updErr;

            // Delete old items
            await supabase.from(itemsTable).delete().eq(docField, currentDocId);

            if (currentDocType === 'invoice') {
                const { data: oldJe } = await supabase.from('journal_entries').select('id').eq('reference_id', currentDocId).eq('reference_type', 'invoice');
                if (oldJe && oldJe.length > 0) {
                    const jeIds = oldJe.map(j => j.id);
                    await supabase.from('journal_lines').delete().in('entry_id', jeIds);
                    await supabase.from('journal_entries').delete().in('id', jeIds);
                }
            }
        } else {
            // INSERT
            const { data: doc, error } = await supabase.from(table).insert([docData]).select().single();
            if (error) throw error;
            docId = doc.id;
            currentDocId = docId;
            isEditMode = true; // Switch to edit mode after first save
        }

        // 4. Insert Items
        const itemsToInsert = [];
        document.querySelectorAll('.item-row').forEach(row => {
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
            const itemObj = {
                description: row.querySelector('.item-desc').innerText.trim(),
                details: row.querySelector('.item-details').innerText.trim(),
                price: price, quantity: qty, total: price * qty
            };
            if(currentDocType === 'invoice') itemObj.invoice_id = docId;
            else itemObj.quote_id = docId;
            itemsToInsert.push(itemObj);
        });
        
        if (itemsToInsert.length > 0) {
            const { error: itemsErr } = await supabase.from(itemsTable).insert(itemsToInsert);
            if (itemsErr) throw itemsErr;
        }

        // 5. Create Double-Entry Journal ONLY if Invoice
        if (currentDocType === 'invoice') {
            const { data: journalEntry, error: jeErr } = await supabase.from('journal_entries').insert([{
                date: isoDate, description: `فاتورة مبيعات رقم ${docNum}`, reference_type: 'invoice', reference_id: docId
            }]).select().single();

            if (jeErr) throw jeErr;

            const { data: accounts } = await supabase.from('accounts').select('id, code');
            const acctAR = accounts.find(a => a.code === '1100').id;
            const acctRev = accounts.find(a => a.code === '4000').id;
            const acctTax = accounts.find(a => a.code === '2000').id;

            const journalLines = [
                { entry_id: journalEntry.id, account_id: acctAR, debit: total, credit: 0 },
                { entry_id: journalEntry.id, account_id: acctRev, debit: 0, credit: subtotal }
            ];
            if (tax > 0) journalLines.push({ entry_id: journalEntry.id, account_id: acctTax, debit: 0, credit: tax });

            const { error: jlErr } = await supabase.from('journal_lines').insert(journalLines);
            if (jlErr) throw jlErr;
        }

        btn.disabled = false; 
        icon.classList.add('hidden'); 
        text.innerText = 'تم الحفظ بنجاح ✓';
        setTimeout(() => text.innerText = 'حفظ المستند', 3000);

    } catch (error) {
        console.error('Save error:', error);
        alert('حدث خطأ أثناء الحفظ. تأكد من أن رقم المستند غير مكرر.');
        btn.disabled = false; 
        icon.classList.add('hidden'); 
        text.innerText = 'حفظ المستند';
    }
}

async function openCustomerSelector() {
    const modal = document.getElementById('genericModal');
    document.getElementById('modalTitle').innerText = 'اختيار عميل';
    document.getElementById('modalSubtitle').innerText = 'اختر عميلاً من القائمة أو أضف عميلاً جديداً';
    document.getElementById('modalIcon').innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`;
    
    modal.classList.remove('hidden');
    document.getElementById('modalLoader').classList.remove('hidden');
    const content = document.getElementById('modalContent');
    content.innerHTML = '';

    try {
        const { data: customers, error } = await supabase
            .from('customers')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        document.getElementById('modalLoader').classList.add('hidden');

        let html = `
            <div class="p-6">
                <button id="modalAddCustBtn" class="w-full bg-[#f4f1eb] text-[#3b367d] border-2 border-dashed border-[#c0a070] py-3 rounded-xl font-bold mb-4 hover:bg-[#c0a070] hover:text-white transition">+ إضافة عميل جديد سريع</button>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        `;

        if(customers.length === 0) {
            html += `<p class="col-span-full text-center text-slate-400 p-4">لا يوجد عملاء، أضف عميلاً جديداً</p>`;
        } else {
            customers.forEach(c => {
                html += `
                    <div class="cust-card bg-white border border-slate-200 p-4 rounded-xl cursor-pointer hover:border-[#c0a070] hover:shadow-md transition text-right" data-id="${c.customer_number}" data-name="${c.name}" data-vat="${c.vat_number || 'لا يوجد'}" data-addr="${c.address || 'لا يوجد عنوان'}">
                        <p class="font-bold text-[#3b367d] mb-1">${c.name}</p>
                        <p class="text-xs text-slate-500 font-mono mb-2">${c.customer_number}</p>
                        <p class="text-xs text-slate-400">الضريبي: <span class="font-mono">${c.vat_number || '--'}</span></p>
                    </div>
                `;
            });
        }
        
        html += `</div></div>`;
        content.innerHTML = html;

        document.getElementById('modalAddCustBtn').onclick = () => {
            modal.classList.add('hidden');
            document.getElementById('nav-customers').click();
            setTimeout(() => document.getElementById('addCustomerBtn').click(), 100);
        };

        document.querySelectorAll('.cust-card').forEach(card => {
            card.onclick = () => {
                document.getElementById('custId').innerText = card.dataset.id;
                document.getElementById('custName').innerText = card.dataset.name;
                document.getElementById('custVat').innerText = card.dataset.vat;
                document.getElementById('custAddress').innerText = card.dataset.addr;
                modal.classList.add('hidden');
            };
        });

    } catch (err) {
        console.error(err);
        document.getElementById('modalLoader').classList.add('hidden');
        content.innerHTML = '<p class="p-8 text-center text-red-500">حدث خطأ أثناء جلب العملاء</p>';
    }
}
