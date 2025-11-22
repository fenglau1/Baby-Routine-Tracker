/**
 * Charts.js
 * Handles Chart.js rendering.
 */

const Charts = {
    milkChart: null,
    foodChart: null,
    poopChart: null,
    weightChart: null,
    heightChart: null,

    render() {
        this.renderMilkChart();
        this.renderFoodChart();
        this.renderPoopChart();
    },

    renderMilkChart() {
        const ctx = document.getElementById('milkChart').getContext('2d');
        const baby = Store.getCurrentBaby();

        // Get last 7 days
        const days = [];
        const data = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString();
            days.push(dateStr);

            // Sum milk for this day
            const total = baby.milkRecords
                .filter(r => new Date(r.timestamp).toLocaleDateString() === dateStr)
                .reduce((sum, r) => sum + r.amountML, 0);

            data.push(total);
        }

        if (this.milkChart) this.milkChart.destroy();

        this.milkChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: days.map(d => d.split('/')[0] + '/' + d.split('/')[1]), // Short date
                datasets: [{
                    label: 'Milk (ml)',
                    data: data,
                    backgroundColor: '#007AFF',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    },

    renderFoodChart() {
        const ctx = document.getElementById('foodChart').getContext('2d');
        const baby = Store.getCurrentBaby();

        const counts = { 'Breakfast': 0, 'Lunch': 0, 'Dinner': 0, 'Snack': 0 };
        baby.foodRecords.forEach(r => {
            if (counts[r.mealType] !== undefined) counts[r.mealType]++;
        });

        if (this.foodChart) this.foodChart.destroy();

        this.foodChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    label: 'Meals',
                    data: Object.values(counts),
                    backgroundColor: ['#FF9800', '#4CAF50', '#2196F3', '#9C27B0'],
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    },

    renderPoopChart() {
        const ctx = document.getElementById('poopChart').getContext('2d');
        const baby = Store.getCurrentBaby();

        const counts = {};
        baby.poopRecords.forEach(r => {
            counts[r.color] = (counts[r.color] || 0) + 1;
        });

        const colors = { 'Yellow': '#FFD700', 'Brown': '#8B4513', 'Green': '#008000', 'Black': '#000000', 'Red': '#FF0000' };
        const bgColors = Object.keys(counts).map(c => colors[c] || '#888');

        if (this.poopChart) this.poopChart.destroy();

        this.poopChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: bgColors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'right' }
                }
            }
        });
    },

    renderGrowthCharts() {
        const baby = Store.getCurrentBaby();
        const records = [...baby.measurements].sort((a, b) => a.date - b.date);

        const labels = records.map(r => r.date.toLocaleDateString());
        const weights = records.map(r => r.weight);
        const heights = records.map(r => r.height);

        // Weight Chart
        const ctxW = document.getElementById('weightChart').getContext('2d');
        if (this.weightChart) this.weightChart.destroy();

        this.weightChart = new Chart(ctxW, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Weight (kg)',
                    data: weights,
                    borderColor: '#4CAF50',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: { responsive: true }
        });

        // Height Chart
        const ctxH = document.getElementById('heightChart').getContext('2d');
        if (this.heightChart) this.heightChart.destroy();

        this.heightChart = new Chart(ctxH, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Height (cm)',
                    data: heights,
                    borderColor: '#2196F3',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: { responsive: true }
        });
    }
};
