-- 1. جدول إعدادات النظام (System Settings)
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT
);

-- إدراج القيم الافتراضية للإعدادات
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('company_name', 'جواد للخدمات التسويقية', 'اسم الشركة'),
('tax_rate', '15', 'نسبة الضريبة الافتراضية (%)'),
('currency', 'SAR', 'العملة الافتراضية'),
('address', 'المملكة العربية السعودية - الرياض', 'العنوان الافتراضي');

-- 2. جدول عروض الأسعار (Quotes)
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    valid_until DATE,
    currency VARCHAR(10) DEFAULT 'SAR',
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, accepted, rejected, expired
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول بنود عرض السعر (Quote Items)
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    details TEXT,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0
);
