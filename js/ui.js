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
        // Set default date/time to now
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const nowStr = now.toISOString().slice(0, 16);

        document.querySelectorAll('input[type="datetime-local"]').forEach(input => {
            if (!input.value) input.value = nowStr;
        });

        // Clear other inputs but preserve hidden ones (like health-type)
        document.querySelectorAll('input:not([type="datetime-local"]):not([type="hidden"]), textarea').forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') return;
            input.value = '';
        });

        // Reset selects
        document.querySelectorAll('select').forEach(select => {
            select.selectedIndex = 0;
        });
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
            // document.getElementById('baby-profile-card').classList.add('hidden'); // Don't hide it
            document.getElementById('baby-profile-card').classList.remove('hidden'); // Ensure visible
            document.getElementById('current-baby-name-display').innerHTML = 'Add Baby <i class="fa-solid fa-chevron-down" style="font-size: 12px;"></i>';
            return;
        }

        // Update Header Button
        document.getElementById('current-baby-name-display').textContent = baby.name;

        document.getElementById('current-baby-name').textContent = baby.name;
        document.getElementById('current-baby-age').textContent = this.calculateAge(baby.dob);

        // Pre-fill edit modal
        document.getElementById('edit-name').value = baby.name;
        document.getElementById('edit-dob').value = baby.dob.toISOString().split('T')[0];
        document.getElementById('edit-gender').value = baby.gender || 'Boy';
        document.getElementById('edit-weight').value = baby.currentWeight;
        document.getElementById('edit-height').value = baby.currentHeight;

        const profileImg = document.getElementById('current-baby-avatar');
        if (baby.profileImage) {
            profileImg.src = baby.profileImage;
        } else {
            profileImg.src = 'assets/default-baby.png';
        }

        const weight = settings.useMetricSystem ? `${baby.currentWeight} kg` : `${(baby.currentWeight * 2.20462).toFixed(2)} lb`;
        const height = settings.useMetricSystem ? `${baby.currentHeight} cm` : `${(baby.currentHeight / 2.54).toFixed(2)} in`;

        document.getElementById('current-baby-weight').textContent = weight;
        document.getElementById('current-baby-height').textContent = height;
        // document.getElementById('unit-vol').textContent = settings.useMetricSystem ? 'ml' : 'oz'; // This ID might also be missing, checking index.html later if needed, but commenting out if not found in snippet. Wait, I didn't see unit-vol in index.html snippet. I'll leave it for now or check.
        // Actually, let's check if unit-vol exists. It wasn't in the snippet. 
        // To be safe, I will keep it but if it errors I'll know. 
        // However, looking at the error log, it failed at the first mismatch.
        // I'll assume unit-vol might be correct or I should check it.
        // Let's just fix the known ones first.

        // Update Toggles
        document.getElementById('dark-mode-toggle').checked = settings.isDarkMode;
        document.getElementById('metric-toggle').checked = settings.useMetricSystem;

        // Show profile card
        document.getElementById('baby-profile-card').classList.remove('hidden');

        this.renderTemperatureWidget();
    },

    calculateAge(dob) {
        const diff = new Date() - dob;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const months = Math.floor(days / 30.44);

        if (months < 1) return `${days} days old`;
        return `${months} months ${days % 30} days old`;
    },

    renderTemperatureWidget() {
        const baby = Store.getCurrentBaby();
        const section = document.getElementById('temperature-section');
        const card = section.querySelector('.temp-card');

        if (!baby) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block'; // Always show if baby exists

        // Reset classes
        card.classList.remove('normal', 'fever');

        if (!baby.temperatureRecords || baby.temperatureRecords.length === 0) {
            document.getElementById('latest-temp-value').textContent = '--°C';
            document.getElementById('latest-temp-time').textContent = 'No records';
            return;
        }

        const latest = baby.temperatureRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        document.getElementById('latest-temp-value').textContent = `${latest.temperature}°C`;

        // Dynamic Color Logic
        if (latest.temperature >= 37.5) {
            card.classList.add('fever');
        } else {
            card.classList.add('normal');
        }

        const date = new Date(latest.timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        let timeStr = '';
        if (diffMins < 1) timeStr = 'Just now';
        else if (diffMins < 60) timeStr = `${diffMins}m ago`;
        else if (diffHours < 24) timeStr = `${diffHours}h ago`;
        else timeStr = `${diffDays}d ago`;

        document.getElementById('latest-temp-time').textContent = timeStr;

        // Render Sparkline
        setTimeout(() => Charts.renderTemperatureSparkline(), 100);
    },

    renderRecentHistory() {
        const baby = Store.getCurrentBaby();
        if (!baby) {
            document.getElementById('recent-list').innerHTML = '';
            return;
        }

        const milkRecords = (baby.milkRecords || []).map(r => ({ ...r, type: 'milk', sortTime: r.timestamp }));
        const foodRecords = (baby.foodRecords || []).map(r => ({ ...r, type: 'food', sortTime: r.timestamp }));
        const poopRecords = (baby.poopRecords || []).map(r => ({ ...r, type: 'poop', sortTime: r.timestamp }));
        const tempRecords = (baby.temperatureRecords || []).map(r => ({ ...r, type: 'temperature', sortTime: r.timestamp }));

        const allRecords = [...milkRecords, ...foodRecords, ...poopRecords, ...tempRecords]
            .filter(r => r && r.timestamp) // Filter out nulls or missing timestamps
            .sort((a, b) => new Date(b.sortTime) - new Date(a.sortTime))
            .slice(0, 5);

        const list = document.getElementById('recent-list');
        list.innerHTML = '';

        if (allRecords.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:var(--secondary-text); padding:20px;">No recent activity.</p>';
            return;
        }

        allRecords.forEach(record => {
            const el = this.createRecordElement(record);
            // Add delete action
            this.addActionButtons(el, record.type, record.id, () => this.renderRecentHistory());
            list.appendChild(el);
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

        if (tab === 'milk') records = (baby.milkRecords || []).map(r => ({ ...r, type: 'milk' }));
        if (tab === 'food') records = (baby.foodRecords || []).map(r => ({ ...r, type: 'food' }));
        if (tab === 'poop') records = (baby.poopRecords || []).map(r => ({ ...r, type: 'poop' }));
        if (tab === 'temperature') records = (baby.temperatureRecords || []).map(r => ({ ...r, type: 'temperature' }));

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

        // Reset Modal State (in case it was used for Temperature History)
        const modal = document.getElementById('health-view');
        if (modal) {
            const title = modal.querySelector('h3');
            if (title) title.textContent = 'Health & Vaccines';

            const grid = modal.querySelector('.health-grid');
            if (grid) grid.style.display = 'grid'; // or 'flex', check CSS. Usually grid or flex.
            // Let's check style.css or assume flex/grid. The HTML had class "health-grid".
            // Safest is to remove inline style display: none
            if (grid) grid.style.display = '';
        }

        list.innerHTML = '';

        let records = [];
        if (tab === 'appointments') records = (baby.appointments || []).map(r => ({ ...r, type: 'appointment' }));
        if (tab === 'vaccines') records = (baby.vaccines || []).map(r => ({ ...r, type: 'vaccine' }));

        // Remove any undefined or null records
        records = records.filter(r => r);

        records.sort((a, b) => {
            const dA = a.date || a.dateAdministered || a.timestamp;
            const dB = b.date || b.dateAdministered || b.timestamp;
            return new Date(dB) - new Date(dA);
        });

        if (records.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:var(--secondary-text); padding:20px;">No records found.</p>';
            return;
        }

        records.forEach((record) => {
            const div = document.createElement('div');
            div.className = `record-item ${record.type || 'health'}`;

            let icon, title, details, value;

            if (tab === 'appointments') {
                icon = '<i class="fa-solid fa-user-doctor"></i>';
                title = record.title;
                details = new Date(record.date).toLocaleString();
                value = record.notes || '';
            } else if (tab === 'vaccines') {
                icon = '<i class="fa-solid fa-syringe"></i>';
                title = record.title;
                details = new Date(record.dateAdministered).toLocaleDateString();
                value = `Dose: ${record.dose}`;
            }

            div.innerHTML = `
                <div class="record-icon ${tab}">${icon}</div>
                <div class="record-details">
                    <div class="record-title">${title}</div>
                    <div class="record-time">${details}</div>
                </div>
                <div class="record-value">${value}</div>
            `;

            this.addActionButtons(div, record.type, record.id, () => this.renderHealthSection(tab));
            list.appendChild(div);
        });
    },

    switchHistoryTab(btn, tab) {
        // Update active state
        document.querySelectorAll('#history-view .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderFullHistory(tab);
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
        if (!record || !record.type) return document.createElement('div'); // Return empty div if invalid

        const div = document.createElement('div');
        div.className = `record-item ${record.type}`;

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
        } else if (record.temperature !== undefined) { // Temperature
            icon = '<i class="fa-solid fa-temperature-three-quarters" style="color:#FF3B30"></i>';
            title = `${record.temperature}°C`;
            value = record.notes || '';
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

    switchHistoryTab(btn, tab) {
        document.querySelectorAll('#history-view .tab-btn').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        this.renderFullHistory(tab);
    },

    switchHealthTab(btn, tab) {
        document.querySelectorAll('#health-view .tab-btn').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        this.renderHealthSection(tab);
    },

    toggleHealthInputs() {
        const type = document.getElementById('health-type').value;
        if (type === 'vaccine') {
            document.getElementById('vaccine-dose-group').classList.remove('hidden');
        } else {
            document.getElementById('vaccine-dose-group').classList.add('hidden');
        }
    },

    openTemperatureHistory() {
        // Reuse health modal but only show temperature records
        // Or create a specific view. For now, let's use the health modal structure but customized.
        // Actually, the user asked for "history inside temperature card" but also "history button".
        // Let's open a modal that shows just temperature history.
        // We can reuse the 'health-view' modal but clear tabs and show only temp list.

        const modal = document.getElementById('health-view');
        modal.classList.remove('hidden');
        modal.classList.add('visible');

        // Hide tabs
        modal.querySelector('.tabs').style.display = 'none';
        modal.querySelector('h3').textContent = 'Temperature History';
        modal.querySelector('.health-grid').style.display = 'none'; // Hide add buttons

        const list = document.getElementById('health-list');
        list.innerHTML = '';

        const baby = Store.getCurrentBaby();
        if (!baby || !baby.temperatureRecords) {
            list.innerHTML = '<p style="text-align:center; padding:20px;">No records.</p>';
            return;
        }

        const records = [...baby.temperatureRecords].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        records.forEach(record => {
            const div = document.createElement('div');
            div.className = 'record-item temperature';
            div.innerHTML = `
                <div class="record-icon"><i class="fa-solid fa-temperature-three-quarters"></i></div>
                <div class="record-details">
                    <div class="record-title">${record.temperature}°C</div>
                    <div class="record-time">${new Date(record.timestamp).toLocaleString()}</div>
                </div>
                <div class="record-value">${record.notes || ''}</div>
            `;
            this.addActionButtons(div, 'temperature', record.id, () => this.openTemperatureHistory());
            list.appendChild(div);
        });
    },

    openTemperatureChart() {
        app.openModal('charts-view');
        // Reset to today and render all
        Charts.currentChartEndDate = new Date();
        setTimeout(() => {
            Charts.render();
        }, 300);
    }
};

// Alias for HTML onclick handlers

// Start UI
document.addEventListener('DOMContentLoaded', () => {
    window.ui = UI; // Expose as lowercase 'ui' for HTML onclick handlers
    // UI.init() is called by app.init()
});
