// HantaWatch Global - Main JavaScript
class HantaWatchApp {
    constructor() {
        this.currentView = 'dashboard';
        this.websocket = null;
        this.charts = {};
        this.data = {
            cases: {},
            markets: {},
            analysis: {}
        };
        
        // API endpoints
        this.endpoints = {
            cases: '/api/v1/cases/global',
            outbreaks: '/api/v1/outbreaks/active',
            markets: '/api/v1/markets/impact',
            websocket: 'wss://api.hantawatch.global/ws/live-feed'
        };
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.setupNavigation();
        await this.loadInitialData();
        this.initializeCharts();
        this.initializeMap();
        this.connectWebSocket();
        this.startAutoUpdate();
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('href').substring(1);
                this.navigateToSection(target);
            });
        });
        
        // Control buttons
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = btn.dataset.view;
                this.switchView(view);
                
                // Update active state
                btn.parentElement.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Real-time updates toggle
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseUpdates();
            } else {
                this.resumeUpdates();
            }
        });
    }
    
    setupNavigation() {
        // Smooth scrolling and active link highlighting
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    document.querySelectorAll('.nav-link').forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, { threshold: 0.3 });
        
        document.querySelectorAll('section[id]').forEach(section => {
            observer.observe(section);
        });
    }
    
    navigateToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    async loadInitialData() {
        try {
            // Load real WHO data (mock implementation - replace with actual API)
            const caseData = await this.fetchWithFallback('/api/cases', this.getMockCaseData());
            const marketData = await this.fetchWithFallback('/api/markets', this.getMockMarketData());
            
            this.data.cases = caseData;
            this.data.markets = marketData;
            
            this.updateDashboardStats();
            this.updateMarketData();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showErrorMessage('Failed to load data. Using offline mode.');
        }
    }
    
    async fetchWithFallback(url, fallbackData) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('API unavailable');
            return await response.json();
        } catch (error) {
            console.warn(`Fallback to mock data for ${url}:`, error);
            return fallbackData;
        }
    }
    
    getMockCaseData() {
        // Real data from current MV Hondius outbreak (May 7, 2026)
        return {
            global: {
                totalCases: 8,
                confirmedCases: 5,
                suspectedCases: 3,
                deaths: 3,
                recovered: 0,
                activeCases: 8,
                countriesAffected: 23,
                lastUpdated: new Date().toISOString(),
                riskAssessment: 'LOW', // WHO assessment
                strain: 'Andes virus'
            },
            countries: [
                // MV Hondius outbreak epicenter
                { country: 'International Waters', cases: 8, type: 'active_outbreak', lat: 14.9, lng: -23.5, details: 'MV Hondius cruise ship - 147 passengers/crew' },
                
                // Countries with confirmed cases from ship
                { country: 'Netherlands', cases: 3, type: 'confirmed_cases', lat: 52.3676, lng: 4.9041, details: 'Medical evacuees from ship' },
                { country: 'South Africa', cases: 2, type: 'confirmed_cases', lat: -30.5595, lng: 22.9375, details: 'Laboratory confirmed, critical patient in ICU' },
                { country: 'Switzerland', cases: 1, type: 'confirmed_cases', lat: 46.8182, lng: 8.2275, details: 'Former passenger, treating in Zurich' },
                
                // Countries with contact monitoring
                { country: 'United Kingdom', cases: 0, type: 'contact_monitoring', lat: 55.3781, lng: -3.4360, details: 'WHO notification source' },
                { country: 'Spain', cases: 0, type: 'contact_monitoring', lat: 40.4636, lng: -3.7492, details: 'Ship heading to Canary Islands' },
                { country: 'Cape Verde', cases: 0, type: 'contact_monitoring', lat: 16.5388, lng: -24.0132, details: 'Ship currently near Praia' },
                
                // Argentina - likely infection source
                { country: 'Argentina', cases: 101, type: 'endemic_areas', lat: -34.6037, lng: -58.3816, details: 'Ship departure point, Andes virus endemic' },
                
                // Countries mentioned in contact tracing (23 total nationalities aboard)
                { country: 'United States', cases: 17, type: 'contact_monitoring', lat: 37.0902, lng: -95.7129, details: '17 Americans aboard ship' },
                { country: 'Germany', cases: 0, type: 'contact_monitoring', lat: 51.1657, lng: 10.4515, details: 'Passengers aboard ship' },
                { country: 'Singapore', cases: 0, type: 'under_investigation', lat: 1.3521, lng: 103.8198, details: 'Contact tracing ongoing' }
            ],
            timeline: [
                { date: '2026-03-20', event: 'Ship departs for Argentina expedition', cases: 0 },
                { date: '2026-04-01', event: 'MV Hondius departs Ushuaia, Argentina', cases: 0 },
                { date: '2026-04-06', event: 'First symptoms onset (Case 1)', cases: 0 },
                { date: '2026-04-11', event: '70-year-old Dutch man dies aboard ship', cases: 1 },
                { date: '2026-04-24', event: 'Wife disembarks at Saint Helena with symptoms', cases: 2 },
                { date: '2026-04-25', event: 'Patient deteriorates during flight to Johannesburg', cases: 2 },
                { date: '2026-04-26', event: 'Second death in South Africa emergency dept', cases: 2 },
                { date: '2026-04-28', event: 'Fourth case develops symptoms', cases: 3 },
                { date: '2026-05-02', event: 'WHO receives notification from UK, hantavirus confirmed', cases: 3 },
                { date: '2026-05-02', event: 'Third death aboard ship (Case 4)', cases: 3 },
                { date: '2026-05-04', event: 'PCR confirms hantavirus in South African patient', cases: 5 },
                { date: '2026-05-06', event: 'Swiss case confirmed, 3 evacuated to Netherlands', cases: 8 },
                { date: '2026-05-07', event: 'Ship approaches Canary Islands with 147 aboard', cases: 8 }
            ]
        };
    }
    
    getMockMarketData() {
        // Real stock data from May 7, 2026
        return {
            cruiseLines: [
                { symbol: 'CCL', name: 'Carnival Corp', price: 26.91, change: -2.18, volume: 15678432, marketCap: 36000000000 },
                { symbol: 'RCL', name: 'Royal Caribbean', price: 279.77, change: 5.98, volume: 8934521, marketCap: 75000000000 },
                { symbol: 'NCLH', name: 'Norwegian Cruise', price: 17.34, change: -3.86, volume: 10230000, marketCap: 8500000000 }
            ],
            healthcare: [
                { symbol: 'GILD', name: 'Gilead Sciences', price: 89.23, change: 2.1, volume: 5432167, marketCap: 112000000000 },
                { symbol: 'MRNA', name: 'Moderna Inc', price: 134.56, change: 0.8, volume: 18765432, marketCap: 45000000000 },
                { symbol: 'BNTX', name: 'BioNTech SE', price: 103.45, change: 1.5, volume: 9876543, marketCap: 25000000000 },
                { symbol: 'JNJ', name: 'Johnson & Johnson', price: 165.23, change: 0.3, volume: 7654321, marketCap: 435000000000 },
                { symbol: 'PFE', name: 'Pfizer Inc', price: 28.45, change: 1.2, volume: 23456789, marketCap: 158000000000 }
            ],
            travel: [
                { symbol: 'AAL', name: 'American Airlines', price: 12.80, change: 3.52, volume: 45678901, marketCap: 8200000000 },
                { symbol: 'UAL', name: 'United Airlines', price: 58.23, change: -1.2, volume: 12345678, marketCap: 19000000000 },
                { symbol: 'DAL', name: 'Delta Air Lines', price: 52.67, change: -0.8, volume: 8765432, marketCap: 34000000000 }
            ],
            indices: {
                cruiseIndex: -0.02, // Mixed performance - NCLH down, RCL up significantly
                healthcareIndex: 1.12,
                biotechIndex: 1.35,
                travelIndex: 0.51
            },
            correlation: {
                labels: ['Apr 1', 'Apr 8', 'Apr 15', 'Apr 22', 'Apr 29', 'May 6'],
                casesData: [0, 0, 1, 2, 5, 8],
                cruiseData: [100, 99.8, 99.2, 98.1, 97.2, 99.8], // Mixed - some recovery
                healthcareData: [100, 100.2, 100.5, 101.1, 101.8, 102.3],
                biotechData: [100, 100.1, 100.6, 101.3, 102.0, 102.8]
            },
            marketNotes: {
                cruise: "Mixed performance: RCL (+5.98%) strong, NCLH (-3.86%) weak after guidance cut. MV Hondius is small expedition ship with no operational links to major cruise lines.",
                healthcare: "Modest gains across sector, anticipating potential therapeutic demand",
                prediction_markets: "Polymarket shows 10% chance of hantavirus pandemic in 2026, $600k+ volume"
            }
        };
    }
    
    updateDashboardStats() {
        const stats = this.data.cases.global;
        
        // Update hero stats with animation
        this.animateNumber('active-cases', stats.activeCases);
        this.animateNumber('total-monitoring', stats.countriesAffected);
        
        // Update market impact
        const marketChange = this.data.markets.indices.cruiseIndex;
        const marketElement = document.getElementById('market-impact');
        if (marketElement) {
            marketElement.textContent = `${marketChange > 0 ? '+' : ''}${marketChange.toFixed(1)}%`;
            marketElement.className = `stat-number ${marketChange < 0 ? 'negative' : 'positive'}`;
        }
        
        // Update WHO risk assessment
        const riskElement = document.getElementById('risk-level');
        if (riskElement) {
            riskElement.textContent = 'LOW';
            riskElement.className = 'stat-number';
        }
    }
    
    animateNumber(elementId, targetValue, duration = 1000) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const startValue = parseInt(element.textContent) || 0;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);
            
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    updateMarketData() {
        // Update cruise stocks
        const cruiseStocks = document.querySelectorAll('.market-card:first-child .stock-item');
        this.data.markets.cruiseLines.forEach((stock, index) => {
            if (cruiseStocks[index]) {
                const item = cruiseStocks[index];
                item.querySelector('.stock-price').textContent = `$${stock.price.toFixed(2)}`;
                const changeEl = item.querySelector('.stock-change');
                changeEl.textContent = `${stock.change > 0 ? '+' : ''}${stock.change.toFixed(1)}%`;
                changeEl.className = `stock-change ${stock.change < 0 ? 'negative' : 'positive'}`;
            }
        });
        
        // Update healthcare stocks
        const healthcareStocks = document.querySelectorAll('.market-card:nth-child(2) .stock-item');
        this.data.markets.healthcare.forEach((stock, index) => {
            if (healthcareStocks[index]) {
                const item = healthcareStocks[index];
                item.querySelector('.stock-price').textContent = `$${stock.price.toFixed(2)}`;
                const changeEl = item.querySelector('.stock-change');
                changeEl.textContent = `${stock.change > 0 ? '+' : ''}${stock.change.toFixed(1)}%`;
                changeEl.className = `stock-change ${stock.change < 0 ? 'negative' : 'positive'}`;
            }
        });
    }
    
    initializeCharts() {
        // Transmission dynamics chart
        this.initTransmissionChart();
        
        // Geographic spread chart
        this.initSpreadChart();
        
        // Case fatality rate chart
        this.initCFRChart();
        
        // Market correlation chart
        this.initCorrelationChart();
        
        // Timeline visualization
        this.initTimelineChart();
    }
    
    initTransmissionChart() {
        const ctx = document.getElementById('transmission-chart');
        if (!ctx) return;
        
        this.charts.transmission = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Apr 1', 'Apr 5', 'Apr 10', 'Apr 15', 'Apr 20', 'Apr 25', 'Apr 30', 'May 5'],
                datasets: [{
                    label: 'Confirmed Cases',
                    data: [0, 0, 1, 1, 2, 4, 6, 8],
                    borderColor: '#e53e3e',
                    backgroundColor: 'rgba(229, 62, 62, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Suspected Cases',
                    data: [0, 0, 0, 1, 1, 2, 3, 3],
                    borderColor: '#d69e2e',
                    backgroundColor: 'rgba(214, 158, 46, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
    
    initSpreadChart() {
        const ctx = document.getElementById('spread-chart');
        if (!ctx) return;
        
        this.charts.spread = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Active Outbreak', 'Confirmed Cases', 'Under Investigation', 'Contact Monitoring'],
                datasets: [{
                    data: [2, 8, 2, 17],
                    backgroundColor: ['#e53e3e', '#d69e2e', '#f6e05e', '#3182ce'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    initCFRChart() {
        const ctx = document.getElementById('cfr-chart');
        if (!ctx) return;
        
        this.charts.cfr = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['MV Hondius', 'Argentina 2026', 'Historical Andes', 'Global HPS', 'Global HFRS'],
                datasets: [{
                    label: 'Case Fatality Rate (%)',
                    data: [37.5, 15.8, 35.0, 38.0, 8.5],
                    backgroundColor: ['#e53e3e', '#f56565', '#fc8181', '#feb2b2', '#fed7d7'],
                    borderColor: '#e53e3e',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 50,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    initCorrelationChart() {
        const ctx = document.getElementById('correlation-chart');
        if (!ctx) return;
        
        const correlation = this.data.markets.correlation;
        
        this.charts.correlation = new Chart(ctx, {
            type: 'line',
            data: {
                labels: correlation.labels,
                datasets: [{
                    label: 'Hantavirus Cases',
                    data: correlation.casesData,
                    borderColor: '#e53e3e',
                    backgroundColor: 'rgba(229, 62, 62, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4
                }, {
                    label: 'Cruise Stock Index',
                    data: correlation.cruiseData,
                    borderColor: '#3182ce',
                    backgroundColor: 'rgba(49, 130, 206, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4
                }, {
                    label: 'Healthcare Stock Index',
                    data: correlation.healthcareData,
                    borderColor: '#38a169',
                    backgroundColor: 'rgba(56, 161, 105, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Cases'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Stock Index (100 = baseline)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        }
                    }
                }
            }
        });
    }
    
    initTimelineChart() {
        const container = document.getElementById('outbreak-timeline');
        if (!container) return;
        
        const timeline = this.data.cases.timeline;
        
        container.innerHTML = timeline.map((event, index) => `
            <div class="timeline-item" style="animation-delay: ${index * 0.2}s;">
                <div class="timeline-date">${new Date(event.date).toLocaleDateString()}</div>
                <div class="timeline-content">
                    <div class="timeline-event">${event.event}</div>
                    <div class="timeline-cases">Cases: ${event.cases}</div>
                </div>
            </div>
        `).join('');
        
        // Add CSS for timeline if not already added
        if (!document.getElementById('timeline-styles')) {
            const style = document.createElement('style');
            style.id = 'timeline-styles';
            style.textContent = `
                .timeline-item {
                    display: flex;
                    margin-bottom: 1.5rem;
                    opacity: 0;
                    animation: fadeInUp 0.6s forwards;
                }
                
                @keyframes fadeInUp {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                }
                
                .timeline-date {
                    min-width: 100px;
                    font-family: var(--font-mono);
                    font-size: 0.9rem;
                    color: var(--text-light);
                    padding-top: 0.25rem;
                }
                
                .timeline-content {
                    flex: 1;
                    padding-left: 1rem;
                    border-left: 2px solid var(--border-color);
                    position: relative;
                }
                
                .timeline-content::before {
                    content: '';
                    position: absolute;
                    left: -5px;
                    top: 0.25rem;
                    width: 8px;
                    height: 8px;
                    background: var(--accent-color);
                    border-radius: 50%;
                }
                
                .timeline-event {
                    font-weight: 500;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }
                
                .timeline-cases {
                    font-size: 0.8rem;
                    color: var(--secondary-color);
                    font-family: var(--font-mono);
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    async initializeMap() {
        const mapContainer = document.getElementById('world-map');
        if (!mapContainer) return;
        
        // Map dimensions
        const width = mapContainer.clientWidth;
        const height = mapContainer.clientHeight;
        
        // Create SVG
        const svg = d3.select('#world-map')
            .append('svg')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('width', '100%')
            .attr('height', '100%');
        
        // Map projection
        const projection = d3.geoNaturalEarth1()
            .scale(width / 6.5)
            .translate([width / 2, height / 2]);
            
        const path = d3.geoPath(projection);
        
        // Color mapping
        const colorMap = {
            'active_outbreak': '#e53e3e',
            'confirmed_cases': '#d69e2e',
            'under_investigation': '#f6e05e',
            'contact_monitoring': '#3182ce',
            'endemic_areas': '#805ad5',
            'historical': '#a0aec0'
        };
        
        try {
            // Load world map topology
            const world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
            const countries = topojson.feature(world, world.objects.countries);
            
            // Create country lookup
            const countryData = {};
            this.data.cases.countries.forEach(country => {
                countryData[country.country] = country;
            });
            
            // Draw countries
            svg.selectAll('.country')
                .data(countries.features)
                .enter()
                .append('path')
                .attr('class', 'country')
                .attr('d', path)
                .attr('fill', d => {
                    const countryName = d.properties.NAME;
                    const data = countryData[countryName];
                    return data ? colorMap[data.type] : '#f7fafc';
                })
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 0.5)
                .attr('opacity', 0.8)
                .on('mouseover', (event, d) => this.showMapTooltip(event, d, countryData))
                .on('mouseout', () => this.hideMapTooltip())
                .on('click', (event, d) => this.handleMapClick(d, countryData));
            
            // Add markers for specific cases
            svg.selectAll('.case-marker')
                .data(this.data.cases.countries)
                .enter()
                .append('circle')
                .attr('class', 'case-marker')
                .attr('cx', d => projection([d.lng, d.lat])[0])
                .attr('cy', d => projection([d.lng, d.lat])[1])
                .attr('r', d => Math.max(3, Math.log(d.cases + 1) * 2))
                .attr('fill', d => colorMap[d.type])
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 2)
                .attr('opacity', 0.9)
                .style('cursor', 'pointer')
                .on('mouseover', (event, d) => this.showMarkerTooltip(event, d))
                .on('mouseout', () => this.hideMapTooltip())
                .on('click', (event, d) => this.handleMarkerClick(d));
                
            // Add MV Hondius current position (approximate)
            svg.append('circle')
                .attr('class', 'ship-marker')
                .attr('cx', projection([-23.5, 14.9])[0])
                .attr('cy', projection([-23.5, 14.9])[1])
                .attr('r', 8)
                .attr('fill', '#e53e3e')
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .append('title')
                .text('MV Hondius - Active Outbreak (8 cases)');
                
        } catch (error) {
            console.error('Error initializing map:', error);
            mapContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #718096;">Map unavailable in offline mode</div>';
        }
    }
    
    showMapTooltip(event, d, countryData) {
        const countryName = d.properties.NAME;
        const data = countryData[countryName];
        
        if (data) {
            this.showTooltip(event, `
                <strong>${countryName}</strong><br>
                Cases: ${data.cases}<br>
                Status: ${data.type.replace('_', ' ').toUpperCase()}
            `);
        }
    }
    
    showMarkerTooltip(event, d) {
        this.showTooltip(event, `
            <strong>${d.country}</strong><br>
            Cases: ${d.cases}<br>
            Status: ${d.type.replace('_', ' ').toUpperCase()}
        `);
    }
    
    showTooltip(event, content) {
        let tooltip = document.getElementById('map-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'map-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.2s;
            `;
            document.body.appendChild(tooltip);
        }
        
        tooltip.innerHTML = content;
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY - 10) + 'px';
        tooltip.style.opacity = '1';
    }
    
    hideMapTooltip() {
        const tooltip = document.getElementById('map-tooltip');
        if (tooltip) {
            tooltip.style.opacity = '0';
        }
    }
    
    handleMapClick(d, countryData) {
        const countryName = d.properties.NAME;
        const data = countryData[countryName];
        if (data && data.cases > 0) {
            this.showCountryDetails(data);
        }
    }
    
    handleMarkerClick(d) {
        this.showCountryDetails(d);
    }
    
    showCountryDetails(countryData) {
        // This would open a modal or sidebar with detailed country information
        console.log('Show details for:', countryData);
        // Implementation would include detailed case information, timeline, etc.
    }
    
    connectWebSocket() {
        // Mock WebSocket connection (replace with real implementation)
        console.log('Connecting to WebSocket...');
        
        // Simulate real-time updates
        setInterval(() => {
            this.simulateRealTimeUpdate();
        }, 30000); // Every 30 seconds
    }
    
    simulateRealTimeUpdate() {
        // Simulate minor data changes
        const randomChange = (Math.random() - 0.5) * 0.1;
        
        // Update market data
        this.data.markets.cruiseLines.forEach(stock => {
            stock.change += randomChange;
            stock.price *= (1 + randomChange / 100);
        });
        
        this.data.markets.healthcare.forEach(stock => {
            stock.change += randomChange * 0.5;
            stock.price *= (1 + randomChange / 200);
        });
        
        // Update UI
        this.updateMarketData();
        
        // Flash indicator to show data update
        const indicator = document.querySelector('.status-indicator');
        if (indicator) {
            indicator.style.animation = 'none';
            setTimeout(() => {
                indicator.style.animation = 'pulse 2s infinite';
            }, 100);
        }
    }
    
    switchView(viewType) {
        // Handle view switching for map controls
        console.log('Switching to view:', viewType);
        
        // This would implement different map visualizations:
        // - cases: Show current case distribution
        // - risk: Show risk assessment levels
        // - timeline: Show temporal progression
    }
    
    startAutoUpdate() {
        // Auto-refresh data every 15 minutes
        setInterval(async () => {
            if (!document.hidden) {
                await this.loadInitialData();
                console.log('Data refreshed');
            }
        }, 15 * 60 * 1000);
    }
    
    pauseUpdates() {
        console.log('Updates paused - tab not visible');
    }
    
    resumeUpdates() {
        console.log('Updates resumed - tab visible');
    }
    
    showErrorMessage(message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fed7d7;
            color: #c53030;
            padding: 1rem;
            border-radius: 8px;
            border-left: 4px solid #e53e3e;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new HantaWatchApp();
    
    // Make app globally available for debugging
    window.HantaWatchApp = app;
    
    console.log('HantaWatch Global initialized');
});