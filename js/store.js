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
        this.state.currentBabyId = newBaby.id;
        this.save();
        return newBaby;
    },

    getCurrentBaby() {
        return this.state.babies.find(b => b.id === this.state.currentBabyId) || this.state.babies[0];
    },

    setCurrentBaby(id) {
        this.state.currentBabyId = id;
        this.save();
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

    addHealthRecord(type, record) {
        const baby = this.getCurrentBaby();
        if (type === 'appointment') {
            baby.appointments.push({
                ...record,
                date: new Date(record.date)
            });
        } else if (type === 'vaccine') {
            baby.vaccines.push({
                ...record,
                dateAdministered: new Date(record.dateAdministered)
            });
        }
        this.save();
    },

    addMeasurement(record) {
        const baby = this.getCurrentBaby();
        baby.measurements.push({
            ...record,
            date: new Date(record.date)
        });
        // Update current stats
        baby.currentWeight = record.weight;
        baby.currentHeight = record.height;
        this.save();
    },

    deleteRecord(type, index) {
        const baby = this.getCurrentBaby();
        if (type === 'milk') baby.milkRecords.splice(index, 1);
        if (type === 'food') baby.foodRecords.splice(index, 1);
        if (type === 'poop') baby.poopRecords.splice(index, 1);
        if (type === 'appointment') baby.appointments.splice(index, 1);
        if (type === 'vaccine') baby.vaccines.splice(index, 1);
        if (type === 'measurement') baby.measurements.splice(index, 1);
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

    deleteBaby(id) {
        const index = this.state.babies.findIndex(b => b.id === id);
        if (index > -1) {
            this.state.babies.splice(index, 1);
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
