import { fetchData, saveData } from './api.js';
import { render } from './ui.js';

let state = {
    currentTab: 'overview',
    filterStatus: 'all',
    data: {
        uniform: [],
        stationery: [],
        admin: [],
        fees: []
    }
};

const init = async () => {
    const data = await fetchData();
    if (data) state.data = data;

    setupEventListeners();
    updateUI();
};

const setupEventListeners = () => {
    // Tab switching
    document.querySelectorAll('nav button').forEach(btn => {
        btn.onclick = (e) => {
            const tabId = e.target.id.replace('tab-', '');
            switchTab(tabId);
        };
    });

    // Global click listener for actions
    document.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        const id = parseInt(e.target.dataset.id);

        if (action === 'toggle') {
            const item = state.data[state.currentTab].find(i => i.id === id);
            if (item) {
                item.checked = !item.checked;
                await commitChange();
            }
        } else if (action === 'delete') {
            state.data[state.currentTab] = state.data[state.currentTab].filter(i => i.id !== id);
            await commitChange();
        } else if (e.target.id === 'add-item-btn' || e.target.closest('#add-task-btn')) {
            addNewItem();
        }
    });

    // Global change listener for inputs and filters
    document.addEventListener('change', async (e) => {
        const field = e.target.dataset.field;
        const id = parseInt(e.target.dataset.id);

        if (field && id) {
            const item = state.data[state.currentTab].find(i => i.id === id);
            if (item) {
                item[field] = (field === 'price' || field === 'qty') ? (parseFloat(e.target.value) || 0) : e.target.value;
                await commitChange();
            }
        }

        if (e.target.id === 'completion-filter') {
            state.filterStatus = e.target.value;
            updateUI();
        }
    });

    // Handle "typing" state to hide footers
    document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            document.body.classList.add('is-typing');
        }
    });

    document.addEventListener('focusout', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            document.body.classList.remove('is-typing');
        }
    });
};

const switchTab = (tab) => {
    state.currentTab = tab;
    state.filterStatus = 'all'; // Reset filter when switching tabs

    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('tab-active'));
    document.getElementById(`tab-${tab}`).classList.add('tab-active');

    updateUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const addNewItem = async () => {
    state.data[state.currentTab].push({
        id: Date.now(),
        name: '',
        shop: '',
        qty: 1,
        price: 0,
        frequency: 'Once-off',
        dueDate: '',
        checked: false
    });
    await commitChange();
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
};

const commitChange = async () => {
    await saveData(state.data);
    updateUI();
};

const updateUI = () => {
    render(state.currentTab, state.data, state.filterStatus);
};

// Start the app
init();
