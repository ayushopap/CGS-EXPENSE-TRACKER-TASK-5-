// Data Layer
let transactions = [];
let editingId = null;
let chartInstance = null;

const STORAGE_KEY = 'expense_tracker_data';

function loadData(){
    try{
        const data = localStorage.getItem(STORAGE_KEY);
        if(data) transactions = JSON.parse(data);
        else transactions = [];
    } catch {
        transactions = [];
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function generateId() {
    return Date.now() + '_' + Math.random().toString(36).slice(2, 7)
}

// --------------------------------------------------
// DOM REFS
// --------------------------------------------------
const descInput = document.getElementById('descInput');
const amountInput = document.getElementById('amountInput');
const categorySelect = document.getElementById('categorySelect');
const addBtn = document.getElementById('addBtn');
const expensesList = document.getElementById('expensesList');
const filterCategory = document.getElementById('filterCategory');
const filterType = document.getElementById('filterType');
const totalBalance = document.getElementById('totalBalance');
const totalIncome = document.getElementById('totalIncome');
const totalExpense = document.getElementById('totalExpense');
const transactionCount = document.getElementById('transactionCount');
const clearAllBtn = document.getElementById('clearAllBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

// --------------------------------------------------
// Render -
// --------------------------------------------------
function renderAll(){
    renderStats();
    renderList();
    renderChart();
}

function renderStats(){
    const total = transactions.reduce((sum, t) => {
        return t.type === 'income' ? sum + t.amount : sum - t.amount;
    }, 0);
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    totalBalance.textContent = `₹${total.toFixed(2)}`;
    totalIncome.textContent = `₹${income.toFixed(2)}`;
    totalExpense.textContent = `₹${expense.toFixed(2)}`;
    if (transactionCount) transactionCount.textContent = transactions.length;
}

function getFilteredTransactions() {
    const cat = filterCategory.value; // FIXED: Was ariaValueMax
    const type = filterType.value;
    return transactions.filter(t => {
        if (cat !== 'all' && t.category !== cat) return false;
        if (type !== 'all' && t.type !== type) return false;
        return true;
    });
}

function renderList(){
    const filtered = getFilteredTransactions();
    if(filtered.length === 0){
        expensesList.innerHTML = `<div class="no-expenses"> No Transactions Match your filters.</div>`;
        return;
    }

    // sort by date descending
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = '';
    sorted.forEach(t => {
        const isIncome = t.type === 'income';
        const amountClass = isIncome ? 'income-amount' : 'expense-amount';
        const sign = isIncome ? '+' : '-';
        html += `
    <div class="expense-item transaction-item" style="display: flex !important; justify-content: space-between !important; align-items: center !important; width: 100% !important;" data-id="${t.id}">
                <div class="expense-info t-info">
                    <h4>${t.description}</h4> <!-- FIXED: Added the description so you can see it! -->
                    <div class="expense-meta">
                        <small class="category-badge">${t.category} • ${formatDate(t.date)}</small>
                    </div>
                </div>
                <div style="display:flex; align-items:center;">
                    <div class="expense-amount t-amount ${isIncome ? 'income' : 'expense'}">${sign}₹${t.amount.toFixed(2)}</div>
                    <div class="expense-actions" style="margin-left: 10px;">
                        <button class="edit-btn" style="background:none; border:none; cursor:pointer;" data-id="${t.id}"><i class="fas fa-pen"></i></button>
                        <button class="delete-btn" style="background:none; border:none; cursor:pointer; color: red;" data-id="${t.id}"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            </div>
        `;
    });

    expensesList.innerHTML = html;

    // Event Listeners for edit/delete
    expensesList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if(confirm('Delete this transaction?')){
                transactions = transactions.filter(t => t.id !== id);
                saveData();
                if (editingId === id) editingId = null;
                renderAll();
            }
        });
    });

    expensesList.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const t = transactions.find(tr => tr.id === id);
            if(t){
                editingId = id;
                descInput.value = t.description;
                amountInput.value = t.amount;
                categorySelect.value = t.category;
                
                // set radio
                document.querySelectorAll('input[name="type"]').forEach(r => {
                    r.checked = r.value === t.type;
                });

                addBtn.innerHTML = '<i class="fas fa-save"></i> Update';
                addBtn.style.background = '#f59e0b';
                
                // scroll to form
                document.querySelector('.add-form').scrollIntoView({behavior: 'smooth'});
            }
        });
    });
}

function formatDate(dateStr){
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}

// --------------------------------------------------
// Chart
// --------------------------------------------------
function renderChart(){
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return; // Failsafe if canvas is missing
    const ctx = canvas.getContext('2d');
    
    // aggregate expenses by category
    const expenses = transactions.filter(t => t.type === 'expense');
    const categoryMap = {};
    expenses.forEach(t => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoryMap);
    const data = Object.values(categoryMap);
    const colors = [
        '#6366f1', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b',
        '#ec4899', '#14b8a6', '#f97316', '#6b7280'
    ];

    if(chartInstance) chartInstance.destroy();

    if(labels.length === 0){
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{data: [1], backgroundColor: ['#e5e7eb']}]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {legend: {display: false}}, // FIXED: typo 'lagend'
                cutout: '70%',
            }
        });
        return;
    }

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins:{
                legend: { // FIXED: Was 'lagend'
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        font: {size: 11},
                        padding: 12,
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#1a1a2e'
                    }
                }
            },
            cutout: '65%',
        }
    });
}

// --------------------------------------------------
// ADD / UPDATE
// --------------------------------------------------
function handleAdd() {
    const desc = descInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;
    const type = document.querySelector('input[name="type"]:checked').value;

    if (!desc) { 
        alert('Please enter a description.'); 
        return; 
    }
    
    // FIXED: Removed the "!" before isNaN. It was doing the reverse of what it should!
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount.');
        return;
    }
    
    if(editingId){
        // update
        const idx = transactions.findIndex(t => t.id === editingId);
        if(idx !== -1){
            transactions[idx].description = desc;
            transactions[idx].amount = amount;
            transactions[idx].category = category;
            transactions[idx].type = type;
            transactions[idx].updated = new Date().toISOString();
        }
        editingId = null;
        addBtn.innerHTML = '<i class="fas fa-plus"></i> Add';
        addBtn.style.background = '';
    } else {
        // new
        const newT ={
            id: generateId(),
            description: desc,
            amount: amount,
            category: category,
            type: type,
            date: new Date().toISOString(),
            created: new Date().toISOString()
        };
        transactions.push(newT);
    }

    saveData();
    clearForm();
    renderAll(); // FIXED: Added this so the screen actually refreshes after adding!
}

function clearForm(){
    descInput.value = '';
    amountInput.value = '';
    categorySelect.value = 'Food';
    document.querySelector('input[name="type"][value="expense"]').checked = true;
    editingId = null;
    addBtn.innerHTML = '<i class="fas fa-plus"></i> Add';
    addBtn.style.background = '';
}

//
// clear All ---------
// -------------------
function clearAll(){
    if(transactions.length === 0) return;
    if(confirm('Delete all transactions ? This cannot be undone.')){
        transactions = [];
        saveData();
        renderAll();
    }
}

// --------------------------------------------------
// Theme
// --------------------------------------------------
let darkMode = false;
themeToggle.addEventListener('click', () => {
    darkMode = !darkMode;
    // FIXED: Target the body element for the dark theme so your CSS can read it properly
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');

    themeIcon.className = darkMode ? 'fas fa-sun' : 'fas fa-moon';
    renderChart();
});

// --------------------------------------------------
// Event Listeners
// --------------------------------------------------
addBtn.addEventListener('click', handleAdd);
document.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && e.target.closest('.add-form')){
        handleAdd();
    }
});

clearAllBtn.addEventListener('click', clearAll);
filterCategory.addEventListener('change', renderList);
filterType.addEventListener('change', renderList);

// --------------------------------------------------
// INIT
// --------------------------------------------------
loadData();
renderAll();

//set default category on load
categorySelect.value = 'Food';
