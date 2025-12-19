import { calculateAnnualFee, calculateCategoryTotal, calculateCategorySpent, formatCurrency } from './utils.js';

const config = {
    uniform: { hasShop: true, hasQty: true, hasPrice: true, hasFreq: false, hasDate: false },
    stationery: { hasShop: true, hasQty: true, hasPrice: true, hasFreq: false, hasDate: false },
    fees: { hasShop: false, hasQty: false, hasPrice: true, hasFreq: true, hasDate: false },
    admin: { hasShop: false, hasQty: false, hasPrice: false, hasFreq: false, hasDate: true }
};

export const render = (currentTab, data, filterStatus, actions) => {
    if (currentTab === 'overview') {
        renderOverview(data, container);
        return;
    }

    const container = document.getElementById('items-container');
    const conf = config[currentTab];
    let list = [...(data[currentTab] || [])];

    // Apply Filter
    if (filterStatus === 'completed') {
        list = list.filter(item => item.checked);
    } else if (filterStatus === 'pending') {
        list = list.filter(item => !item.checked);
    }

    // Sorting for Admin
    if (currentTab === 'admin') {
        list.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
    }

    container.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];

    // Empty State Check
    if (list.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state scholar-card';
        emptyState.innerHTML = `
            <div class="text-4xl mb-4">📝</div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">No Items Yet</h3>
            <p class="text-slate-500 text-sm">Tap the "Add" button below to start tracking your ${currentTab} expenses.</p>
        `;
        container.appendChild(emptyState);
        updateFinancials(currentTab, data);
        return;
    }

    // Add Filter UI for non-overview/admin tabs
    if (currentTab !== 'overview') {
        const filterHeader = document.createElement('div');
        filterHeader.className = 'flex justify-between items-center mb-4 px-2 animate-fade-in-up';
        filterHeader.innerHTML = `
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">${list.length} Items</span>
            <select id="completion-filter" class="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 outline-none">
                <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>All Tasks</option>
                <option value="completed" ${filterStatus === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="pending" ${filterStatus === 'pending' ? 'selected' : ''}>Pending</option>
            </select>
        `;
        container.appendChild(filterHeader);
    }

    list.forEach((item, index) => {
        const isOverdue = item.dueDate && item.dueDate < today && !item.checked;
        const card = document.createElement('div');
        card.className = `scholar-card p-6 border-2 mb-4 ${item.checked ? 'border-emerald-300 bg-emerald-50/30' : isOverdue ? 'border-rose-400 bg-rose-50/20' : 'border-transparent shadow-sm'}`;
        card.style.animationDelay = `${index * 0.05}s`;

        card.innerHTML = `
            <div class="flex gap-5">
                <button data-action="toggle" data-id="${item.id}" class="mt-1 w-10 h-10 rounded-2xl border-2 flex-shrink-0 flex items-center justify-center transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 bg-slate-50'}">
                    ${item.checked ? '✓' : ''}
                </button>
                <div class="flex-grow space-y-4">
                    <div class="flex justify-between items-start gap-2">
                        <div class="w-full">
                            ${isOverdue ? '<span class="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1 block">⚠️ Overdue</span>' : ''}
                            <input data-field="name" data-id="${item.id}" value="${item.name}" placeholder="Description..." class="bg-transparent font-bold text-slate-800 w-full text-xl outline-none">
                        </div>
                        <button data-action="delete" data-id="${item.id}" class="text-slate-300 hover:text-rose-500">✕</button>
                    </div>

                    ${conf.hasShop ? `
                    <div class="bg-slate-50 rounded-2xl px-4 py-3 flex items-center gap-3 border border-slate-100">
                        <span class="text-lg">🏪</span>
                        <input data-field="shop" data-id="${item.id}" value="${item.shop}" class="bg-transparent w-full outline-none font-bold text-slate-600 text-sm" placeholder="Store...">
                    </div>` : ''}

                    <div class="flex gap-3">
                        ${conf.hasQty ? `<div class="flex-1 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100"><p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Qty</p><input type="number" data-field="qty" data-id="${item.id}" value="${item.qty}" class="bg-transparent w-full outline-none font-black text-slate-700"></div>` : ''}
                        ${conf.hasPrice ? `<div class="flex-1 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100"><p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Price</p><input type="number" data-field="price" data-id="${item.id}" value="${item.price}" class="bg-transparent w-full outline-none font-black text-slate-700"></div>` : ''}
                        ${conf.hasFreq ? `<div class="flex-1 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100"><p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Frequency</p><select data-field="frequency" data-id="${item.id}" class="bg-transparent w-full outline-none font-black text-slate-700 text-xs"><option value="Annually" ${item.frequency === 'Annually' ? 'selected' : ''}>Annually</option><option value="Monthly" ${item.frequency === 'Monthly' ? 'selected' : ''}>Monthly</option><option value="Per Term" ${item.frequency === 'Per Term' ? 'selected' : ''}>Per Term</option><option value="Once-off" ${item.frequency === 'Once-off' ? 'selected' : ''}>Once-off</option></select></div>` : ''}
                        ${conf.hasDate ? `<div class="flex-1 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 ${isOverdue ? 'bg-rose-100 border-rose-200' : ''}"><p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Due Date</p><input type="date" data-field="dueDate" data-id="${item.id}" value="${item.dueDate || ''}" class="bg-transparent w-full outline-none font-black text-slate-700 text-xs"></div>` : ''}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    updateFinancials(currentTab, data);
};

function updateFinancials(currentTab, data) {
    const dashboard = document.getElementById('footer-dashboard');
    const adminFooter = document.getElementById('admin-footer');
    const spacer = document.getElementById('bottom-spacer');

    if (currentTab === 'overview' || currentTab === 'admin') {
        dashboard.style.display = 'none';
        adminFooter.style.display = currentTab === 'admin' ? 'block' : 'none';
        spacer.style.display = currentTab === 'overview' ? 'none' : 'block';
        return;
    }

    dashboard.style.display = 'block';
    adminFooter.style.display = 'none';
    spacer.style.display = 'block';

    const items = data[currentTab] || [];
    const isFees = currentTab === 'fees';

    const total = calculateCategoryTotal(items, isFees);
    const spent = calculateCategorySpent(items, isFees);
    const remaining = total - spent;
    const progress = total > 0 ? (spent / total) * 100 : 0;

    document.getElementById('total-cost').innerText = formatCurrency(total);
    document.getElementById('spent-amount').innerText = formatCurrency(spent);
    document.getElementById('remaining-amount').innerText = formatCurrency(remaining);
    document.getElementById('financial-progress-bar').style.width = `${progress}%`;

    // Monthly vs Annual labels for Fees
    const labels = document.querySelectorAll('#footer-dashboard .uppercase.font-black');
    if (isFees) {
        labels[0].innerText = 'Paid (Annualized)';
        labels[1].innerText = 'Remaining (Annualized)';
    } else {
        labels[0].innerText = 'Spent So Far';
        labels[1].innerText = 'Left to Spend';
    }
}

function renderOverview(data, container) {
    container.innerHTML = '';
    const totals = {
        uniform: calculateCategoryTotal(data.uniform, false),
        stationery: calculateCategoryTotal(data.stationery, false),
        fees: calculateCategoryTotal(data.fees, true)
    };
    const spent = {
        uniform: calculateCategorySpent(data.uniform, false),
        stationery: calculateCategorySpent(data.stationery, false),
        fees: calculateCategorySpent(data.fees, true)
    };
    const grandTotal = totals.uniform + totals.stationery + totals.fees;
    const grandSpent = spent.uniform + spent.stationery + spent.fees;
    const overallProgress = grandTotal > 0 ? (grandSpent / grandTotal * 100).toFixed(0) : 0;

    container.innerHTML = `
        <div class="scholar-card p-10 shadow-2xl border-none mb-10 overflow-hidden relative animate-fade-in-up">
            <div class="absolute top-0 right-0 p-8 opacity-10">
                <span class="text-8xl font-black">${overallProgress}%</span>
            </div>
            <h3 class="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                <span class="w-2 h-8 bg-slate-900 rounded-full"></span> 
                Annual Budget Overview
            </h3>
            <div class="h-64 mb-10"><canvas id="scholarChart"></canvas></div>
            
            <div class="space-y-6 pt-8 border-t border-slate-100">
                ${renderCategoryProgress('Fees', spent.fees, totals.fees, '#f43f5e')}
                ${renderCategoryProgress('Uniform', spent.uniform, totals.uniform, '#10b981')}
                ${renderCategoryProgress('Stationery', spent.stationery, totals.stationery, '#3b82f6')}
            </div>

            <div class="mt-10 pt-8 border-t border-slate-100 flex justify-between items-end">
                <div>
                    <p class="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">Total Annual Cost</p>
                    <p class="text-3xl font-black text-slate-900">${formatCurrency(grandTotal)}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-1">Overall Progress</p>
                    <p class="text-xl font-bold text-slate-700">${overallProgress}% Paid</p>
                </div>
            </div>
        </div>

        <div class="space-y-6 pb-20">
            <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Detailed Breakdown</h4>
            ${renderCategoryBreakdown('Fees', data.fees, totals.fees, true)}
            ${renderCategoryBreakdown('Uniform', data.uniform, totals.uniform, false)}
            ${renderCategoryBreakdown('Stationery', data.stationery, totals.stationery, false)}
        </div>
    `;

    new Chart(document.getElementById('scholarChart'), {
        type: 'doughnut',
        data: {
            labels: ['Uniform', 'Stationery', 'Fees'],
            datasets: [{
                data: [totals.uniform, totals.stationery, totals.fees],
                backgroundColor: ['#10b981', '#3b82f6', '#f43f5e'],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            cutout: '80%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 30, font: { weight: '800', size: 12, family: 'Plus Jakarta Sans' } }
                }
            },
            maintainAspectRatio: false
        }
    });
}

function renderCategoryProgress(label, spent, total, color) {
    const progress = total > 0 ? (spent / total * 100) : 0;
    return `
        <div>
            <div class="flex justify-between items-center mb-2">
                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">${label}</p>
                <p class="text-[10px] font-black text-slate-900">${formatCurrency(spent)} / ${formatCurrency(total)}</p>
            </div>
            <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-1000" style="width: ${progress}%; background-color: ${color}"></div>
            </div>
        </div>
    `;
}

function renderCategoryBreakdown(title, items, categoryTotal, isFees) {
    if (!items || items.length === 0) return '';

    const rows = items.map(item => {
        const itemAnnual = isFees ? calculateAnnualFee(item) : (item.price * item.qty);
        const percentage = categoryTotal > 0 ? (itemAnnual / categoryTotal * 100).toFixed(1) : 0;
        return `
            <div class="breakdown-row animate-fade-in-up">
                <div>
                    <p class="font-bold text-slate-700 text-sm">${item.name || 'Unnamed Item'}</p>
                    <p class="text-[10px] text-slate-400 font-bold uppercase">${isFees ? item.frequency : 'Once-off'}</p>
                </div>
                <div class="text-right">
                    <p class="font-black text-slate-900 text-sm">${formatCurrency(itemAnnual)}</p>
                    <p class="text-[10px] text-emerald-500 font-black">${percentage}%</p>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="scholar-card p-6 shadow-sm border-transparent bg-white/50 animate-fade-in-up">
            <h5 class="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] mb-4">${title} Breakdown</h5>
            <div class="divide-y divide-slate-100">
                ${rows}
            </div>
        </div>
    `;
}
