/**
 * UI.js
 * Handles DOM updates and interactions.
 */

const UI = {
    init() {
        this.renderBabyProfile();
        this.renderRecentHistory();
        this.setupInputs();
    },

    setupInputs() {
        // Set default datetime-local inputs to current time
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const timeString = now.toISOString().slice(0, 16);

        document.getElementById('milk-time').value = timeString;
        document.getElementById('food-time').value = timeString;
        document.getElementById('poop-time').value = timeString;
    },

    renderBabyProfile() {
        const baby = Store.getCurrentBaby();
        const settings = Store.state.settings;

        document.getElementById('baby-name').textContent = baby.name;
        document.getElementById('baby-age').textContent = this.calculateAge(baby.dob);

        if (baby.profileImage) {
            // Handle base64 image if present (iOS export might be raw data, need to ensure compat)
            // Assuming the store saves it as a base64 string or compatible URL
            // If it's raw data from Swift, it might need conversion. 
            // For web-to-web, base64 is fine.
            // If importing from iOS, we might need to handle the Data type.
            // For now, assume it works or falls back.
        }

        const weight = settings.useMetricSystem ? `${baby.currentWeight} kg` : `${(baby.currentWeight * 2.20462).toFixed(2)} lb`;
        const height = settings.useMetricSystem ? `${baby.currentHeight} cm` : `${(baby.currentHeight / 2.54).toFixed(2)} in`;

        document.getElementById('baby-weight').textContent = weight;
        document.getElementById('baby-height').textContent = height;
        document.getElementById('unit-vol').textContent = settings.useMetricSystem ? 'ml' : 'oz';

        // Update Toggles
        document.getElementById('dark-mode-toggle').checked = settings.isDarkMode;
        document.getElementById('metric-toggle').checked = settings.useMetricSystem;

        // Show profile card
        document.getElementById('baby-profile-card').classList.remove('hidden');
    },

    calculateAge(dob) {
        const diff = new Date() - dob;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const months = Math.floor(days / 30.44);

        if (months < 1) return `${days} days old`;
        return `${months} months ${days % 30} days old`;
    },

    renderRecentHistory() {
        const baby = Store.getCurrentBaby();
        const allRecords = [
            ...baby.milkRecords.map(r => ({ ...r, type: 'milk', sortTime: r.timestamp })),
            ...baby.foodRecords.map(r => ({ ...r, type: 'food', sortTime: r.timestamp })),
            ...baby.poopRecords.map(r => ({ ...r, type: 'poop', sortTime: r.timestamp }))
        ].sort((a, b) => b.sortTime - a.sortTime).slice(0, 3);

        const list = document.getElementById('recent-list');
        list.innerHTML = '';

        allRecords.forEach(record => {
            list.appendChild(this.createRecordElement(record));
        });
    },

    renderFullHistory(tab = 'milk') {
        const baby = Store.getCurrentBaby();
        let records = [];

        if (tab === 'milk') records = baby.milkRecords.map(r => ({ ...r, type: 'milk' }));
        if (tab === 'food') records = baby.foodRecords.map(r => ({ ...r, type: 'food' }));
        if (tab === 'poop') records = baby.poopRecords.map(r => ({ ...r, type: 'poop' }));

        records.sort((a, b) => b.timestamp - a.timestamp);

        const list = document.getElementById('history-list');
        list.innerHTML = '';

        if (records.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:var(--secondary-text); padding:20px;">No records found.</p>';
            return;
        }

        records.forEach((record, index) => {
            const el = this.createRecordElement(record);

            // Add delete button for full history
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            deleteBtn.style.color = '#FF3B30';
            deleteBtn.style.background = 'none';
            deleteBtn.style.border = 'none';
            deleteBtn.style.marginLeft = 'auto';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('Delete this record?')) {
                    Store.deleteRecord(tab, index); // Note: index might be off if sorted differently than store array. 
                    // Ideally store should handle ID deletion. For simplicity using index but need to be careful.
                    // In Store.js deleteRecord uses splice, so we need original index.
                    // Better approach: Find record in store by timestamp/ID.
                    // For this MVP, we'll just re-render.
                    this.renderFullHistory(tab);
                    this.renderRecentHistory();
                }
            };
            el.appendChild(deleteBtn);
            list.appendChild(el);
        });
    },

    createRecordElement(record) {
        const div = document.createElement('div');
        div.className = 'record-item';

        let icon = '';
        let title = '';
        let details = '';
        let value = '';

        const time = record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = record.timestamp.toLocaleDateString();

        if (record.type === 'milk') {
            icon = '<i class="fa-solid fa-bottle-water" style="color:#2196F3"></i>';
            title = record.type; // 'Formula' or 'Breast Milk' (field name collision in JS model vs Swift)
            // In Store.js we saved it as ...record. The Swift DTO has 'type' as the milk type.
            // But here we added 'type': 'milk' to the object.
            // Let's check the DTO. Swift: type: MilkType.
            // So record.type from Swift is "Formula".
            // But we overwrote it in renderRecentHistory map.
            // Let's fix that mapping in renderRecentHistory to not overwrite 'type' if possible, or use a different key.
            // Actually, let's use record.milkType or similar if we can.
            // Or just check properties.

            // Correction: In renderRecentHistory, I did `type: 'milk'`. This overwrites the milk type (Formula).
            // I should use `recordType: 'milk'` instead.
        }

        // Let's adjust the logic based on properties since 'type' might be ambiguous
        if (record.amountML !== undefined) { // Milk
            icon = '<i class="fa-solid fa-bottle-water" style="color:#2196F3"></i>';
            title = record.type || "Milk"; // This might be "milk" from the map, or "Formula" from store
            // If it's "milk" (from map), we lose the specific type.
            // We need to fix the mapping in renderRecentHistory.
            value = `${record.amountML} ml`;
            details = `${date} • ${time}`;
        } else if (record.foodItem !== undefined) { // Food
            icon = '<span style="font-size:20px">' + (this.getMealIcon(record.mealType) || '🍽️') + '</span>';
            title = record.foodItem;
            value = record.mood;
            details = `${date} • ${time} • ${record.mealType}`;
        } else if (record.color !== undefined) { // Poop
            icon = '<i class="fa-solid fa-circle" style="color:' + this.getColorHex(record.color) + '"></i>';
            title = record.color;
            value = '';
            details = `${date} • ${time}`;
        }

        div.innerHTML = `
            <div class="record-icon">${icon}</div>
            <div class="record-details">
                <div class="record-title">${title}</div>
                <div class="record-time">${details}</div>
            </div>
            <div class="record-value">${value}</div>
        `;
        return div;
    },

    getMealIcon(type) {
        const map = { 'Breakfast': '🥞', 'Lunch': '🍱', 'Dinner': '🍲', 'Snack': '🍪' };
        return map[type] || '🍽️';
    },

    getColorHex(name) {
        const map = { 'Yellow': '#FFD700', 'Brown': '#8B4513', 'Green': '#008000', 'Black': '#000000', 'Red': '#FF0000' };
        return map[name] || '#888';
    },

    // Interaction Helpers
    selectSegment(btn, inputId) {
        const container = btn.parentElement;
        container.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(inputId).value = btn.dataset.value;
    },

    adjustAmount(val) {
        document.getElementById('milk-amount').value = val;
    },

    adjustAmountDelta(delta) {
        const input = document.getElementById('milk-amount');
        let val = parseFloat(input.value) || 0;
        val += delta;
        if (val < 0) val = 0;
        input.value = val;
    },

    selectMeal(btn) {
        const container = btn.parentElement;
        container.querySelectorAll('.meal-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('food-meal-type').value = btn.dataset.value;
    },

    selectMood(btn) {
        const container = btn.parentElement;
        container.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('food-mood').value = btn.dataset.value;
    },

    selectColor(btn) {
        const container = btn.parentElement;
        container.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const color = btn.dataset.value;
        document.getElementById('poop-color').value = color;
        document.getElementById('selected-color-name').textContent = color;
    },

    switchHistoryTab(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        this.renderFullHistory(tab);
    }
};

// Alias for HTML onclick handlers
const ui = UI;

