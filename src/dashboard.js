import Chart from 'chart.js/auto';
import { supabase } from './supabase.js';

let revenueChartInstance = null;
let statusChartInstance = null;

export async function initDashboard() {
    try {
        // Fetch KPIs
        const { data: invoices, error: invError } = await supabase.from('invoices').select('*');
        const { data: customers, error: custError } = await supabase.from('customers').select('id');
        
        if (invError) throw invError;
        if (custError) throw custError;

        let totalRevenue = 0;
        let unpaidCount = 0;
        let monthlyRevenue = {};
        let statusCounts = { 'مسودة': 0, 'بانتظار الدفع': 0, 'مدفوعة': 0 };

        invoices.forEach(inv => {
            totalRevenue += parseFloat(inv.total || 0);
            
            if (inv.status === 'draft' || inv.status === 'sent') {
                unpaidCount++;
            }

            // Map status
            if(inv.status === 'paid') statusCounts['مدفوعة']++;
            else if(inv.status === 'sent') statusCounts['بانتظار الدفع']++;
            else statusCounts['مسودة']++;

            // Monthly aggregation
            const date = new Date(inv.date);
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyRevenue[monthYear] = (monthlyRevenue[monthYear] || 0) + parseFloat(inv.total || 0);
        });

        // Update KPI UI
        document.getElementById('kpi-revenue').innerHTML = `${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})} <span class="text-sm text-[#c0a070]">ر.س</span>`;
        document.getElementById('kpi-unpaid').innerText = unpaidCount;
        document.getElementById('kpi-customers').innerText = customers.length;

        // Render Charts
        renderRevenueChart(monthlyRevenue);
        renderStatusChart(statusCounts);

    } catch (err) {
        console.error('Error loading dashboard data:', err);
    }
}

function renderRevenueChart(monthlyData) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    // Sort keys chronologically
    const labels = Object.keys(monthlyData).sort();
    const data = labels.map(label => monthlyData[label]);

    if (revenueChartInstance) {
        revenueChartInstance.destroy();
    }

    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['لا توجد بيانات'],
            datasets: [{
                label: 'الإيرادات (ر.س)',
                data: data.length ? data : [0],
                borderColor: '#3b367d',
                backgroundColor: 'rgba(59, 54, 125, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderStatusChart(statusData) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    if (statusChartInstance) {
        statusChartInstance.destroy();
    }

    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusData),
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: ['#cbd5e1', '#c0a070', '#3b367d'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'Noto Sans Arabic' } } }
            }
        }
    });
}
