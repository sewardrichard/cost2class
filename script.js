// Data structure
// Data structure
// Budget attribute removed, using calculated values
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

// GitHub Sync Config
const GH_CONFIG_KEY = "cost2class-gh-config"
let ghConfig = {
    username: "",
    repo: "",
    token: ""
}

// Chart instance
let budgetChart = null

// --- GITHUB API CLASS ---
class GitHubAPI {
    constructor() {
        this.loadConfig()
    }

    loadConfig() {
        const saved = localStorage.getItem(GH_CONFIG_KEY)
        if (saved) ghConfig = JSON.parse(saved)
    }

    saveConfig(username, repo, token) {
        ghConfig = { username, repo, token }
        localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(ghConfig))
    }

    get headers() {
        return {
            "Authorization": `Bearer ${ghConfig.token}`,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
        }
    }

    get fileUrl() {
        return `https://api.github.com/repos/${ghConfig.username}/${ghConfig.repo}/contents/data.json`
    }

    async fetchFile() {
        if (!ghConfig.token) return null

        try {
            const response = await fetch(this.fileUrl, { headers: this.headers })
            if (!response.ok) throw new Error("Fetch failed")

            const data = await response.json()
            const content = atob(data.content) // Decode Base64
            const sha = data.sha

            return { content: JSON.parse(content), sha }
        } catch (error) {
            console.error("GitHub Fetch Error:", error)
            return null
        }
    }

    async saveFile(content, sha) {
        if (!ghConfig.token) return

        // If we don't have a SHA, we must fetch it first
        let currentSha = sha
        if (!currentSha) {
            const currentFile = await this.fetchFile()
            if (currentFile) currentSha = currentFile.sha
        }

        try {
            const response = await fetch(this.fileUrl, {
                method: "PUT",
                headers: this.headers,
                body: JSON.stringify({
                    message: "Update budget data via Cost2Class App",
                    content: btoa(JSON.stringify(content, null, 2)), // Encode Base64
                    sha: currentSha
                })
            })

            if (response.ok) {
                const data = await response.json()
                showToast("Synced to GitHub", "success")
                return data.content.sha // Return new SHA
            } else {
                throw new Error("Save failed")
            }
        } catch (error) {
            console.error("GitHub Save Error:", error)
            showToast("Sync Failed", "error")
        }
    }
}

const ghApi = new GitHubAPI()


// --- INITIALIZATION ---
async function loadData() {
    // 1. Try Local First (Instant)
    const local = localStorage.getItem("cost2class-data")
    if (local) {
        budgetData = JSON.parse(local)
        updateUI()
    }

    // 2. Try GitHub Sync (Background)
    if (ghConfig.token) {
        showToast("Syncing...", "info")
        const remote = await ghApi.fetchFile()
        if (remote) {
            budgetData = remote.content
            localStorage.setItem("cost2class-data", JSON.stringify(budgetData))
            updateUI()
            showToast("Updated from Cloud", "success")
        }
    }
}

function saveData() {
    // 1. Save Local
    localStorage.setItem("cost2class-data", JSON.stringify(budgetData))
    updateUI()

    // 2. Save Remote (Debounced slightly ideally, but direct for now)
    if (ghConfig.token) {
        ghApi.saveFile(budgetData)
    }
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
        let itemBudget = 0
        if (category === "fees") {
            let annualPrice = Number.parseFloat(item.price) || 0
            if (item.period === "monthly") annualPrice *= 12
            else if (item.period === "termly") annualPrice *= 4
            itemBudget = annualPrice
        } else {
            const quantity = Number.parseInt(item.quantity) || 1
            const price = Number.parseFloat(item.price) || 0
            itemBudget = quantity * price
        }

        budget += itemBudget

        if (item.completed) {
            spent += itemBudget
        }
    })

    return { spent, budget, remaining: budget - spent }
}

// --- RENDERING ---
function renderItems(category, filter = "all") {
    const listEl = document.getElementById(`${category}-list`)
    const items = budgetData[category]

    let filteredItems = items
    if (filter === "pending") filteredItems = items.filter((item) => !item.completed)
    else if (filter === "completed") filteredItems = items.filter((item) => item.completed)



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
    calculateCategoryTotals(category) // Recalculate if needed
}

function renderAdminTasks() {
    const listEl = document.getElementById("admin-list")
    let tasks = budgetData.adminTasks

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

    const adminCount = budgetData.adminTasks.filter(t => !t.completed).length
    const badge = document.getElementById("admin-count-tab")
    if (badge) badge.textContent = adminCount
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

    document.getElementById("total-spent").textContent = `R${grandTotalSpent.toFixed(2)} `
    document.getElementById("total-remaining").textContent = `R${(grandTotalBudget - grandTotalSpent).toFixed(2)} `

    renderItems("fees", currentFilters.fees)
    renderItems("uniforms", currentFilters.uniforms)
    renderItems("stationery", currentFilters.stationery)
    renderAdminTasks()
    drawPieChart()
}

// --- BOTTOM SHEETS ---
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

    // Hide Delete Button by default (Add Mode)
    document.getElementById("btn-delete").style.display = "none"
}

function openTaskModal() {
    document.getElementById("bottomSheetOverlay").classList.add("active")
    document.getElementById("taskSheet").classList.add("active")
    document.getElementById("taskForm").reset()
    document.getElementById("taskId").value = ""
}

function openSyncModal() {
    document.getElementById("bottomSheetOverlay").classList.add("active")
    document.getElementById("syncSheet").classList.add("active")

    // Pre-fill
    document.getElementById("ghUsername").value = ghConfig.username || ""
    document.getElementById("ghRepo").value = ghConfig.repo || ""
    document.getElementById("ghToken").value = ghConfig.token || ""
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
    // Budget field removed

    if (category === "fees") document.getElementById("itemPeriod").value = item.period || "once-off"
    else document.getElementById("itemQuantity").value = item.quantity || 1

    // Show Delete Button (Edit Mode)
    document.getElementById("btn-delete").style.display = "flex"
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
        completed: id !== "" ? budgetData[category][id].completed : false, // preserve status
        [category === "fees" ? "period" : "quantity"]: category === "fees" ? document.getElementById("itemPeriod").value : parseInt(document.getElementById("itemQuantity").value)
    }

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

// SYNC FORM SUBMIT
document.getElementById("syncForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    const user = document.getElementById("ghUsername").value
    const repo = document.getElementById("ghRepo").value
    const token = document.getElementById("ghToken").value

    ghApi.saveConfig(user, repo, token)

    const statusEl = document.getElementById("syncStatus")
    statusEl.textContent = "Testing connection..."
    statusEl.style.color = "var(--text-secondary)"

    const result = await ghApi.fetchFile()
    if (result) {
        statusEl.textContent = "Connection Successful! Syncing..."
        statusEl.style.color = "var(--color-success)"
        // Initial Fetch
        loadData()
        setTimeout(() => closeModal(), 1500)
    } else {
        statusEl.textContent = "Connection Failed. Check details."
        statusEl.style.color = "var(--color-danger)"
    }
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

function deleteItem() {
    const category = document.getElementById("itemCategory").value
    const id = document.getElementById("itemId").value

    if (id !== "" && confirm("Delete this item?")) {
        budgetData[category].splice(id, 1) // Remove item
        saveData()
        closeModal()
    }
}

function clearAllData() {
    if (confirm("Reset everything?")) {
        budgetData = { fees: [], uniforms: [], stationery: [], adminTasks: [] }
        saveData()
    }
}

// TOAST
function showToast(message, type = "info") {
    // Basic toast, could be enhanced with styling
    const toast = document.createElement("div")
    toast.style.position = "fixed"
    toast.style.bottom = "100px"
    toast.style.left = "50%"
    toast.style.transform = "translateX(-50%)"
    toast.style.background = "rgba(0,0,0,0.8)"
    toast.style.color = "white"
    toast.style.padding = "10px 20px"
    toast.style.borderRadius = "20px"
    toast.style.fontSize = "14px"
    toast.style.zIndex = "200"
    toast.style.animation = "fadeIn 0.3s ease"
    toast.textContent = message

    if (type === "success") toast.style.borderBottom = "3px solid var(--color-success)"
    if (type === "error") toast.style.borderBottom = "3px solid var(--color-danger)"

    document.body.appendChild(toast)
    setTimeout(() => {
        toast.style.opacity = "0"
        setTimeout(() => toast.remove(), 300)
    }, 2000)
}

// START
loadData()
