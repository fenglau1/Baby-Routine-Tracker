/**
 * Store.js
 * Handles data management, persistence, and business logic.
 */

const Store = {
    state: {
        babies: [],
        settings: {
            isDarkMode: false,
            useMetricSystem: true
        }
    },

    init() {
        const savedData = localStorage.getItem('babyRoutineData');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                // Handle migration or structure updates if needed
                this.state = parsed;
                // Ensure dates are Date objects
                this.hydrateDates();
            } catch (e) {
                console.error("Failed to load data", e);
            }
        } else {
            // Create default baby if none exists
            this.createDefaultBaby();
        }
        this.applySettings();
    },

    save() {
        localStorage.setItem('babyRoutineData', JSON.stringify(this.state));
    },

    hydrateDates() {
        this.state.babies.forEach(baby => {
            baby.dob = new Date(baby.dob);
            baby.milkRecords.forEach(r => r.timestamp = new Date(r.timestamp));
            baby.foodRecords.forEach(r => r.timestamp = new Date(r.timestamp));
            baby.poopRecords.forEach(r => r.timestamp = new Date(r.timestamp));
            baby.measurements.forEach(r => r.date = new Date(r.date));
            baby.appointments.forEach(r => r.date = new Date(r.date));
            baby.vaccines.forEach(r => {
                if (r.dateAdministered) r.dateAdministered = new Date(r.dateAdministered);
            });
        });
    },

    createDefaultBaby() {
        const newBaby = {
            id: crypto.randomUUID(),
            name: "My Baby",
            dob: new Date(),
            gender: "Boy",
            currentWeight: 3.5,
            currentHeight: 50,
            profileImage: null,
            milkRecords: [],
            foodRecords: [],
            poopRecords: [],
            vaccines: [],
            appointments: [],
            measurements: []
        };
        this.state.babies.push(newBaby);
        this.save();
    },

    getCurrentBaby() {
        return this.state.babies[0]; // For now, single baby support
    },

    updateBaby(updates) {
        const baby = this.getCurrentBaby();
        Object.assign(baby, updates);
        this.save();
    },

    addMilkRecord(record) {
        const baby = this.getCurrentBaby();
        baby.milkRecords.push({
            ...record,
            timestamp: new Date(record.timestamp)
        });
        this.save();
    },

    addFoodRecord(record) {
        const baby = this.getCurrentBaby();
        baby.foodRecords.push({
            ...record,
            timestamp: new Date(record.timestamp)
        });
        this.save();
    },

    addPoopRecord(record) {
        const baby = this.getCurrentBaby();
        baby.poopRecords.push({
            ...record,
            timestamp: new Date(record.timestamp)
        });
        this.save();
    },

    deleteRecord(type, index) {
        const baby = this.getCurrentBaby();
        if (type === 'milk') baby.milkRecords.splice(index, 1);
        if (type === 'food') baby.foodRecords.splice(index, 1);
        if (type === 'poop') baby.poopRecords.splice(index, 1);
        this.save();
    },

    toggleDarkMode() {
        this.state.settings.isDarkMode = !this.state.settings.isDarkMode;
        this.applySettings();
        this.save();
    },

    toggleUnits() {
        this.state.settings.useMetricSystem = !this.state.settings.useMetricSystem;
        this.save();
    },

    applySettings() {
        if (this.state.settings.isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    },

    // Export/Import Logic
    exportJSON() {
        // Format matches the iOS app's structure
        const exportData = {
            version: "1.0",
            timestamp: new Date(),
            babies: this.state.babies
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "BabyRoutine_Backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    async importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);

                    // Merge logic (Simplistic: Add new babies or replace if ID matches)
                    if (importedData.babies) {
                        importedData.babies.forEach(importedBaby => {
                            const existingIndex = this.state.babies.findIndex(b => b.id === importedBaby.id);
                            if (existingIndex >= 0) {
                                // Replace/Merge logic could go here. For now, replace.
                                this.state.babies[existingIndex] = importedBaby;
                            } else {
                                this.state.babies.push(importedBaby);
                            }
                        });
                        this.hydrateDates();
                        this.save();
                        resolve(true);
                    } else {
                        reject("Invalid format");
                    }
                } catch (e) {
                    reject(e);
                }
            };
            reader.readAsText(file);
        });
    },

    deleteAllData() {
        this.state.babies = [];
        this.createDefaultBaby();
        this.save();
    },

    // Sync Logic
    async syncData() {
        if (!Auth.user || !db) return;

        const userRef = db.collection('users').doc(Auth.user.uid);

        try {
            const doc = await userRef.get();
            if (doc.exists) {
                // Pull remote data
                const remoteData = doc.data();
                // Simple merge: Remote wins if newer, or just overwrite local for now to ensure sync
                // For a robust sync, we'd need timestamps on modification.
                // Let's assume remote is truth for now if it exists.
                if (remoteData.babies) {
                    this.state.babies = remoteData.babies;
                    this.hydrateDates();
                    this.save(false); // Save to local but don't sync back immediately to avoid loop
                    console.log("Data synced from cloud");
                    UI.init(); // Re-render
                }
            } else {
                // No remote data, push local
                this.save();
            }
        } catch (error) {
            console.error("Sync failed:", error);
        }
    },

    save(syncToCloud = true) {
        localStorage.setItem('babyRoutineData', JSON.stringify(this.state));

        if (syncToCloud && Auth.user && db) {
            // Push to Firestore
            // We convert dates to ISO strings or Timestamps? 
            // JSON.stringify handles dates as ISO strings.
            // Firestore can handle objects.
            // Let's store the whole state object.
            // But Firestore doesn't like custom objects or undefined.
            // Simplest: Store as JSON string or sanitize.
            // Let's store 'babies' array.

            // Deep copy to avoid modifying state during save (if we needed to convert dates)
            // But JSON.parse(JSON.stringify()) is a quick way to get a clean object with ISO date strings.
            const cleanState = JSON.parse(JSON.stringify(this.state));

            db.collection('users').doc(Auth.user.uid).set({
                babies: cleanState.babies,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                console.log("Data saved to cloud");
            }).catch(err => {
                console.error("Cloud save failed", err);
            });
        }
    }
};
