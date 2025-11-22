/**
 * Store.js
 * Handles data management, persistence, and business logic.
 */

const Store = {
    state: {
        currentBabyId: null,
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
                this.state = parsed;
                this.hydrateDates();
            } catch (e) {
                console.error("Failed to load data", e);
            }
        }

        // if (this.state.babies.length === 0) {
        //     this.createDefaultBaby();
        // }

        // Ensure currentBabyId is set
        if (!this.state.currentBabyId && this.state.babies.length > 0) {
            this.state.currentBabyId = this.state.babies[0].id;
        }

        this.applySettings();
    },

    save(syncToCloud = true) {
        localStorage.setItem('babyRoutineData', JSON.stringify(this.state));

        if (syncToCloud && Auth.user && this.state.currentBabyId) {
            const baby = this.getCurrentBaby();
            if (baby) this.saveBabyToCloud(baby);
        }
    },

    hydrateDates() {
        this.state.babies.forEach(baby => {
            baby.dob = new Date(baby.dob);
            const ensureId = (r) => { if (!r.id) r.id = crypto.randomUUID(); };

            baby.milkRecords.forEach(r => { r.timestamp = new Date(r.timestamp); ensureId(r); });
            baby.foodRecords.forEach(r => { r.timestamp = new Date(r.timestamp); ensureId(r); });
            baby.poopRecords.forEach(r => { r.timestamp = new Date(r.timestamp); ensureId(r); });
            baby.measurements.forEach(r => { r.date = new Date(r.date); ensureId(r); });
            baby.appointments.forEach(r => { r.date = new Date(r.date); ensureId(r); });
            baby.vaccines.forEach(r => {
                if (r.dateAdministered) r.dateAdministered = new Date(r.dateAdministered);
                ensureId(r);
            });
        });
    },

    // ... createDefaultBaby ...

    addMilkRecord(record) {
        const baby = this.getCurrentBaby();
        baby.milkRecords.push({
            id: crypto.randomUUID(),
            ...record,
            timestamp: new Date(record.timestamp)
        });
        this.save();
    },

    addFoodRecord(record) {
        const baby = this.getCurrentBaby();
        baby.foodRecords.push({
            id: crypto.randomUUID(),
            ...record,
            timestamp: new Date(record.timestamp)
        });
        this.save();
    },

    addPoopRecord(record) {
        const baby = this.getCurrentBaby();
        baby.poopRecords.push({
            id: crypto.randomUUID(),
            ...record,
            timestamp: new Date(record.timestamp)
        });
        this.save();
    },

    addHealthRecord(type, record) {
        const baby = this.getCurrentBaby();
        const newRecord = {
            id: crypto.randomUUID(),
            ...record
        };

        if (type === 'appointment') {
            newRecord.date = new Date(record.date);
            baby.appointments.push(newRecord);
        } else if (type === 'vaccine') {
            newRecord.dateAdministered = new Date(record.dateAdministered);
            baby.vaccines.push(newRecord);
        }
        this.save();
    },

    addMeasurement(record) {
        const baby = this.getCurrentBaby();
        baby.measurements.push({
            id: crypto.randomUUID(),
            ...record,
            date: new Date(record.date)
        });
        // Update current stats
        baby.currentWeight = record.weight;
        baby.currentHeight = record.height;
        this.save();
    },

    deleteRecord(type, id) {
        const baby = this.getCurrentBaby();
        const findAndRemove = (arr) => {
            const index = arr.findIndex(r => r.id === id);
            if (index > -1) arr.splice(index, 1);
        };

        if (type === 'milk') findAndRemove(baby.milkRecords);
        if (type === 'food') findAndRemove(baby.foodRecords);
        if (type === 'poop') findAndRemove(baby.poopRecords);
        if (type === 'appointment') findAndRemove(baby.appointments);
        if (type === 'vaccine') findAndRemove(baby.vaccines);
        if (type === 'measurement') findAndRemove(baby.measurements);
        this.save();
    },

    updateRecord(type, id, updates) {
        const baby = this.getCurrentBaby();
        const findAndUpdate = (arr) => {
            const record = arr.find(r => r.id === id);
            if (record) Object.assign(record, updates);
        };

        if (type === 'milk') findAndUpdate(baby.milkRecords);
        if (type === 'food') findAndUpdate(baby.foodRecords);
        if (type === 'poop') findAndUpdate(baby.poopRecords);
        if (type === 'appointment') findAndUpdate(baby.appointments);
        if (type === 'vaccine') findAndUpdate(baby.vaccines);
        if (type === 'measurement') findAndUpdate(baby.measurements);
        this.save();
    },

    getUpcomingAppointments(days = 7) {
        const baby = this.getCurrentBaby();
        const now = new Date();
        const future = new Date();
        future.setDate(now.getDate() + days);

        return baby.appointments.filter(appt => {
            const d = new Date(appt.date);
            return d >= now && d <= future;
        });
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
        const exportData = {
            version: "1.1",
            timestamp: new Date(),
            babies: this.state.babies,
            settings: this.state.settings
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "BabyRoutine_Backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    // Sync Logic
    async syncData() {
        if (!Auth.user || !db) return;

        const email = Auth.user.email;
        const uid = Auth.user.uid;

        try {
            // 1. Get babies owned by user
            const ownedQuery = await db.collection('babies').where('ownerId', '==', uid).get();

            // 2. Get babies shared with user
            const sharedQuery = await db.collection('babies').where('sharedWith', 'array-contains', email).get();

            const remoteBabies = [];

            ownedQuery.forEach(doc => remoteBabies.push(doc.data()));
            sharedQuery.forEach(doc => remoteBabies.push(doc.data()));

            if (remoteBabies.length > 0) {
                // Merge logic: Remote wins for simplicity in this MVP
                // In a real app, we'd merge arrays carefully.
                // Here we just replace local babies with remote ones if they exist.

                // We need to preserve local-only babies that haven't synced yet?
                // For now, let's assume if you log in, you want the cloud state.

                this.state.babies = remoteBabies;

                // Ensure current baby is valid
                if (!this.state.babies.find(b => b.id === this.state.currentBabyId)) {
                    this.state.currentBabyId = this.state.babies[0].id;
                }

                this.hydrateDates();
                this.save(false); // Save to local, don't sync back
                console.log("Data synced from cloud");
                UI.init(); // Re-render
            } else {
                // No remote data? Push local data if it's a new user or first sync
                // But only if we have local data that isn't just the default empty one?
                // Let's push all local babies to cloud
                this.state.babies.forEach(baby => {
                    if (!baby.ownerId) baby.ownerId = uid; // Claim ownership
                    this.saveBabyToCloud(baby);
                });
            }
        } catch (error) {
            console.error("Sync failed:", error);
        }
    },

    saveBabyToCloud(baby) {
        if (!db || !Auth.user) return;

        const cleanBaby = JSON.parse(JSON.stringify(baby)); // Clean dates to strings

        db.collection('babies').doc(baby.id).set(cleanBaby)
            .then(() => console.log(`Baby ${baby.name} saved to cloud`))
            .catch(err => console.error("Cloud save failed", err));
    },

    async shareBaby(email) {
        if (!db || !Auth.user) return;

        const baby = this.getCurrentBaby();
        if (baby.ownerId !== Auth.user.uid) {
            alert("Only the owner can share this baby profile.");
            return;
        }

        if (!baby.sharedWith) baby.sharedWith = [];
        if (!baby.sharedWith.includes(email)) {
            baby.sharedWith.push(email);
            this.save(); // Will trigger cloud save
            alert(`Shared ${baby.name} with ${email}`);
        } else {
            alert(`${email} already has access.`);
        }
    },

    async importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    if (importedData.babies) {
                        this.state.babies = importedData.babies;
                        if (importedData.settings) this.state.settings = importedData.settings;

                        // Ensure IDs
                        this.state.babies.forEach(b => {
                            if (!b.id) b.id = crypto.randomUUID();
                            if (!b.measurements) b.measurements = [];
                            if (!b.appointments) b.appointments = [];
                            if (!b.vaccines) b.vaccines = [];
                        });

                        this.state.currentBabyId = this.state.babies[0].id;
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

    deleteBabyFromCloud(id) {
        if (!db || !Auth.user) return;

        db.collection('babies').doc(id).delete()
            .then(() => console.log(`Baby ${id} deleted from cloud`))
            .catch(err => console.error("Cloud delete failed", err));
    },

    deleteBaby(id) {
        const index = this.state.babies.findIndex(b => b.id === id);
        if (index > -1) {
            this.state.babies.splice(index, 1);

            // Delete from cloud
            this.deleteBabyFromCloud(id);

            // If no babies left, do nothing (App will handle forced creation)
            if (this.state.babies.length > 0) {
                // If we deleted the current baby, switch to the first one
                if (this.state.currentBabyId === id) {
                    this.state.currentBabyId = this.state.babies[0].id;
                }
            } else {
                this.state.currentBabyId = null;
            }
            this.save();
        }
    },

    deleteAllData() {
        this.state.babies = [];
        this.createDefaultBaby();
        this.save();
    }
};
