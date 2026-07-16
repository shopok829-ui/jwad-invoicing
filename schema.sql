-- 1. جدول العملاء (Customers)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    vat_number VARCHAR(50),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول الفواتير (Invoices)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    currency VARCHAR(10) DEFAULT 'SAR',
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, partial
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول بنود الفاتورة (Invoice Items)
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    details TEXT,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0
);

-- 4. جدول المدفوعات (Payments)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- القيود المزدوجة (Double-Entry Accounting)
-- ==========================================

-- 5. دليل الحسابات (Accounts)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
    balance DECIMAL(15, 2) DEFAULT 0
);

-- إدراج الحسابات الافتراضية
INSERT INTO accounts (code, name, type) VALUES
('1000', 'الخزينة والبنك (Cash/Bank)', 'asset'),
('1100', 'ذمم العملاء (Accounts Receivable)', 'asset'),
('2000', 'الضرائب المستحقة (Tax Payable)', 'liability'),
('4000', 'إيرادات المبيعات (Sales Revenue)', 'revenue');

-- 6. القيود اليومية (Journal Entries)
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50), -- 'invoice', 'payment'
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. أطراف القيد (Journal Lines)
CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id),
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0
);

-- 8. دالة (Trigger) لتحديث أرصدة الحسابات تلقائياً عند إضافة أو تعديل قيد
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE accounts SET balance = balance + NEW.debit - NEW.credit WHERE id = NEW.account_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE accounts SET balance = balance - OLD.debit + OLD.credit WHERE id = OLD.account_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE accounts SET balance = balance - OLD.debit + OLD.credit + NEW.debit - NEW.credit WHERE id = NEW.account_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION update_account_balance();
