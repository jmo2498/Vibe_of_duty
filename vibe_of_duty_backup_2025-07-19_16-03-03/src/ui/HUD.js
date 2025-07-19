class HUD {
    constructor(player, enemyManager) {
        this.player = player;
        this.enemyManager = enemyManager;
        
        // Get DOM elements
        this.healthFill = document.getElementById('healthFill');
        this.healthText = document.getElementById('healthText');
        this.ammoCounter = document.getElementById('ammoCounter');
        
        // Update frequency (to avoid updating every frame)
        this.updateTimer = 0;
        this.updateInterval = 0.1; // Update 10 times per second
        
        console.log('HUD initialized');
    }

    update(deltaTime) {
        this.updateTimer += deltaTime;
        
        // Only update UI elements periodically for performance
        if (this.updateTimer >= this.updateInterval) {
            this.updateHealthBar();
            this.updateAmmoCounter();
            this.updateTimer = 0;
        }
    }

    updateHealthBar() {
        if (!this.player || !this.healthFill || !this.healthText) return;
        
        const currentHealth = this.player.getHealth();
        const maxHealth = this.player.getMaxHealth();
        const healthPercent = (currentHealth / maxHealth) * 100;
        
        // Update health bar width
        this.healthFill.style.width = `${healthPercent}%`;
        
        // Update health text
        this.healthText.textContent = `${currentHealth}/${maxHealth}`;
        
        // Change health bar color based on health level
        if (healthPercent > 60) {
            this.healthFill.style.background = 'linear-gradient(90deg, #00ff00 0%, #88ff00 100%)'; // Green
        } else if (healthPercent > 30) {
            this.healthFill.style.background = 'linear-gradient(90deg, #ffff00 0%, #ff8800 100%)'; // Yellow/Orange
        } else {
            this.healthFill.style.background = 'linear-gradient(90deg, #ff0000 0%, #ff4444 100%)'; // Red
        }
        
        // Flash effect when health is very low
        if (healthPercent <= 20) {
            const flashIntensity = Math.sin(performance.now() * 0.01) * 0.3 + 0.7;
            this.healthFill.style.opacity = flashIntensity;
        } else {
            this.healthFill.style.opacity = 1;
        }
    }

    updateAmmoCounter() {
        if (!this.player || !this.ammoCounter) return;
        
        const currentAmmo = this.player.getCurrentAmmo();
        const maxAmmo = this.player.getMaxAmmo();
        const isReloading = this.player.isReloading();
        
        if (isReloading) {
            this.ammoCounter.textContent = 'RELOADING...';
            this.ammoCounter.style.color = '#ffff00'; // Yellow when reloading
        } else {
            this.ammoCounter.textContent = `${currentAmmo}/${maxAmmo}`;
            
            // Change color based on ammo level
            if (currentAmmo === 0) {
                this.ammoCounter.style.color = '#ff0000'; // Red when empty
            } else if (currentAmmo <= 5) {
                this.ammoCounter.style.color = '#ff8800'; // Orange when low
            } else {
                this.ammoCounter.style.color = '#ffffff'; // White when normal
            }
        }
    }

    // Show damage indicator
    showDamageIndicator() {
        // This could be called when player takes damage for additional feedback
        if (this.healthFill) {
            this.healthFill.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.8)';
            setTimeout(() => {
                this.healthFill.style.boxShadow = 'none';
            }, 200);
        }
    }

    // Hide HUD elements (for pause menu, etc.)
    setVisible(visible) {
        const elements = [this.healthFill?.parentElement, this.ammoCounter];
        elements.forEach(element => {
            if (element) {
                element.style.display = visible ? 'block' : 'none';
            }
        });
    }

    // Get current stats for display elsewhere (pause menu, etc.)
    getStats() {
        if (!this.player) return null;
        
        return {
            health: this.player.getHealth(),
            maxHealth: this.player.getMaxHealth(),
            ammo: this.player.getCurrentAmmo(),
            maxAmmo: this.player.getMaxAmmo(),
            isReloading: this.player.isReloading(),
            wave: this.enemyManager ? this.enemyManager.getCurrentWave() : 1,
            enemiesKilled: this.enemyManager ? this.enemyManager.getTotalEnemiesKilled() : 0
        };
    }
}