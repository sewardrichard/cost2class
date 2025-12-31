// Data structure
let budgetData = {
    fees: [],
    uniforms: [],
    stationery: [],
    adminTasks: [],
}

let currentFilters = {
    fees: "all",
    uniforms: "all",
    stationery: "all"
}

// Chart instance
let budgetChart = null

// --- INITIALIZATION ---
loadData()

function loadData() {
    const saved = localStorage.getItem("cost2class-data")
    if (saved) {
        budgetData = JSON.parse(saved)
    }
    updateUI()
}

function saveData() {
    localStorage.setItem("cost2class-data", JSON.stringify(budgetData))
    updateUI()
}

// --- NAVIGATION ---
document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const page = btn.dataset.page

        // Active states
        document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"))
        btn.classList.add("active")

        document.querySelectorAll(".page").forEach((p) => {
            p.classList.remove("active")
            p.classList.add("hidden") // Helper class for display:none
        })

        const activePage = document.getElementById(`${page}-page`)
        activePage.classList.remove("hidden")
        setTimeout(() => activePage.classList.add("active"), 10) // Small delay for fade-in
    })
})

// --- FILTER TABS ---
document.querySelectorAll(".pill-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
        const category = tab.dataset.category
        const filter = tab.dataset.filter

        document.querySelectorAll(`.pill-tab[data-category="${category}"]`).forEach((t) => t.classList.remove("active"))
        tab.classList.add("active")

        currentFilters[category] = filter
        renderItems(category, filter)
    })
})


// --- DATA LOGIC ---
function calculateCategoryTotals(category) {
    const items = budgetData[category]
    let spent = 0
    let budget = 0

    items.forEach((item) => {
        const itemBudget = Number.parseFloat(item.budget) || 0
        budget += itemBudget

        if (item.completed) {
            if (category === "fees") {
                let annualPrice = Number.parseFloat(item.price) || 0
                if (item.period === "monthly") annualPrice *= 12
                else if (item.period === "termly") annualPrice *= 4
                spent += annualPrice
            } else {
                const quantity = Number.parseInt(item.quantity) || 1
                const price = Number.parseFloat(item.price) || 0
                spent += quantity * price
            }
        }
    })

    return { spent, budget, remaining: budget - spent }
}

// --- RENDERING ---
function renderItems(category, filter = "all", searchQuery = "") {
    const listEl = document.getElementById(`${category}-list`)
    const items = budgetData[category]

    let filteredItems = items
    if (filter === "pending") filteredItems = items.filter((item) => !item.completed)
    else if (filter === "completed") filteredItems = items.filter((item) => item.completed)

    if (searchQuery) {
        filteredItems = filteredItems.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }

    if (filteredItems.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-tertiary);">No items found</div>`
        return
    }

    listEl.innerHTML = filteredItems.map((item) => {
        const originalIndex = items.indexOf(item)
        let displayPrice = Number.parseFloat(item.price) || 0
        let detailText = ""

        if (category === "fees") {
            detailText = item.period ? item.period.charAt(0).toUpperCase() + item.period.slice(1) : "Once-off"
            if (item.period === "monthly") displayPrice *= 12
            else if (item.period === "termly") displayPrice *= 4
        } else {
            const qty = item.quantity || 1
            detailText = `Qty: ${qty}`
            displayPrice *= qty
        }

        return `
        <div class="item-card" onclick="editItem('${category}', ${originalIndex})">
            <div class="item-main">
                <div class="item-title">${item.name}</div>
                <div class="item-sub">${detailText}</div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
                <div class="item-price">R${displayPrice.toFixed(2)}</div>
                <div class="status-check ${item.completed ? 'completed' : ''}" 
                     onclick="event.stopPropagation(); toggleItemComplete('${category}', ${originalIndex})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            </div>
        </div>
        `
    }).join("")

    // Update Totals Logic
    const totals = calculateCategoryTotals(category)
}

function renderAdminTasks(searchQuery = "") {
    const listEl = document.getElementById("admin-list")
    let tasks = budgetData.adminTasks

    if (searchQuery) tasks = tasks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))

    // Sort by Date
    tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))

    listEl.innerHTML = tasks.length ? tasks.map((task) => {
        const originalIndex = budgetData.adminTasks.indexOf(task)
        const dateStr = new Date(task.deadline).toLocaleDateString()
        const isCompleted = task.completed

        return `
        <div class="item-card" onclick="editTask(${originalIndex})">
             <div class="item-main">
                <div class="item-title" style="${isCompleted ? 'text-decoration: line-through; color: var(--text-tertiary);' : ''}">${task.name}</div>
                <div class="item-sub">${dateStr}</div>
            </div>
            <div class="status-check ${isCompleted ? 'completed' : ''}" 
                 onclick="event.stopPropagation(); toggleTaskComplete(${originalIndex})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
        </div>
        `
    }).join("") : `<div style="text-align:center; padding: 40px; color: var(--text-tertiary);">No tasks</div>`

    document.getElementById("admin-count-tab").textContent = budgetData.adminTasks.filter(t => !t.completed).length
}

// --- CHART & DASHBOARD ---
function drawPieChart() {
    const canvas = document.getElementById("budgetChart")
    if (!canvas) return
    const ctx = canvas.getContext("2d")

    const fees = calculateCategoryTotals("fees").budget
    const uniforms = calculateCategoryTotals("uniforms").budget
    const stationery = calculateCategoryTotals("stationery").budget
    const total = fees + uniforms + stationery

    if (budgetChart) budgetChart.destroy()

    if (total === 0) {
        // Empty state chart
        budgetChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ["Empty"],
                datasets: [{ data: [1], backgroundColor: ["#E5E7EB"], borderWidth: 0 }]
            },
            options: { cutout: '75%', plugins: { legend: false, tooltip: false } }
        })
        document.getElementById("chartLegend").innerHTML = `<div style="font-size:13px; color:var(--text-tertiary);">No data yet</div>`
        return
    }

    budgetChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ["Fees", "Uniforms", "Stationery"],
            datasets: [{
                data: [fees, uniforms, stationery],
                backgroundColor: ["#7C3AED", "#DB2777", "#EA580C"],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            cutout: '75%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    titleColor: '#1A1C1E',
                    bodyColor: '#1A1C1E',
                    borderColor: 'rgba(0,0,0,0.05)',
                    borderWidth: 1,
                    displayColors: true,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (c) => ` R${c.parsed.toFixed(0)}`
                    }
                }
            }
        }
    })

    // Custom Pucks Legend
    document.getElementById("chartLegend").innerHTML = [
        { l: "Fees", c: "#7C3AED", v: fees },
        { l: "Uniforms", c: "#DB2777", v: uniforms },
        { l: "Stationery", c: "#EA580C", v: stationery }
    ].map(i => `
        <div style="display:flex; align-items:center; gap:6px;">
            <div style="width:8px; height:8px; border-radius:50%; background:${i.c};"></div>
            <span style="font-size:12px; font-weight:600; color:var(--text-secondary);">${i.l}</span>
        </div>
    `).join("")
}

function updateUI() {
    const feesT = calculateCategoryTotals("fees")
    const uniformsT = calculateCategoryTotals("uniforms")
    const stationeryT = calculateCategoryTotals("stationery")

    document.getElementById("fees-total").textContent = `R${feesT.budget.toFixed(0)}`
    document.getElementById("uniforms-total").textContent = `R${uniformsT.budget.toFixed(0)}`
    document.getElementById("stationery-total").textContent = `R${stationeryT.budget.toFixed(0)}`

    const adminCount = budgetData.adminTasks.filter(t => !t.completed).length
    document.getElementById("admin-count").textContent = adminCount

    const grandTotalBudget = feesT.budget + uniformsT.budget + stationeryT.budget
    const grandTotalSpent = feesT.spent + uniformsT.spent + stationeryT.spent

    document.getElementById("total-spent").textContent = `R${grandTotalSpent.toFixed(2)}`
    document.getElementById("total-remaining").textContent = `R${(grandTotalBudget - grandTotalSpent).toFixed(2)}`

    renderItems("fees", currentFilters.fees)
    renderItems("uniforms", currentFilters.uniforms)
    renderItems("stationery", currentFilters.stationery)
    renderAdminTasks()
    drawPieChart()
}

// --- BOTTOM SHEETS (MODAL REPLACEMENT) ---
function openAddModal(category) {
    document.getElementById("bottomSheetOverlay").classList.add("active")
    document.getElementById("itemSheet").classList.add("active")

    document.getElementById("modalTitle").textContent = "Add Item"
    document.getElementById("itemForm").reset()
    document.getElementById("itemId").value = ""
    document.getElementById("itemCategory").value = category

    if (category === "fees") {
        document.getElementById("periodGroup").style.display = "block"
        document.getElementById("quantityGroup").style.display = "none"
    } else {
        document.getElementById("periodGroup").style.display = "none"
        document.getElementById("quantityGroup").style.display = "block"
    }
}

function openTaskModal() {
    document.getElementById("bottomSheetOverlay").classList.add("active")
    document.getElementById("taskSheet").classList.add("active")
    document.getElementById("taskForm").reset()
    document.getElementById("taskId").value = ""
}

function closeModal() {
    document.getElementById("bottomSheetOverlay").classList.remove("active")
    document.querySelectorAll(".bottom-sheet").forEach(s => s.classList.remove("active"))
}

// EDIT
function editItem(category, index) {
    const item = budgetData[category][index]
    openAddModal(category)
    document.getElementById("modalTitle").textContent = "Edit Item"
    document.getElementById("itemId").value = index
    document.getElementById("itemName").value = item.name
    document.getElementById("itemPrice").value = item.price
    document.getElementById("itemBudget").value = item.budget

    if (category === "fees") document.getElementById("itemPeriod").value = item.period || "once-off"
    else document.getElementById("itemQuantity").value = item.quantity || 1
}

function editTask(index) {
    const task = budgetData.adminTasks[index]
    openTaskModal()
    document.getElementById("taskId").value = index
    document.getElementById("taskName").value = task.name
    document.getElementById("taskDeadline").value = task.deadline
}

// FORM SUBMITS
document.getElementById("itemForm").addEventListener("submit", (e) => {
    e.preventDefault()
    const category = document.getElementById("itemCategory").value
    const id = document.getElementById("itemId").value

    const item = {
        name: document.getElementById("itemName").value,
        price: parseFloat(document.getElementById("itemPrice").value),
        budget: parseFloat(document.getElementById("itemBudget").value),
        completed: id !== "" ? budgetData[category][id].completed : false // preserve status
    }

    if (category === "fees") item.period = document.getElementById("itemPeriod").value
    else item.quantity = parseInt(document.getElementById("itemQuantity").value)

    if (id === "") budgetData[category].push(item)
    else budgetData[category][id] = Object.assign(budgetData[category][id], item)

    saveData()
    closeModal()
})

document.getElementById("taskForm").addEventListener("submit", (e) => {
    e.preventDefault()
    const id = document.getElementById("taskId").value
    const task = {
        name: document.getElementById("taskName").value,
        deadline: document.getElementById("taskDeadline").value,
        completed: id !== "" ? budgetData.adminTasks[id].completed : false
    }

    if (id === "") budgetData.adminTasks.push(task)
    else budgetData.adminTasks[id] = task

    saveData()
    closeModal()
})

// ACTIONS
function toggleItemComplete(category, index) {
    budgetData[category][index].completed = !budgetData[category][index].completed
    saveData()
}

function toggleTaskComplete(index) {
    budgetData.adminTasks[index].completed = !budgetData.adminTasks[index].completed
    saveData()
}

function clearAllData() {
    if (confirm("Reset everything?")) {
        budgetData = { fees: [], uniforms: [], stationery: [], adminTasks: [] }
        saveData()
    }
}

// --- CSV (Keep existing logic) ---
function exportToCSV(category) {
    let csv = ""
    const items = budgetData[category]
    if (category === "adminTasks") {
        csv = "Name,Deadline,Completed\n" + items.map(t => `${t.name},${t.deadline},${t.completed}`).join("\n")
    } else {
        const isFees = category === "fees"
        csv = (isFees ? "Name,Period,Price,Budget,Completed\n" : "Name,Quantity,Price,Budget,Completed\n") +
            items.map(i => `${i.name},${isFees ? i.period : i.quantity},${i.price},${i.budget},${i.completed}`).join("\n")
    }
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = `cost2class_${category}.csv`
    link.click()
}

function importCSV(category, file) {
    const reader = new FileReader()
    reader.onload = function (e) {
        const lines = e.target.result.split("\n").slice(1) // skip header
        const newItems = []

        lines.forEach(line => {
            if (!line.trim()) return
            const cols = line.split(",") // Simple split
            if (category === "adminTasks") {
                newItems.push({ name: cols[0], deadline: cols[1], completed: cols[2] === "true" })
            } else {
                newItems.push({
                    name: cols[0],
                    [category === "fees" ? "period" : "quantity"]: category === "fees" ? cols[1] : parseInt(cols[1]),
                    price: parseFloat(cols[2]),
                    budget: parseFloat(cols[3]),
                    completed: cols[4] === "true"
                })
            }
        })

        budgetData[category].push(...newItems)
        saveData()
        alert(`Imported ${newItems.length} items`)
    }
    reader.readAsText(file) // IMPORTANT: Actual read call
}
