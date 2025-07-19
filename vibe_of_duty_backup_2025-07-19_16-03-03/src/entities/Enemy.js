class Enemy {
    constructor(scene, position, player, assetLoader) {
        this.scene = scene;
        this.player = player;
        this.assetLoader = assetLoader;
        
        // Position and movement
        this.position = { ...position };
        this.rotation = { yaw: 0 };
        this.velocity = { x: 0, z: 0 };
        
        // Enemy properties
        this.maxHealth = 50;
        this.currentHealth = 50;
        this.speed = 2.0; // Slower than player
        this.attackRange = 2.0;
        this.detectionRange = 15.0;
        this.attackDamage = 10;
        this.attackCooldown = 1.5; // seconds between attacks
        
        // AI state
        this.state = 'idle'; // 'idle', 'chasing', 'attacking', 'dead'
        this.lastAttackTime = 0;
        this.lastPlayerPosition = null;
        this.stuckTimer = 0;
        this.stuckThreshold = 2.0; // seconds before considering stuck
        
        // Visual representation
        this.mesh = null;
        this.healthBar = null;
        this.hitEffect = null;
        
        // Physics
        this.radius = 0.4;
        this.height = 1.8;
        this.groundY = 0;
        
        // Unique ID for tracking
        this.id = Math.random().toString(36).substr(2, 9);
        
        this.initialize();
    }

    initialize() {
        this.createVisualRepresentation();
        this.createHealthBar();
        
        console.log(`Enemy ${this.id} spawned at:`, this.position);
    }

    createVisualRepresentation() {
        // Create enemy body (red cube for now)
        const bodyGeometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
        
        let bodyMaterial;
        if (this.assetLoader && this.assetLoader.getTexture('enemy')) {
            bodyMaterial = new THREE.MeshLambertMaterial({ 
                map: this.assetLoader.getTexture('enemy') 
            });
        } else {
            bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        }
        
        this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.position.set(this.position.x, this.position.y + 0.9, this.position.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add enemy identifier for collision detection
        this.mesh.userData = {
            isEnemy: true,
            enemyInstance: this
        };
        
        this.scene.add(this.mesh);
        
        // Create simple "eyes" to show facing direction
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 6);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 0.3, 0.35);
        this.mesh.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 0.3, 0.35);
        this.mesh.add(rightEye);
    }

    createHealthBar() {
        // Create health bar above enemy
        const barWidth = 1.0;
        const barHeight = 0.1;
        
        // Background bar (red)
        const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
        const bgMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        
        this.healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
        this.healthBarBg.position.set(0, 1.2, 0);
        this.mesh.add(this.healthBarBg);
        
        // Health bar (green)
        const healthGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
        const healthMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        
        this.healthBar = new THREE.Mesh(healthGeometry, healthMaterial);
        this.healthBar.position.set(0, 1.2, 0.01);
        this.mesh.add(this.healthBar);
    }

    update(deltaTime) {
        if (this.state === 'dead') {
            return;
        }

        // Update AI behavior
        this.updateAI(deltaTime);
        
        // Apply movement
        this.applyMovement(deltaTime);
        
        // Update visual representation
        this.updateVisuals();
        
        // Update health bar
        this.updateHealthBar();
    }

    updateAI(deltaTime) {
        if (!this.player) return;
        
        const playerPos = this.player.getPosition();
        const distanceToPlayer = this.getDistanceTo(playerPos);
        
        // State machine
        switch (this.state) {
            case 'idle':
                if (distanceToPlayer <= this.detectionRange) {
                    this.state = 'chasing';
                    console.log(`Enemy ${this.id} detected player - chasing!`);
                }
                break;
                
            case 'chasing':
                if (distanceToPlayer <= this.attackRange) {
                    this.state = 'attacking';
                } else if (distanceToPlayer > this.detectionRange * 1.5) {
                    this.state = 'idle';
                    this.velocity.x = 0;
                    this.velocity.z = 0;
                } else {
                    // Move toward player
                    this.moveTowardPlayer(playerPos, deltaTime);
                }
                break;
                
            case 'attacking':
                if (distanceToPlayer > this.attackRange) {
                    this.state = 'chasing';
                } else {
                    this.attackPlayer(deltaTime);
                }
                break;
        }
    }

    moveTowardPlayer(playerPos, deltaTime) {
        // Calculate direction to player
        const direction = {
            x: playerPos.x - this.position.x,
            z: playerPos.z - this.position.z
        };
        
        const distance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        
        if (distance > 0) {
            // Normalize direction
            direction.x /= distance;
            direction.z /= distance;
            
            // Set velocity
            this.velocity.x = direction.x * this.speed;
            this.velocity.z = direction.z * this.speed;
            
            // Update rotation to face player
            this.rotation.yaw = Math.atan2(direction.x, direction.z);
        }
    }

    attackPlayer(deltaTime) {
        const currentTime = performance.now() / 1000;
        
        if (currentTime - this.lastAttackTime >= this.attackCooldown) {
            // Attack the player
            console.log(`Enemy ${this.id} attacks player for ${this.attackDamage} damage!`);
            
            // Apply damage to player
            if (this.player && this.player.takeDamage) {
                this.player.takeDamage(this.attackDamage);
            }
            
            this.lastAttackTime = currentTime;
            
            // Create attack effect
            this.createAttackEffect();
        }
    }

    createAttackEffect() {
        // Simple red flash effect
        const geometry = new THREE.SphereGeometry(0.5, 8, 6);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.6
        });
        
        const effect = new THREE.Mesh(geometry, material);
        effect.position.copy(this.mesh.position);
        this.scene.add(effect);
        
        // Remove effect after short duration
        setTimeout(() => {
            this.scene.remove(effect);
            effect.geometry.dispose();
            effect.material.dispose();
        }, 200);
    }

    applyMovement(deltaTime) {
        if (this.state === 'dead') return;
        
        // Calculate new position
        const newPosition = {
            x: this.position.x + this.velocity.x * deltaTime,
            y: this.position.y,
            z: this.position.z + this.velocity.z * deltaTime
        };
        
        // Simple boundary checking (keep enemies in level)
        const bounds = 18; // Stay within level bounds
        newPosition.x = Math.max(-bounds, Math.min(bounds, newPosition.x));
        newPosition.z = Math.max(-bounds, Math.min(bounds, newPosition.z));
        
        // Update position
        this.position = newPosition;
    }

    updateVisuals() {
        if (this.mesh) {
            this.mesh.position.set(
                this.position.x,
                this.position.y + 0.9,
                this.position.z
            );
            
            // Update rotation
            this.mesh.rotation.y = this.rotation.yaw;
        }
    }

    updateHealthBar() {
        if (this.healthBar) {
            const healthPercent = this.currentHealth / this.maxHealth;
            this.healthBar.scale.x = healthPercent;
            this.healthBar.position.x = (healthPercent - 1) * 0.5;
            
            // Change color based on health
            if (healthPercent > 0.6) {
                this.healthBar.material.color.setHex(0x00ff00); // Green
            } else if (healthPercent > 0.3) {
                this.healthBar.material.color.setHex(0xffff00); // Yellow
            } else {
                this.healthBar.material.color.setHex(0xff0000); // Red
            }
        }
    }

    takeDamage(damage) {
        if (this.state === 'dead') return false;
        
        this.currentHealth -= damage;
        console.log(`Enemy ${this.id} took ${damage} damage! Health: ${this.currentHealth}/${this.maxHealth}`);
        
        // Create hit effect
        this.createHitEffect();
        
        // Switch to chasing if not already
        if (this.state === 'idle') {
            this.state = 'chasing';
        }
        
        if (this.currentHealth <= 0) {
            this.die();
            return true; // Enemy died
        }
        
        return false; // Enemy still alive
    }

    createHitEffect() {
        // Flash red when hit
        const originalColor = this.mesh.material.color.getHex();
        this.mesh.material.color.setHex(0xff4444);
        
        setTimeout(() => {
            this.mesh.material.color.setHex(originalColor);
        }, 100);
        
        // Create spark effect
        const geometry = new THREE.SphereGeometry(0.1, 8, 6);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        
        const spark = new THREE.Mesh(geometry, material);
        spark.position.copy(this.mesh.position);
        spark.position.y += Math.random() * 1.5;
        this.scene.add(spark);
        
        setTimeout(() => {
            this.scene.remove(spark);
            spark.geometry.dispose();
            spark.material.dispose();
        }, 300);
    }

    die() {
        this.state = 'dead';
        console.log(`Enemy ${this.id} died!`);
        
        // Create death effect
        this.createDeathEffect();
        
        // Remove from scene after short delay
        setTimeout(() => {
            this.destroy();
        }, 1000);
    }

    createDeathEffect() {
        // Make enemy fall down
        if (this.mesh) {
            this.mesh.rotation.z = Math.PI / 2; // Fall over
            this.mesh.material.color.setHex(0x666666); // Gray out
        }
    }

    // Utility methods
    getDistanceTo(position) {
        const dx = this.position.x - position.x;
        const dz = this.position.z - position.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    getPosition() {
        return { ...this.position };
    }

    getHealth() {
        return this.currentHealth;
    }

    getMaxHealth() {
        return this.maxHealth;
    }

    isAlive() {
        return this.state !== 'dead';
    }

    getId() {
        return this.id;
    }

    // Cleanup
    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            
            // Dispose of geometry and materials
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            
            // Clean up child objects (eyes, health bar)
            this.mesh.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            
            this.mesh = null;
        }
        
        console.log(`Enemy ${this.id} destroyed`);
    }
}