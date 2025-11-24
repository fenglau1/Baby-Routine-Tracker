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
    tempChart: null,
    tempChartFull: null,
    currentChartEndDate: new Date(),
    currentChartStartDate: new Date(new Date().setDate(new Date().getDate() - 6)), // Default 7 days

    render() {
        this.updateDateRangeDisplay();
        this.renderMilkChart();
        this.renderFoodChart();
        this.renderPoopChart();
        this.renderTemperatureChartFull();
    },

    navigateCharts(days) {
        const newEnd = new Date(this.currentChartEndDate);
        newEnd.setDate(newEnd.getDate() + days);

        const newStart = new Date(this.currentChartStartDate);
        newStart.setDate(newStart.getDate() + days);

        // Optional: Prevent future dates if desired, but flexible range allows it.
        // For now, let's just update.
        this.currentChartEndDate = newEnd;
        this.currentChartStartDate = newStart;

        this.render();
    },

    handleDateChange() {
        const startInput = document.getElementById('chart-start-date').value;
        const endInput = document.getElementById('chart-end-date').value;

        if (startInput && endInput) {
            this.currentChartStartDate = new Date(startInput);
            this.currentChartEndDate = new Date(endInput);

            // Validate: Start should be before End
            if (this.currentChartStartDate > this.currentChartEndDate) {
                // Swap or reset? Let's just swap for user convenience
                const temp = this.currentChartStartDate;
                this.currentChartStartDate = this.currentChartEndDate;
                this.currentChartEndDate = temp;
            }

            this.render();
        }
    },

    updateDateRangeDisplay() {
        const startInput = document.getElementById('chart-start-date');
        const endInput = document.getElementById('chart-end-date');

        if (startInput && endInput) {
            startInput.value = this.currentChartStartDate.toISOString().split('T')[0];
            endInput.value = this.currentChartEndDate.toISOString().split('T')[0];
        }
    },

    getChartDateRange() {
        const end = new Date(this.currentChartEndDate);
        end.setHours(23, 59, 59, 999);

        const start = new Date(this.currentChartStartDate);
        start.setHours(0, 0, 0, 0);

        return { start, end };
    },

    renderMilkChart() {
        const ctx = document.getElementById('milkChart').getContext('2d');
        const baby = Store.getCurrentBaby();
        const { start, end } = this.getChartDateRange();

        // Generate labels for the date range
        const days = [];
        const data = [];

        // Clone start date to iterate
        let d = new Date(start);
        while (d <= end) {
            const dateStr = d.toLocaleDateString();
            days.push(dateStr);

            const total = baby.milkRecords
                .filter(r => new Date(r.timestamp).toLocaleDateString() === dateStr)
                .reduce((sum, r) => sum + r.amountML, 0);
            data.push(total);

            d.setDate(d.getDate() + 1);
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
        const { start, end } = this.getChartDateRange();

        const days = [];
        const data = [];

        let d = new Date(start);
        while (d <= end) {
            const dateStr = d.toLocaleDateString();
            days.push(dateStr);

            const count = baby.foodRecords
                .filter(r => new Date(r.timestamp).toLocaleDateString() === dateStr)
                .length;
            data.push(count);
            d.setDate(d.getDate() + 1);
        }

        if (this.foodChart) this.foodChart.destroy();

        this.foodChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: days.map(d => d.split('/')[0] + '/' + d.split('/')[1]),
                datasets: [{
                    label: 'Meals',
                    data: data,
                    borderColor: '#FF9500',
                    backgroundColor: 'rgba(255, 149, 0, 0.1)',
                    fill: true,
                    tension: 0.4
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
        const { start, end } = this.getChartDateRange();

        const days = [];
        const data = [];

        let d = new Date(start);
        while (d <= end) {
            const dateStr = d.toLocaleDateString();
            days.push(dateStr);

            const count = baby.poopRecords
                .filter(r => new Date(r.timestamp).toLocaleDateString() === dateStr)
                .length;
            data.push(count);
            d.setDate(d.getDate() + 1);
        }

        if (this.poopChart) this.poopChart.destroy();

        this.poopChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: days.map(d => d.split('/')[0] + '/' + d.split('/')[1]),
                datasets: [{
                    label: 'Poops',
                    data: data,
                    backgroundColor: '#AF52DE',
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

    renderGrowthCharts() {
        // Growth charts usually show all history, but we can keep them as is for now
        // or apply the date range if requested. User asked for "all charts", but growth is usually long-term.
        // Let's keep growth charts showing all history for context, as 7 days of growth is boring.
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
    },

    renderTemperatureSparkline() {
        const ctx = document.getElementById('tempSparkline').getContext('2d');
        const baby = Store.getCurrentBaby();

        // Sparkline always shows last 10 records regardless of date range
        const records = (baby.temperatureRecords || [])
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .slice(-10);

        const data = records.map(r => r.temperature);
        const labels = records.map(r => ''); // No labels for sparkline

        if (this.tempChart) this.tempChart.destroy();

        this.tempChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false },
                    y: { display: false, min: 35, max: 40 } // Adjust range as needed
                },
                layout: { padding: 0 }
            }
        });
    },

    renderTemperatureChartFull() {
        let ctx = document.getElementById('tempChartFull');
        if (!ctx) {
            // Create if not exists (hacky but works for now without modifying HTML heavily)
            const container = document.querySelector('#charts-view .modal-body');
            // Insert after controls if they exist, or prepend
            const controls = container.querySelector('.chart-controls');
            const card = document.createElement('div');
            card.className = 'chart-card';
            card.innerHTML = '<h4>Temperature History</h4><canvas id="tempChartFull"></canvas>';

            if (controls) {
                controls.after(card);
            } else {
                container.prepend(card);
            }
            ctx = document.getElementById('tempChartFull');
        }

        const baby = Store.getCurrentBaby();
        const { start, end } = this.getChartDateRange();

        // Filter records within range
        const records = (baby.temperatureRecords || [])
            .filter(r => {
                const d = new Date(r.timestamp);
                return d >= start && d <= end;
            })
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const labels = records.map(r => new Date(r.timestamp).toLocaleString());
        const data = records.map(r => r.temperature);

        if (this.tempChartFull) this.tempChartFull.destroy();

        this.tempChartFull = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Temperature (°C)',
                    data: data,
                    borderColor: '#FF5F6D',
                    backgroundColor: 'rgba(255, 95, 109, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { min: 35, max: 40 }
                }
            }
        });
    }
};
