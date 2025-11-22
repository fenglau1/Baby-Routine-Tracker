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
        // Event Listeners
        document.getElementById('view-all-history-btn').onclick = () => {
            this.openModal('history-view');
            UI.renderFullHistory('milk');
        };

        document.getElementById('view-charts-btn').onclick = () => {
            this.openModal('charts-view');
            setTimeout(() => Charts.render(), 100); // Delay for canvas to be visible
        };

        document.getElementById('photo-upload').onchange = (e) => {
            this.handlePhotoUpload(e.target.files[0]);
        };

        // Photo Upload - handled via label and inline onchange

        // Check if we need to onboard a new user is now handled in Auth.js after login/sync
        // if (Store.state.babies.length === 0) {
        //     this.addNewBaby();
        //     // Force creation: Hide close button
        //     document.getElementById('create-baby-close-btn').style.display = 'none';
        //     document.querySelector('#create-baby-modal h3').textContent = 'Welcome! Add a Baby';
        // }
    },

    checkNotifications() {
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") {
            Notification.requestPermission();
        }
        const upcoming = Store.getUpcomingAppointments(7);
        if (upcoming.length > 0 && Notification.permission === "granted") {
            upcoming.forEach(appt => {
                new Notification(`Upcoming Appointment: ${appt.title}`, {
                    body: `${new Date(appt.date).toLocaleString()} - ${appt.notes || ''}`
                });
            });
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

        if (id === 'health-view') {
            UI.renderHealthSection();
        }

        if (id === 'charts-view') {
            setTimeout(() => Charts.render(), 300);
        }

        if (id === 'growth-modal') {
            UI.renderGrowthHistory();
            setTimeout(() => Charts.renderGrowthCharts(), 300);
        }
    },

    closeModal(id) {
        document.getElementById(id).classList.add('hidden');
    },

    openBabySwitcher() {
        this.openModal('switch-baby-modal');
        UI.renderBabySwitcher();

        // Ensure UI is correct (might have been changed by onboarding)
        if (Store.state.babies.length > 0) {
            document.getElementById('switch-baby-close-btn').style.display = 'block';
            document.querySelector('#switch-baby-modal h3').textContent = 'Switch Baby';
        }
    },

    selectBaby(id) {
        Store.setCurrentBaby(id);
        UI.renderBabyProfile();
        UI.renderRecentHistory();
        this.closeModal('switch-baby-modal');
    },

    addNewBaby() {
        // Reset fields
        document.getElementById('create-name').value = '';
        document.getElementById('create-dob').value = new Date().toISOString().split('T')[0];
        document.getElementById('create-gender').value = 'Boy';
        document.getElementById('create-weight').value = '';
        document.getElementById('create-height').value = '';

        this.openModal('create-baby-modal');

        // Ensure close button is visible for normal add
        document.getElementById('create-baby-close-btn').style.display = 'block';
        document.querySelector('#create-baby-modal h3').textContent = 'Add New Baby';
    },

    saveNewBaby() {
        const name = document.getElementById('create-name').value;
        if (!name) {
            alert("Please enter a name.");
            return;
        }

        const newBaby = {
            id: crypto.randomUUID(),
            name: name,
            dob: new Date(document.getElementById('create-dob').value),
            gender: document.getElementById('create-gender').value,
            currentWeight: parseFloat(document.getElementById('create-weight').value) || 3.5,
            currentHeight: parseFloat(document.getElementById('create-height').value) || 50,
            profileImage: null,
            milkRecords: [],
            foodRecords: [],
            poopRecords: [],
            vaccines: [],
            appointments: [],
            measurements: []
        };

        Store.state.babies.push(newBaby);
        Store.setCurrentBaby(newBaby.id);

        UI.renderBabyProfile();
        UI.renderBabySwitcher();
        this.closeModal('create-baby-modal');
        this.closeModal('switch-baby-modal'); // Close switcher if open

        // If we were in forced creation mode, we are safe now
        document.getElementById('baby-profile-card').classList.remove('hidden');
    },

    handlePhotoUpload(file) {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert("Please select an image file.");
            return;
        }

        // Validate file size (max 2MB to avoid localStorage quota issues)
        if (file.size > 2 * 1024 * 1024) {
            alert("Image is too large. Please choose an image under 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const base64 = e.target.result;
                Store.updateBaby({ profileImage: base64 });
                UI.renderBabyProfile();
            } catch (err) {
                console.error("Storage failed", err);
                alert("Failed to save image. It might be too large for local storage.");
            }
        };
        reader.onerror = (err) => {
            console.error("Error reading file:", err);
            alert("Failed to read file.");
        };
        reader.readAsDataURL(file);
    },

    deleteCurrentBaby() {
        if (confirm("Are you sure you want to delete this baby profile? This cannot be undone.")) {
            Store.deleteBaby(Store.state.currentBabyId);

            if (Store.state.babies.length === 0) {
                // Force creation
                this.addNewBaby();
                document.getElementById('create-baby-close-btn').style.display = 'none';
                document.querySelector('#create-baby-modal h3').textContent = 'Welcome! Add a Baby';
                document.getElementById('baby-profile-card').classList.add('hidden');
            } else {
                UI.renderBabyProfile();
                UI.renderBabySwitcher();
            }
            this.closeModal('edit-profile-modal');
        }
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
        UI.renderBabySwitcher();
        this.closeModal('edit-profile-modal');
    },

    saveHealthRecord() {
        this.closeModal('add-health-modal');
        UI.renderHealthSection(type === 'appointment' ? 'appointments' : 'vaccines');

        // Refresh charts view if open, or just the list
        const healthList = document.getElementById('health-list');
        if (healthList) {
            // If we are in the charts view, refresh the list
            // But wait, renderHealthSection does that.
        }
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
        this.openModal('share-access-modal');
    },

    sendInvite() {
        const email = document.getElementById('share-email').value;
        if (!email) {
            alert("Please enter an email address.");
            return;
        }
        Store.shareBaby(email).then(() => {
            this.closeModal('share-access-modal');
            document.getElementById('share-email').value = ''; // Reset
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
    window.app = app; // Ensure global access
    app.init();
});
