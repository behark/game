/**
 * CustomizationUI.js
 * Comprehensive car customization system with paint, liveries, and performance tuning
 */

class CustomizationUI {
    constructor(container) {
        this.container = container;
        
        // Current customization state
        this.state = {
            activeTab: 'paint',
            selectedCar: null,
            unsavedChanges: false
        };
        
        // Customization data
        this.customization = {
            paint: {
                baseColor: '#ff0000',
                metallic: 0.8,
                roughness: 0.2,
                clearcoat: 1.0
            },
            livery: {
                template: 'none',
                primaryColor: '#ffffff',
                secondaryColor: '#000000',
                accentColor: '#ffff00',
                number: '1',
                sponsor: 'none'
            },
            performance: {
                engine: 0, // 0-5 upgrade level
                transmission: 0,
                suspension: 0,
                brakes: 0,
                tires: 0,
                aerodynamics: 0
            },
            wheels: {
                style: 'sport',
                size: 18,
                color: '#333333'
            }
        };
        
        // Available options
        this.options = {
            liveryTemplates: [
                'none', 'racing-stripes', 'flames', 'camo', 'carbon-fiber',
                'gradient', 'checkerboard', 'tribal', 'digital', 'sponsor-heavy'
            ],
            wheelStyles: ['sport', 'racing', 'classic', 'modern', 'off-road'],
            sponsors: ['none', 'Speed Rivals', 'Turbo Max', 'Nitro Pro', 'Apex Racing']
        };
        
        this.initialize();
    }

    /**
     * Initialize UI
     */
    initialize() {
        this.createUI();
        this.attachEventListeners();
        console.log('✅ Customization UI initialized');
    }

    /**
     * Create customization interface
     */
    createUI() {
        const ui = document.createElement('div');
        ui.id = 'customization-ui';
        ui.innerHTML = `
            <div class="customization-panel">
                <div class="customization-header">
                    <h2>🎨 Car Customization</h2>
                    <button class="close-btn" onclick="customizationUI.close()">✕</button>
                </div>
                
                <div class="customization-tabs">
                    <button class="tab-btn active" data-tab="paint">Paint</button>
                    <button class="tab-btn" data-tab="livery">Livery</button>
                    <button class="tab-btn" data-tab="performance">Performance</button>
                    <button class="tab-btn" data-tab="wheels">Wheels</button>
                </div>
                
                <div class="customization-content">
                    <!-- Paint Tab -->
                    <div class="tab-content active" id="paint-tab">
                        <h3>Paint Finish</h3>
                        
                        <div class="control-group">
                            <label>Base Color</label>
                            <input type="color" id="base-color" value="${this.customization.paint.baseColor}">
                        </div>
                        
                        <div class="control-group">
                            <label>Metallic: <span id="metallic-value">${this.customization.paint.metallic}</span></label>
                            <input type="range" id="metallic" min="0" max="1" step="0.1" value="${this.customization.paint.metallic}">
                        </div>
                        
                        <div class="control-group">
                            <label>Roughness: <span id="roughness-value">${this.customization.paint.roughness}</span></label>
                            <input type="range" id="roughness" min="0" max="1" step="0.1" value="${this.customization.paint.roughness}">
                        </div>
                        
                        <div class="control-group">
                            <label>Clearcoat: <span id="clearcoat-value">${this.customization.paint.clearcoat}</span></label>
                            <input type="range" id="clearcoat" min="0" max="1" step="0.1" value="${this.customization.paint.clearcoat}">
                        </div>
                        
                        <div class="preset-colors">
                            <h4>Preset Colors</h4>
                            <div class="color-grid">
                                ${this.createColorPresets()}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Livery Tab -->
                    <div class="tab-content" id="livery-tab">
                        <h3>Livery Design</h3>
                        
                        <div class="control-group">
                            <label>Template</label>
                            <select id="livery-template">
                                ${this.options.liveryTemplates.map(t => 
                                    `<option value="${t}">${this.formatName(t)}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="control-group">
                            <label>Primary Color</label>
                            <input type="color" id="primary-color" value="${this.customization.livery.primaryColor}">
                        </div>
                        
                        <div class="control-group">
                            <label>Secondary Color</label>
                            <input type="color" id="secondary-color" value="${this.customization.livery.secondaryColor}">
                        </div>
                        
                        <div class="control-group">
                            <label>Accent Color</label>
                            <input type="color" id="accent-color" value="${this.customization.livery.accentColor}">
                        </div>
                        
                        <div class="control-group">
                            <label>Racing Number</label>
                            <input type="number" id="racing-number" min="0" max="999" value="${this.customization.livery.number}">
                        </div>
                        
                        <div class="control-group">
                            <label>Sponsor</label>
                            <select id="sponsor">
                                ${this.options.sponsors.map(s => 
                                    `<option value="${s}">${this.formatName(s)}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <!-- Performance Tab -->
                    <div class="tab-content" id="performance-tab">
                        <h3>Performance Upgrades</h3>
                        <p class="info">Each upgrade costs credits and improves car performance</p>
                        
                        ${this.createPerformanceUpgrades()}
                    </div>
                    
                    <!-- Wheels Tab -->
                    <div class="tab-content" id="wheels-tab">
                        <h3>Wheel Customization</h3>
                        
                        <div class="control-group">
                            <label>Style</label>
                            <select id="wheel-style">
                                ${this.options.wheelStyles.map(s => 
                                    `<option value="${s}">${this.formatName(s)}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="control-group">
                            <label>Size: <span id="wheel-size-value">${this.customization.wheels.size}"</span></label>
                            <input type="range" id="wheel-size" min="16" max="22" step="1" value="${this.customization.wheels.size}">
                        </div>
                        
                        <div class="control-group">
                            <label>Color</label>
                            <input type="color" id="wheel-color" value="${this.customization.wheels.color}">
                        </div>
                    </div>
                </div>
                
                <div class="customization-footer">
                    <button class="btn-secondary" onclick="customizationUI.reset()">Reset</button>
                    <button class="btn-primary" onclick="customizationUI.save()">Save Changes</button>
                </div>
            </div>
        `;
        
        this.container.appendChild(ui);
        this.applyStyles();
    }

    /**
     * Create color preset buttons
     */
    createColorPresets() {
        const presets = [
            { name: 'Red', color: '#ff0000' },
            { name: 'Blue', color: '#0000ff' },
            { name: 'Green', color: '#00ff00' },
            { name: 'Yellow', color: '#ffff00' },
            { name: 'Orange', color: '#ff6600' },
            { name: 'Purple', color: '#8800ff' },
            { name: 'White', color: '#ffffff' },
            { name: 'Black', color: '#000000' },
            { name: 'Silver', color: '#c0c0c0' },
            { name: 'Gold', color: '#ffd700' }
        ];
        
        return presets.map(p => 
            `<button class="color-preset" style="background-color: ${p.color}" 
                     onclick="customizationUI.applyColorPreset('${p.color}')" 
                     title="${p.name}"></button>`
        ).join('');
    }

    /**
     * Create performance upgrade controls
     */
    createPerformanceUpgrades() {
        const upgrades = [
            { id: 'engine', name: 'Engine', icon: '⚙️', cost: 5000 },
            { id: 'transmission', name: 'Transmission', icon: '🔧', cost: 3000 },
            { id: 'suspension', name: 'Suspension', icon: '🔩', cost: 2500 },
            { id: 'brakes', name: 'Brakes', icon: '🛑', cost: 2000 },
            { id: 'tires', name: 'Tires', icon: '⭕', cost: 1500 },
            { id: 'aerodynamics', name: 'Aerodynamics', icon: '🏎️', cost: 4000 }
        ];
        
        return upgrades.map(u => `
            <div class="upgrade-item">
                <div class="upgrade-header">
                    <span class="upgrade-icon">${u.icon}</span>
                    <span class="upgrade-name">${u.name}</span>
                    <span class="upgrade-cost">$${u.cost.toLocaleString()}</span>
                </div>
                <div class="upgrade-bar">
                    ${[0,1,2,3,4,5].map(level => `
                        <button class="upgrade-level ${level <= this.customization.performance[u.id] ? 'active' : ''}" 
                                onclick="customizationUI.upgradePerformance('${u.id}', ${level})"
                                data-upgrade="${u.id}" data-level="${level}">
                        </button>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    /**
     * Apply CSS styles
     */
    applyStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #customization-ui {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            #customization-ui.active {
                display: flex;
            }
            
            .customization-panel {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 20px;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }
            
            .customization-header {
                background: linear-gradient(90deg, #ff6b6b, #4ecdc4);
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .customization-header h2 {
                margin: 0;
                color: white;
                font-size: 24px;
            }
            
            .close-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 20px;
            }
            
            .customization-tabs {
                display: flex;
                background: rgba(0, 0, 0, 0.3);
                border-bottom: 2px solid #ff6b6b;
            }
            
            .tab-btn {
                flex: 1;
                padding: 15px;
                background: transparent;
                border: none;
                color: #ccc;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .tab-btn.active {
                background: rgba(255, 107, 107, 0.2);
                color: white;
                border-bottom: 3px solid #ff6b6b;
            }
            
            .customization-content {
                padding: 20px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }
            
            .control-group {
                margin-bottom: 20px;
            }
            
            .control-group label {
                display: block;
                color: #ddd;
                margin-bottom: 8px;
                font-weight: bold;
            }
            
            .control-group input[type="color"],
            .control-group select {
                width: 100%;
                padding: 10px;
                border-radius: 8px;
                border: 2px solid #333;
                background: #222;
                color: white;
            }
            
            .control-group input[type="range"] {
                width: 100%;
            }
            
            .color-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 10px;
            }
            
            .color-preset {
                width: 50px;
                height: 50px;
                border-radius: 8px;
                border: 3px solid #333;
                cursor: pointer;
                transition: transform 0.2s;
            }
            
            .color-preset:hover {
                transform: scale(1.1);
                border-color: #ff6b6b;
            }
            
            .upgrade-item {
                background: rgba(255, 255, 255, 0.05);
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 15px;
            }
            
            .upgrade-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .upgrade-name {
                color: white;
                font-weight: bold;
            }
            
            .upgrade-cost {
                color: #4ecdc4;
                font-weight: bold;
            }
            
            .upgrade-bar {
                display: flex;
                gap: 5px;
            }
            
            .upgrade-level {
                flex: 1;
                height: 30px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid #333;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .upgrade-level.active {
                background: linear-gradient(90deg, #ff6b6b, #ffd700);
                border-color: #ffd700;
            }
            
            .customization-footer {
                padding: 20px;
                background: rgba(0, 0, 0, 0.3);
                display: flex;
                justify-content: space-between;
            }
            
            .btn-primary, .btn-secondary {
                padding: 12px 30px;
                border-radius: 8px;
                border: none;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .btn-primary {
                background: linear-gradient(90deg, #ff6b6b, #4ecdc4);
                color: white;
            }
            
            .btn-secondary {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }
            
            .info {
                color: #aaa;
                font-size: 14px;
                margin-bottom: 15px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Paint controls
        document.getElementById('base-color')?.addEventListener('input', (e) => {
            this.customization.paint.baseColor = e.target.value;
            this.state.unsavedChanges = true;
            this.updatePreview();
        });
        
        ['metallic', 'roughness', 'clearcoat'].forEach(prop => {
            const input = document.getElementById(prop);
            if (input) {
                input.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    this.customization.paint[prop] = value;
                    document.getElementById(`${prop}-value`).textContent = value.toFixed(1);
                    this.state.unsavedChanges = true;
                    this.updatePreview();
                });
            }
        });
    }

    /**
     * Switch tab
     */
    switchTab(tabName) {
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        this.state.activeTab = tabName;
    }

    /**
     * Apply color preset
     */
    applyColorPreset(color) {
        this.customization.paint.baseColor = color;
        document.getElementById('base-color').value = color;
        this.state.unsavedChanges = true;
        this.updatePreview();
    }

    /**
     * Upgrade performance
     */
    upgradePerformance(category, level) {
        this.customization.performance[category] = level;
        
        // Update visual
        document.querySelectorAll(`[data-upgrade="${category}"]`).forEach((btn, index) => {
            btn.classList.toggle('active', index <= level);
        });
        
        this.state.unsavedChanges = true;
    }

    /**
     * Update live preview
     */
    updatePreview() {
        // Dispatch event for 3D preview update
        window.dispatchEvent(new CustomEvent('customization-update', {
            detail: this.customization
        }));
    }

    /**
     * Save customization
     */
    save() {
        // Save to localStorage
        localStorage.setItem('carCustomization', JSON.stringify(this.customization));
        this.state.unsavedChanges = false;
        
        console.log('Customization saved:', this.customization);
        alert('✅ Customization saved!');
        this.close();
    }

    /**
     * Reset to defaults
     */
    reset() {
        if (confirm('Reset all customizations to default?')) {
            location.reload();
        }
    }

    /**
     * Show UI
     */
    show() {
        document.getElementById('customization-ui').classList.add('active');
    }

    /**
     * Close UI
     */
    close() {
        if (this.state.unsavedChanges) {
            if (!confirm('You have unsaved changes. Close anyway?')) {
                return;
            }
        }
        document.getElementById('customization-ui').classList.remove('active');
    }

    /**
     * Format name for display
     */
    formatName(str) {
        return str.split('-').map(w => 
            w.charAt(0).toUpperCase() + w.slice(1)
        ).join(' ');
    }

    /**
     * Get current customization
     */
    getCustomization() {
        return { ...this.customization };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CustomizationUI;
}
