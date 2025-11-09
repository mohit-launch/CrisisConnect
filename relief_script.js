// ============================================
// INDIA DISASTER FEED - ENHANCED VERSION
// ============================================

class IndiaDisasterFeed {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.apiEndpoints = {
            reliefweb: 'https://api.reliefweb.int/v1/reports',
            gdacs: 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP'
        };
        this.cache = {
            data: null,
            timestamp: null,
            duration: 5 * 60 * 1000 // 5 minutes cache
        };
    }

    // Check if cached data is still valid
    isCacheValid() {
        if (!this.cache.data || !this.cache.timestamp) return false;
        return (Date.now() - this.cache.timestamp) < this.cache.duration;
    }

    // Main fetch function with caching
    async fetchDisasterData() {
        // Return cached data if valid
        if (this.isCacheValid()) {
            console.log('Using cached disaster data');
            return this.cache.data;
        }

        this.showLoading();

        try {
            // Fetch from ReliefWeb API
            const data = await this.fetchFromReliefWeb();
            
            // Cache the results
            this.cache.data = data;
            this.cache.timestamp = Date.now();
            
            return data;
        } catch (error) {
            console.error('Error fetching disaster data:', error);
            this.showError(error.message);
            return [];
        }
    }

    // Fetch from ReliefWeb API (Primary Source) - Updated approach
    async fetchFromReliefWeb() {
        // Try simpler endpoint first
        const url = 'https://api.reliefweb.int/v1/reports?appname=apidoc&profile=list&preset=latest&limit=10&query[value]=country.id:119';
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`ReliefWeb API returned ${response.status}`);
            }

            const json = await response.json();
            
            if (json.data && json.data.length > 0) {
                return this.parseReliefWebData(json.data);
            }
            
            return [];
        } catch (error) {
            console.warn('ReliefWeb API failed, trying alternative sources...', error);
            // Try alternative APIs
            return await this.fetchFromAlternativeSources();
        }
    }

    // Alternative API sources
    async fetchFromAlternativeSources() {
        try {
            // Try GDACS (Global Disaster Alert and Coordination System)
            const gdacsData = await this.fetchFromGDACS();
            if (gdacsData.length > 0) return gdacsData;
        } catch (error) {
            console.warn('GDACS failed:', error);
        }

        try {
            // Try EONET (NASA Earth Observatory Natural Event Tracker)
            const eonetData = await this.fetchFromEONET();
            if (eonetData.length > 0) return eonetData;
        } catch (error) {
            console.warn('EONET failed:', error);
        }

        // If all APIs fail, return sample data
        return this.getSampleData();
    }

    // Fetch from GDACS API
    async fetchFromGDACS() {
        const response = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?fromDate=&toDate=&alertlevel=;Orange;Red&country=IND&limit=10');
        
        if (!response.ok) throw new Error('GDACS API failed');
        
        const data = await response.json();
        
        if (!data.features || data.features.length === 0) return [];
        
        return data.features.map(feature => ({
            id: feature.properties.eventid,
            title: feature.properties.name || 'Disaster Alert',
            description: feature.properties.description || `${feature.properties.eventtype} event in ${feature.properties.country}`,
            date: new Date(feature.properties.fromdate),
            location: feature.properties.country || 'India',
            disasterType: this.mapGDACSEventType(feature.properties.eventtype),
            severity: this.mapGDACSAlertLevel(feature.properties.alertlevel),
            source: 'GDACS',
            url: feature.properties.url || '#',
            country: 'India'
        }));
    }

    // Fetch from NASA EONET
    async fetchFromEONET() {
        const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=20');
        
        if (!response.ok) throw new Error('EONET API failed');
        
        const data = await response.json();
        
        if (!data.events || data.events.length === 0) return [];
        
        // Filter for events that might be in/near India
        const indiaEvents = data.events.filter(event => {
            if (!event.geometry || event.geometry.length === 0) return false;
            const coords = event.geometry[0].coordinates;
            // India bounding box: lat 8-35, lon 68-97
            return coords[1] >= 8 && coords[1] <= 35 && coords[0] >= 68 && coords[0] <= 97;
        });

        return indiaEvents.map(event => ({
            id: event.id,
            title: event.title,
            description: event.description || `${event.categories[0].title} event detected`,
            date: new Date(event.geometry[0].date),
            location: 'India Region',
            disasterType: event.categories[0].title,
            severity: 'medium',
            source: 'NASA EONET',
            url: event.link || event.sources[0]?.url || '#',
            country: 'India'
        }));
    }

    // Map GDACS event types
    mapGDACSEventType(type) {
        const mapping = {
            'EQ': 'Earthquake',
            'TC': 'Tropical Cyclone',
            'FL': 'Flood',
            'DR': 'Drought',
            'VO': 'Volcano',
            'WF': 'Wildfire'
        };
        return mapping[type] || type;
    }

    // Map GDACS alert levels
    mapGDACSAlertLevel(level) {
        const mapping = {
            'Red': 'high',
            'Orange': 'medium',
            'Green': 'low'
        };
        return mapping[level] || 'low';
    }

    // Sample data for demonstration (fallback)
    getSampleData() {
        console.log('Using sample data - all live APIs unavailable');
        return [
            {
                id: 'sample-1',
                title: 'Flood Alert in Kerala - Monsoon Impact',
                description: 'Heavy rainfall has caused flooding in several districts of Kerala. Emergency services are responding to rescue operations. Volunteers needed for relief distribution.',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                location: 'Kerala, India',
                disasterType: 'Flood',
                severity: 'high',
                source: 'Sample Data',
                url: '#',
                country: 'India'
            },
            {
                id: 'sample-2',
                title: 'Earthquake Monitoring - Himalayan Region',
                description: 'Seismic activity detected in the Himalayan region. No major damage reported. Authorities monitoring the situation.',
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                location: 'Uttarakhand, India',
                disasterType: 'Earthquake',
                severity: 'medium',
                source: 'Sample Data',
                url: '#',
                country: 'India'
            },
            {
                id: 'sample-3',
                title: 'Heatwave Advisory - North India',
                description: 'Extreme temperatures expected across North Indian states. Health advisory issued for vulnerable populations. Stay hydrated and avoid outdoor activities during peak hours.',
                date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                location: 'Delhi, Rajasthan, UP',
                disasterType: 'Extreme Temperature',
                severity: 'medium',
                source: 'Sample Data',
                url: '#',
                country: 'India'
            },
            {
                id: 'sample-4',
                title: 'Cyclone Watch - Bay of Bengal',
                description: 'Low pressure system developing over Bay of Bengal. Coastal areas advised to stay alert. Fishermen warned not to venture into sea.',
                date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                location: 'Odisha, West Bengal',
                disasterType: 'Cyclone',
                severity: 'high',
                source: 'Sample Data',
                url: '#',
                country: 'India'
            }
        ];
    }

    // Parse ReliefWeb response
    parseReliefWebData(data) {
        return data.map(item => {
            const fields = item.fields;
            
            return {
                id: item.id,
                title: fields.title || 'Disaster Report',
                description: fields.body?.trim() || fields.headline?.summary || 'View full report for details',
                date: new Date(fields.date?.created || fields.date?.original),
                location: this.extractLocation(fields),
                disasterType: this.extractDisasterType(fields),
                severity: this.calculateSeverity(fields),
                source: fields.source?.[0]?.name || 'ReliefWeb',
                url: fields.url || fields.url_alias || '#',
                country: 'India'
            };
        });
    }

    // Extract location from report
    extractLocation(fields) {
        if (fields.primary_country?.name) return fields.primary_country.name;
        if (fields.country?.[0]?.name) return fields.country[0].name;
        if (fields.location?.[0]?.name) return fields.location[0].name;
        return 'India';
    }

    // Extract disaster type
    extractDisasterType(fields) {
        if (fields.disaster_type?.[0]?.name) {
            return fields.disaster_type[0].name;
        }
        if (fields.theme?.[0]?.name) {
            return fields.theme[0].name;
        }
        return 'General Alert';
    }

    // Calculate severity based on keywords and disaster type
    calculateSeverity(fields) {
        const title = (fields.title || '').toLowerCase();
        const body = (fields.body || '').toLowerCase();
        const content = title + ' ' + body;

        // High severity keywords
        if (content.match(/urgent|emergency|critical|severe|major|catastrophic|deadly/i)) {
            return 'high';
        }

        // Disaster type severity
        const disasterType = this.extractDisasterType(fields).toLowerCase();
        if (disasterType.match(/earthquake|cyclone|flood|tsunami/i)) {
            return 'high';
        }
        if (disasterType.match(/storm|landslide|wildfire/i)) {
            return 'medium';
        }

        return 'low';
    }

    // Show loading state
    showLoading() {
        this.container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--dark-color);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
                <p style="font-size: 1.2rem; font-weight: 500;">Loading live disaster updates for India...</p>
                <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">Fetching data from ReliefWeb</p>
            </div>
        `;
    }

    // Show error message
    showError(message) {
        this.container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--primary-color);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <p style="font-size: 1.2rem; font-weight: 500;">Unable to load disaster feed</p>
                <p style="font-size: 0.9rem; opacity: 0.8; margin-top: 0.5rem;">${message}</p>
                <button onclick="disasterFeed.render()" style="margin-top: 1.5rem; padding: 0.8rem 2rem; background: var(--primary-color); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600;">
                    🔄 Retry
                </button>
            </div>
        `;
    }

    // Show empty state
    showEmpty() {
        this.container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--dark-color);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                <p style="font-size: 1.2rem; font-weight: 500;">No active disaster alerts</p>
                <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">All clear for India at the moment</p>
            </div>
        `;
    }

    // Create disaster card HTML
    createDisasterCard(disaster) {
        const severityColors = {
            high: '#e63946',
            medium: '#ffaa00',
            low: '#00b894'
        };

        const severityLabels = {
            high: '🔴 HIGH PRIORITY',
            medium: '🟡 MEDIUM',
            low: '🟢 ALERT'
        };

        const color = severityColors[disaster.severity] || severityColors.low;
        const label = severityLabels[disaster.severity] || severityLabels.low;

        const formattedDate = disaster.date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Truncate description
        const maxLength = 200;
        let description = disaster.description
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/\s+/g, ' ')    // Normalize whitespace
            .trim();
        
        if (description.length > maxLength) {
            description = description.substring(0, maxLength) + '...';
        }

        return `
            <div class="alert-item" data-type="${disaster.disasterType.toLowerCase().replace(/\s+/g, '-')}" data-severity="${disaster.severity}">
                <div class="news-badge" style="background: ${color}; color: white;">
                    ${label} • ${disaster.disasterType.toUpperCase()}
                </div>
                <h4 class="news-title">${this.escapeHtml(disaster.title)}</h4>
                <div class="news-meta">
                    <span>📍 ${this.escapeHtml(disaster.location)}</span>
                    <span>⏰ ${formattedDate}</span>
                </div>
                <p class="news-description">${this.escapeHtml(description)}</p>
                <a href="${disaster.url}" target="_blank" rel="noopener noreferrer" class="help-btn">
                    View Full Report & Offer Help 🤝
                </a>
            </div>
        `;
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Render all disaster cards
    async render() {
        const disasters = await this.fetchDisasterData();

        if (!disasters || disasters.length === 0) {
            this.showEmpty();
            return;
        }

        // Sort by date (newest first) and severity
        disasters.sort((a, b) => {
            const severityOrder = { high: 0, medium: 1, low: 2 };
            if (severityOrder[a.severity] !== severityOrder[b.severity]) {
                return severityOrder[a.severity] - severityOrder[b.severity];
            }
            return b.date - a.date;
        });

        // Render cards
        this.container.innerHTML = disasters.map(disaster => 
            this.createDisasterCard(disaster)
        ).join('');

        // Add last updated timestamp
        const timestamp = document.createElement('div');
        timestamp.style.cssText = 'text-align: center; margin-top: 2rem; color: #666; font-size: 0.9rem;';
        timestamp.innerHTML = `
            <p>Last updated: ${new Date().toLocaleTimeString('en-IN')} | 
            <button onclick="disasterFeed.clearCache(); disasterFeed.render();" style="border: none; background: none; color: var(--primary-color); cursor: pointer; text-decoration: underline; font-size: 0.9rem;">
                🔄 Refresh
            </button></p>
        `;
        this.container.parentElement.appendChild(timestamp);
    }

    // Clear cache manually
    clearCache() {
        this.cache.data = null;
        this.cache.timestamp = null;
        console.log('Cache cleared');
    }

    // Auto-refresh functionality
    enableAutoRefresh(intervalMinutes = 10) {
        setInterval(() => {
            console.log('Auto-refreshing disaster feed...');
            this.clearCache();
            this.render();
        }, intervalMinutes * 60 * 1000);
    }
}

// ============================================
// INITIALIZE THE FEED
// ============================================

// Create global instance
const disasterFeed = new IndiaDisasterFeed('disaster-feed-container');

// Initial render when page loads
document.addEventListener('DOMContentLoaded', () => {
    disasterFeed.render();
    
    // Enable auto-refresh every 10 minutes
    disasterFeed.enableAutoRefresh(10);
});

// Export for use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndiaDisasterFeed;
}