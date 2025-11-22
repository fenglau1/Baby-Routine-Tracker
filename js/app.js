/**
 * App.js
 * Main controller.
 */

const app = {
    init() {
        Store.init();
        UI.init();
        Auth.init(); // Initialize Auth

        // Event Listeners
        document.getElementById('view-all-history-btn').onclick = () => {
            this.openModal('history-view');
            UI.renderFullHistory('milk');
        };

        document.getElementById('view-charts-btn').onclick = () => {
            this.openModal('charts-view');
            Charts.render();
        };

        // Add Baby button
        document.getElementById('add-baby-btn').onclick = () => {
            const name = prompt("Enter baby's name:");
            if (name) {
                Store.createDefaultBaby();
                const baby = Store.getCurrentBaby();
                baby.name = name;
                Store.save();
                UI.renderBabyProfile();
                alert(`Baby "${name}" added!`);
            }
        };

        // Menu button is now handled inline in HTML or we can add listener here if we removed onclick
        // document.getElementById('menu-btn').onclick = () => { this.toggleSidebar(); };
    },

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');

        if (sidebar.classList.contains('hidden')) {
            sidebar.classList.remove('hidden');
            backdrop.classList.remove('hidden');
        } else {
            sidebar.classList.add('hidden');
            backdrop.classList.add('hidden');
        }
    },

    openModal(id) {
        document.getElementById(id).classList.remove('hidden');
        UI.setupInputs(); // Reset times
    },

    closeModal(id) {
        document.getElementById(id).classList.add('hidden');
    },

    // Actions
    saveMilk() {
        const record = {
            timestamp: document.getElementById('milk-time').value,
            amountML: parseFloat(document.getElementById('milk-amount').value),
            type: document.getElementById('milk-type').value // 'Formula' or 'Breast Milk'
        };
        Store.addMilkRecord(record);
        this.closeModal('milk-modal');
        UI.renderRecentHistory();
    },

    saveFood() {
        const record = {
            timestamp: document.getElementById('food-time').value,
            mealType: document.getElementById('food-meal-type').value,
            foodItem: document.getElementById('food-item').value,
            mood: document.getElementById('food-mood').value,
            notes: ""
        };
        Store.addFoodRecord(record);
        this.closeModal('food-modal');
        UI.renderRecentHistory();
    },

    savePoop() {
        const record = {
            timestamp: document.getElementById('poop-time').value,
            color: document.getElementById('poop-color').value,
            notes: document.getElementById('poop-notes').value
        };
        Store.addPoopRecord(record);
        this.closeModal('poop-modal');
        UI.renderRecentHistory();
    },

    // Settings
    toggleDarkMode() {
        Store.toggleDarkMode();
        UI.renderBabyProfile(); // Re-renders to update UI state if needed
    },

    toggleUnits() {
        Store.toggleUnits();
        UI.renderBabyProfile();
    },

    exportData() {
        Store.exportJSON();
    },

    importData(input) {
        const file = input.files[0];
        if (!file) return;

        Store.importJSON(file).then(() => {
            alert('Data imported successfully!');
            UI.init();
            this.closeModal('settings-modal');
        }).catch(err => {
            alert('Failed to import: ' + err);
        });
    },

    deleteAllData() {
        if (confirm("Are you sure? This cannot be undone.")) {
            Store.deleteAllData();
            UI.init();
            this.closeModal('settings-modal');
        }
    }
};

// Start App
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
