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

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('visible');

            if (modalId === 'history-view') {
                // Default to milk or last used? Let's default to milk for now, or ensure tabs are set up.
                // Actually, let's just trigger a click on the active tab or default to first.
                const activeTab = document.querySelector('#history-view .tab-btn.active');
                if (activeTab) {
                    activeTab.click();
                } else {
                    // If no active tab, default to milk
                    UI.renderFullHistory('milk');
                }
            }

            if (modalId === 'health-view') {
                UI.renderHealthSection('appointments');
            }

            if (modalId === 'charts-view') {
                setTimeout(() => Charts.render(), 300);
            }

            if (modalId === 'growth-modal') {
                UI.renderGrowthHistory();
                setTimeout(() => Charts.renderGrowthCharts(), 300);
            }

            UI.setupInputs();

            if (modalId === 'edit-profile-modal') {
                const baby = Store.getCurrentBaby();
                if (baby) {
                    document.getElementById('edit-name').value = baby.name;
                    document.getElementById('edit-dob').value = baby.dob.toISOString().split('T')[0];
                    document.getElementById('edit-gender').value = baby.gender || 'Boy';
                    document.getElementById('edit-weight').value = baby.currentWeight;
                    document.getElementById('edit-height').value = baby.currentHeight;
                }
            }
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('visible');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    },

    async deleteAllData() {
        if (confirm("Are you sure you want to delete ALL data? This action is irreversible and will delete all baby profiles from the cloud.")) {
            await Store.deleteAllData();
            window.location.reload();
        }
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

        Store.addBaby(newBaby);

        UI.renderBabyProfile();
        UI.renderBabySwitcher();
        this.closeModal('create-baby-modal');
        this.closeModal('switch-baby-modal'); // Close switcher if open

        // If we were in forced creation mode, we are safe now
        document.getElementById('baby-profile-card').classList.remove('hidden');
    },

    handleProfileImageUpload(input) {
        if (input.files && input.files[0]) {
            this.handlePhotoUpload(input.files[0]);
        }
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
        const baby = Store.getCurrentBaby();
        const newWeight = parseFloat(document.getElementById('edit-weight').value);
        const newHeight = parseFloat(document.getElementById('edit-height').value);

        // Auto-record growth if changed
        if (newWeight !== baby.currentWeight || newHeight !== baby.currentHeight) {
            Store.addMeasurement({
                date: new Date().toISOString(),
                weight: newWeight,
                height: newHeight
            });
        }

        const updates = {
            name: document.getElementById('edit-name').value,
            dob: new Date(document.getElementById('edit-dob').value),
            gender: document.getElementById('edit-gender').value,
            currentWeight: newWeight,
            currentHeight: newHeight
        };
        Store.updateBaby(updates);
        UI.renderBabyProfile();
        UI.renderBabySwitcher();
        this.closeModal('edit-profile-modal');
    },

    saveMilk() {
        const record = {
            timestamp: document.getElementById('milk-time').value,
            type: document.getElementById('milk-type').value,
            amountML: parseInt(document.getElementById('milk-amount').value)
        };
        Store.addMilkRecord(record);
        this.closeModal('milk-modal');
        UI.renderRecentHistory();
        UI.renderFullHistory('milk');
    },

    saveFood() {
        const record = {
            timestamp: document.getElementById('food-time').value,
            mealType: document.getElementById('food-meal-type').value,
            foodItem: document.getElementById('food-item').value || 'Unknown',
            mood: document.getElementById('food-mood').value
        };
        Store.addFoodRecord(record);
        this.closeModal('food-modal');
        UI.renderRecentHistory();
        UI.renderFullHistory('food');
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
        UI.renderFullHistory('poop');
    },

    saveHealthRecord() {
        const type = document.getElementById('health-type').value;
        const record = {
            title: document.getElementById('health-title').value,
            notes: document.getElementById('health-notes').value
        };

        if (type === 'appointment') {
            record.date = document.getElementById('health-date').value || new Date().toISOString();
        } else {
            record.dateAdministered = document.getElementById('health-date').value || new Date().toISOString();
            record.dose = document.getElementById('vaccine-dose').value;
        }

        Store.addHealthRecord(type, record);
        this.closeModal('add-health-modal');
        UI.renderHealthSection(type === 'appointment' ? 'appointments' : 'vaccines');
    },

    saveTemperatureRecord() {
        const temp = parseFloat(document.getElementById('temp-value').value);
        if (!temp) {
            alert('Please enter a temperature');
            return;
        }

        const record = {
            temperature: temp,
            timestamp: document.getElementById('temp-time').value || new Date().toISOString(),
            notes: document.getElementById('temp-notes').value
        };

        Store.addTemperatureRecord(record);
        this.closeModal('temperature-modal');
        // We'll need to update UI to show this. For now, maybe just alert or refresh health?
        // Let's assume we'll add a 'temperature' tab to health section later or just show it.
        alert('Temperature saved!');
    },

    saveGrowthRecord() {
        const dateInput = document.getElementById('growth-date').value;
        const record = {
            date: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString(),
            weight: parseFloat(document.getElementById('growth-weight').value) || 0,
            height: parseFloat(document.getElementById('growth-height').value) || 0
        };

        if (record.weight === 0 && record.height === 0) {
            alert('Please enter weight or height');
            return;
        }

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

    quickUpdateStat(statType) {
        const baby = Store.getCurrentBaby();
        if (!baby) return;

        // Store the stat type for later use
        this.currentStatType = statType;

        // Update modal title and label
        const title = statType === 'weight' ? 'Update Weight' : 'Update Height';
        const label = statType === 'weight' ? 'Weight (kg)' : 'Height (cm)';
        const currentValue = statType === 'weight' ? baby.weight : baby.height;

        document.getElementById('quick-update-title').textContent = title;
        document.getElementById('quick-update-label').textContent = label;
        document.getElementById('quick-update-value').value = currentValue || '';

        this.openModal('quick-update-modal');
    },

    saveQuickUpdate() {
        const value = parseFloat(document.getElementById('quick-update-value').value);
        if (isNaN(value) || value <= 0) {
            alert('Please enter a valid value');
            return;
        }

        const baby = Store.getCurrentBaby();
        if (!baby) return;

        // Update the stat
        if (this.currentStatType === 'weight') {
            baby.weight = value;
        } else {
            baby.height = value;
        }

        // Add growth measurement record
        const measurement = {
            date: new Date(),
            weight: baby.weight,
            height: baby.height
        };
        baby.measurements.push(measurement);

        // Save to localStorage and Firebase
        Store.saveBaby(baby);

        // Update UI
        UI.renderBabyProfile();

        // Close modal
        this.closeModal('quick-update-modal');
    }
};

// Start App
document.addEventListener('DOMContentLoaded', () => {
    window.app = app; // Ensure global access
    window.ui = UI;   // Ensure global access for UI too just in case
    app.init();

    // Safety check: Ensure profile card is visible if babies exist
    if (Store.state.babies.length > 0) {
        document.getElementById('baby-profile-card').classList.remove('hidden');
    }
});
