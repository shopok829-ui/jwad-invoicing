import { supabase } from './supabase.js';

const currencyData = {
    'SAR': {symbol: 'ر.س', name: 'ريال سعودي'}, 
    'USD': {symbol: '$', name: 'دولار أمريكي'}, 
    'YER': {symbol: 'ر.ي', name: 'ريال يمني'}
};

let currentDocType = 'invoice'; // 'invoice' or 'quote'
let systemSettings = {};

export function initInvoice(type = 'invoice', settings = {}) {
    currentDocType = type;
    systemSettings = settings;
    
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
    newBtn.addEventListener('click', addRow);
    
    document.getElementById('taxToggle').addEventListener('change', calculateAll);
    document.getElementById('currencySelector').addEventListener('change', calculateAll);
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

function addRow() {
    const tbody = document.getElementById('tableBody');
    const tr = document.createElement('tr');
    tr.className = 'item-row border-b border-slate-100 group transition hover:bg-brand-light/30';
    tr.innerHTML = `
        <td class="py-5 px-6 text-right">
            <div class="font-bold text-[#3b367d] text-sm item-desc" contenteditable="true">وصف الخدمة</div>
            <div class="text-[9px] text-slate-400 item-details" contenteditable="true">اضف التفاصيل هنا...</div>
        </td>
        <td class="py-5 px-2 text-center">
            <input type="number" step="0.01" value="0.00" class="w-full text-center bg-transparent outline-none item-price text-sm">
        </td>
        <td class="py-5 px-2 text-center">
            <input type="number" step="1" value="1" class="w-full text-center bg-[#f4f1eb] rounded font-bold text-[#3b367d] item-qty outline-none text-sm">
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

export async function saveDocumentAndPrint() {
    const btn = document.getElementById('savePrintBtn');
    const icon = document.getElementById('savePrintIcon');
    const text = document.getElementById('savePrintText');
    const custName = document.getElementById('custName').innerText.trim();
    const docNum = document.getElementById('invoiceNumber').innerText.trim();
    const originalDocTitle = document.title;

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
            // Update customer details just in case
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

        // 3. Save Document
        let docId;
        if (currentDocType === 'invoice') {
            const { data: doc, error } = await supabase.from('invoices').insert([{
                customer_id: customerId, invoice_number: docNum, date: isoDate,
                currency: document.getElementById('currencySelector').value,
                subtotal: subtotal, tax: tax, total: total, status: 'draft',
                notes: document.getElementById('invoiceNotes').innerText.trim()
            }]).select().single();
            if (error) throw error;
            docId = doc.id;
        } else {
            const { data: doc, error } = await supabase.from('quotes').insert([{
                customer_id: customerId, quote_number: docNum, date: isoDate,
                currency: document.getElementById('currencySelector').value,
                subtotal: subtotal, tax: tax, total: total, status: 'draft',
                notes: document.getElementById('invoiceNotes').innerText.trim()
            }]).select().single();
            if (error) throw error;
            docId = doc.id;
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
            const table = currentDocType === 'invoice' ? 'invoice_items' : 'quote_items';
            const { error: itemsErr } = await supabase.from(table).insert(itemsToInsert);
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

        // 6. Print
        document.title = `${custName} - ${docNum}`;
        setTimeout(() => {
            window.print();
            document.title = originalDocTitle;
            btn.disabled = false; 
            icon.classList.add('hidden'); 
            text.innerText = 'حفظ في السحابة وطباعة (PDF)';
        }, 500);

    } catch (error) {
        console.error('Save error:', error);
        alert('حدث خطأ أثناء الحفظ. تأكد من أن رقم المستند غير مكرر.');
        btn.disabled = false; 
        icon.classList.add('hidden'); 
        text.innerText = 'حفظ في السحابة وطباعة (PDF)';
    }
}
