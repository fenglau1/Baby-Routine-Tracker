/**
 * App.js
 * Main controller.
 */

const app = {
    init() {
        Store.init();
        UI.init();
        Auth.init();
        this.checkNotifications();

        // Event Listeners
        document.getElementById('view-all-history-btn').onclick = () => {
            this.openModal('history-view');
            UI.renderFullHistory('milk');
        };

        document.getElementById('view-charts-btn').onclick = () => {
            this.openModal('charts-view');
            Charts.render();
        };

        // document.getElementById('add-baby-btn').onclick = ... (Removed, handled by openBabySwitcher)
    },

    checkNotifications() {
        if (!("Notification" in window)) return;

        if (Notification.permission !== "granted") {
            Notification.requestPermission();
        }

        const upcoming = Store.getUpcomingAppointments(7);
        if (upcoming.length > 0) {
            // Simple alert for MVP, or proper notification
            if (Notification.permission === "granted") {
                upcoming.forEach(appt => {
                    new Notification(`Upcoming Appointment: ${appt.title}`, {
                        body: `${new Date(appt.date).toLocaleString()} - ${appt.notes || ''}`
                    });
                });
            } else {
                // Fallback in-app alert
                // alert(`You have ${upcoming.length} upcoming appointments!`);
            }
        }
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
        UI.setupInputs();

        // Specific init logic for modals
        if (id === 'health-modal') UI.renderHealthSection();
        if (id === 'growth-modal') {
            UI.renderGrowthHistory();
            setTimeout(() => Charts.renderGrowthCharts(), 100); // Delay for canvas render
        }
    },

    closeModal(id) {
        document.getElementById(id).classList.add('hidden');
    },

    openBabySwitcher() {
        this.openModal('switch-baby-modal');
        UI.renderBabySwitcher();
    },

    selectBaby(id) {
        Store.setCurrentBaby(id);
        UI.renderBabyProfile();
        UI.renderRecentHistory();
        this.closeModal('switch-baby-modal');
    },

    addNewBaby() {
        const name = prompt("Enter baby's name:");
        if (name) {
            Store.createDefaultBaby();
            const baby = Store.getCurrentBaby();
            baby.name = name;
            Store.save();
            UI.renderBabyProfile();
            UI.renderRecentHistory();
            this.closeModal('switch-baby-modal');
            alert(`Baby "${name}" added!`);
        }
    },

    // Actions
    saveMilk() {
        const record = {
            timestamp: document.getElementById('milk-time').value,
            amountML: parseFloat(document.getElementById('milk-amount').value),
            type: document.getElementById('milk-type').value
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

    saveProfileUpdates() {
        const updates = {
            name: document.getElementById('edit-name').value,
            dob: new Date(document.getElementById('edit-dob').value),
            gender: document.getElementById('edit-gender').value,
            currentWeight: parseFloat(document.getElementById('edit-weight').value),
            currentHeight: parseFloat(document.getElementById('edit-height').value)
        };
        Store.updateBaby(updates);
        UI.renderBabyProfile();
        UI.renderBabySwitcher(); // Update name in switcher
        this.closeModal('edit-profile-modal');
    },

    saveHealthRecord() {
        const type = document.getElementById('health-type').value;
        const record = {
            title: document.getElementById('health-title').value,
            notes: document.getElementById('health-notes').value
        };

        if (type === 'appointment') {
            record.date = document.getElementById('health-date').value;
        } else {
            record.dateAdministered = document.getElementById('health-date').value;
            record.dose = document.getElementById('vaccine-dose').value;
        }

        Store.addHealthRecord(type, record);
        this.closeModal('add-health-modal');
        UI.renderHealthSection(type === 'appointment' ? 'appointments' : 'vaccines');
    },

    saveGrowthRecord() {
        const record = {
            date: document.getElementById('growth-date').value,
            weight: parseFloat(document.getElementById('growth-weight').value),
            height: parseFloat(document.getElementById('growth-height').value)
        };
        Store.addMeasurement(record);
        this.closeModal('add-growth-modal');
        UI.renderGrowthHistory();
        Charts.renderGrowthCharts();
        UI.renderBabyProfile(); // Update current stats card
    },

    // Settings
    toggleDarkMode() {
        Store.toggleDarkMode();
        UI.renderBabyProfile();
    },

    toggleUnits() {
        Store.toggleUnits();
        UI.renderBabyProfile();
    },

    exportData(type) {
        if (type === 'json') {
            Store.exportJSON();
        } else if (type === 'excel') {
            this.exportToExcel();
        } else if (type === 'pdf') {
            this.exportToPDF();
        }
    },

    exportToExcel() {
        const baby = Store.getCurrentBaby();
        const wb = XLSX.utils.book_new();

        // Milk Sheet
        const milkData = baby.milkRecords.map(r => ({
            Date: new Date(r.timestamp).toLocaleString(),
            Type: r.type,
            Amount: r.amountML + ' ml'
        }));
        const wsMilk = XLSX.utils.json_to_sheet(milkData);
        XLSX.utils.book_append_sheet(wb, wsMilk, "Milk");

        // Food Sheet
        const foodData = baby.foodRecords.map(r => ({
            Date: new Date(r.timestamp).toLocaleString(),
            Meal: r.mealType,
            Item: r.foodItem,
            Mood: r.mood
        }));
        const wsFood = XLSX.utils.json_to_sheet(foodData);
        XLSX.utils.book_append_sheet(wb, wsFood, "Food");

        XLSX.writeFile(wb, `${baby.name}_Records.xlsx`);
    },

    exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const baby = Store.getCurrentBaby();

        doc.setFontSize(20);
        doc.text(`Report for ${baby.name}`, 10, 10);

        doc.setFontSize(12);
        doc.text(`DOB: ${new Date(baby.dob).toLocaleDateString()}`, 10, 20);
        doc.text(`Current Weight: ${baby.currentWeight} kg`, 10, 30);

        let y = 50;
        doc.setFontSize(16);
        doc.text("Recent Milk Records", 10, y);
        y += 10;
        doc.setFontSize(10);

        baby.milkRecords.slice(0, 20).forEach(r => {
            doc.text(`${new Date(r.timestamp).toLocaleString()} - ${r.type} - ${r.amountML}ml`, 10, y);
            y += 7;
            if (y > 280) { doc.addPage(); y = 10; }
        });

        doc.save(`${baby.name}_Report.pdf`);
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

    shareAccess() {
        const email = prompt("Enter the Google email address to share this baby profile with:");
        if (email) {
            Store.shareBaby(email);
        }
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
