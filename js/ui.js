/**
 * UI.js
 * Handles DOM updates and interactions.
 */

const UI = {
    init() {
        this.renderBabyProfile();
        this.renderRecentHistory();
        this.setupInputs();
        this.renderBabySwitcher();
    },

    setupInputs() {
        // Set default datetime-local inputs to current time
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const timeString = now.toISOString().slice(0, 16);
        const dateString = now.toISOString().slice(0, 10);

        document.getElementById('milk-time').value = timeString;
        document.getElementById('food-time').value = timeString;
        document.getElementById('poop-time').value = timeString;
        document.getElementById('health-date').value = timeString;
        document.getElementById('growth-date').value = dateString;
    },

    renderBabySwitcher() {
        const list = document.getElementById('baby-list');
        list.innerHTML = '';

        Store.state.babies.forEach(baby => {
            const btn = document.createElement('div');
            btn.className = `baby-card-item ${baby.id === Store.state.currentBabyId ? 'active' : ''}`;
            btn.onclick = () => app.selectBaby(baby.id);

            const img = baby.profileImage || 'assets/default-baby.png';
            const age = this.calculateAge(new Date(baby.dob));

            btn.innerHTML = `
                <img src="${img}" class="baby-avatar-sm" alt="${baby.name}">
                <div class="baby-info">
                    <span class="baby-name">${baby.name}</span>
                    <span class="baby-age">${age}</span>
                </div>
                ${baby.id === Store.state.currentBabyId ? '<i class="fa-solid fa-circle-check active-icon"></i>' : '<i class="fa-regular fa-circle"></i>'}
            `;
            list.appendChild(btn);
        });
    },

    renderBabyProfile() {
        const baby = Store.getCurrentBaby();
        const settings = Store.state.settings;

        if (!baby) {
            document.getElementById('baby-profile-card').classList.add('hidden');
            document.getElementById('current-baby-name-display').innerHTML = 'Add Baby <i class="fa-solid fa-chevron-down" style="font-size: 12px;"></i>';
            return;
        }

        // Update Header Button
        document.getElementById('current-baby-name-display').textContent = baby.name;

        document.getElementById('baby-name').textContent = baby.name;
        document.getElementById('baby-age').textContent = this.calculateAge(baby.dob);

        // Pre-fill edit modal
        document.getElementById('edit-name').value = baby.name;
        document.getElementById('edit-dob').value = baby.dob.toISOString().split('T')[0];
        document.getElementById('edit-gender').value = baby.gender || 'Boy';
        document.getElementById('edit-weight').value = baby.currentWeight;
        document.getElementById('edit-height').value = baby.currentHeight;

        const profileImg = document.getElementById('profile-img');
        if (baby.profileImage) {
            profileImg.src = baby.profileImage;
        } else {
            profileImg.src = 'assets/default-baby.png';
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
        if (!baby) {
            document.getElementById('recent-list').innerHTML = '';
            return;
        }
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

        if (!baby) {
            const list = document.getElementById('history-list');
            if (list) list.innerHTML = '<p style="text-align:center; color:var(--secondary-text); padding:20px;">No baby selected.</p>';
            return;
        }

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

        records.forEach((record) => {
            const el = this.createRecordElement(record);
            this.addActionButtons(el, tab, record.id, () => this.renderFullHistory(tab));
            list.appendChild(el);
        });
    },

    renderHealthSection(tab = 'appointments') {
        const baby = Store.getCurrentBaby();
        const list = document.getElementById('health-list');

        if (!baby) {
            if (list) list.innerHTML = '<p style="text-align:center; color:var(--secondary-text); padding:20px;">No baby selected.</p>';
            return;
        }

        list.innerHTML = '';

        let records = [];
        if (tab === 'appointments') records = baby.appointments.map(r => ({ ...r, type: 'appointment' }));
        if (tab === 'vaccines') records = baby.vaccines.map(r => ({ ...r, type: 'vaccine' }));

        records.sort((a, b) => {
            const dA = a.date || a.dateAdministered;
            const dB = b.date || b.dateAdministered;
            return dB - dA;
        });

        if (records.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:var(--secondary-text); padding:20px;">No records found.</p>';
            return;
        }

        records.forEach((record) => {
            const div = document.createElement('div');
            div.className = 'record-item';

            let icon, title, details, value;

            if (tab === 'appointments') {
                icon = '<i class="fa-solid fa-user-doctor" style="color:#E91E63"></i>';
                title = record.title;
                details = record.date.toLocaleString();
                value = record.notes || '';
            } else {
                icon = '<i class="fa-solid fa-syringe" style="color:#9C27B0"></i>';
                title = record.title;
                details = record.dateAdministered.toLocaleDateString();
                value = `Dose: ${record.dose}`;
            }

            div.innerHTML = `
                <div class="record-icon">${icon}</div>
                <div class="record-details">
                    <div class="record-title">${title}</div>
                    <div class="record-time">${details}</div>
                </div>
                <div class="record-value">${value}</div>
            `;

            this.addActionButtons(div, tab === 'appointments' ? 'appointment' : 'vaccine', record.id, () => this.renderHealthSection(tab));
            list.appendChild(div);
        });
    },

    renderGrowthHistory() {
        const baby = Store.getCurrentBaby();
        const list = document.getElementById('growth-list');
        list.innerHTML = '';

        const records = [...baby.measurements].sort((a, b) => b.date - a.date);

        records.forEach((record, index) => {
            const div = document.createElement('div');
            div.className = 'record-item';
            div.innerHTML = `
                <div class="record-icon"><i class="fa-solid fa-ruler-combined" style="color:#4CAF50"></i></div>
                <div class="record-details">
                    <div class="record-title">Measurement</div>
                    <div class="record-time">${record.date.toLocaleDateString()}</div>
                </div>
                <div class="record-value">${record.weight}kg / ${record.height}cm</div>
            `;
            this.addDeleteButton(div, 'measurement', index, () => {
                this.renderGrowthHistory();
                Charts.renderGrowthCharts(); // Refresh charts
            });
            list.appendChild(div);
        });
    },

    addDeleteButton(element, type, index, callback) {
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        deleteBtn.style.color = '#FF3B30';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.marginLeft = 'auto';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Delete this record?')) {
                Store.deleteRecord(type, index);
                callback();
                this.renderRecentHistory();
            }
        };
        element.appendChild(deleteBtn);
    },

    addActionButtons(element, type, id, callback) {
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        deleteBtn.style.color = '#FF3B30';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.marginLeft = 'auto';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Delete this record?')) {
                Store.deleteRecord(type, id);
                callback();
                this.renderRecentHistory();
            }
        };
        element.appendChild(deleteBtn);
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

        if (record.amountML !== undefined) { // Milk
            icon = '<i class="fa-solid fa-bottle-water" style="color:#2196F3"></i>';
            title = record.type || "Milk";
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
        document.querySelectorAll('#history-view .tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        this.renderFullHistory(tab);
    },

    switchHealthTab(tab) {
        document.querySelectorAll('#health-view .tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        this.renderHealthSection(tab);
    },

    toggleHealthInputs() {
        const type = document.getElementById('health-type').value;
        if (type === 'vaccine') {
            document.getElementById('vaccine-dose-group').classList.remove('hidden');
        } else {
            document.getElementById('vaccine-dose-group').classList.add('hidden');
        }
    }
};

// Alias for HTML onclick handlers
window.ui = UI;

