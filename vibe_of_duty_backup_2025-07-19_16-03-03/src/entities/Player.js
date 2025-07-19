class Player {
    constructor(scene, camera, assetLoader) {
        this.scene = scene;
        this.camera = camera;
        this.assetLoader = assetLoader;

        // Position and rotation
        this.position = { x: 0, y: 1.8, z: 0 };
        this.rotation = { pitch: 0, yaw: 0 };

        // Movement properties
        this.velocity = { x: 0, y: 0, z: 0 };
        this.speed = {
            walk: 5.0,
            run: 8.0,
            jump: 8.0
        };
        this.isOnGround = true;
        this.isRunning = false;

        // Physics
        this.gravity = -20.0;
        this.groundY = 1.8; // Player height above ground
        this.radius = 0.4; // Collision radius

        // Camera settings
        this.mouseSensitivity = 0.002;
        this.maxPitch = Math.PI / 2 - 0.1; // Prevent over-rotation

        // Weapon system
        this.weapon = null;

        // Health system
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.lastDamageTime = 0;
        this.damageImmunityDuration = 0.5; // seconds of immunity after taking damage
        this.isDead = false;

        // Damage effects
        this.damageFlashTimer = 0;
        this.damageFlashDuration = 0.2;

        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            run: false
        };

        this.initialize();
    }

    initialize() {
        // Set initial camera position
        this.updateCameraPosition();

        // Initialize weapon
        this.weapon = new Weapon(this.scene.getScene(), this.assetLoader);

        console.log('Player initialized at position:', this.position);
    }

    update(deltaTime) {
        // Handle movement input
        this.handleMovement(deltaTime);

        // Apply physics
        this.applyPhysics(deltaTime);

        // Update weapon
        if (this.weapon) {
            this.weapon.update(deltaTime, this.camera);
        }

        // Update damage effects
        this.updateDamageEffects(deltaTime);

        // Update camera position and rotation
        this.updateCameraPosition();
        this.updateCameraRotation();
    }

    handleMovement(deltaTime) {
        // Calculate movement direction based on camera rotation
        const moveVector = { x: 0, z: 0 };

        if (this.keys.forward) {
            moveVector.x -= Math.sin(this.rotation.yaw);
            moveVector.z -= Math.cos(this.rotation.yaw);
        }
        if (this.keys.backward) {
            moveVector.x += Math.sin(this.rotation.yaw);
            moveVector.z += Math.cos(this.rotation.yaw);
        }
        if (this.keys.left) {
            moveVector.x -= Math.cos(this.rotation.yaw);
            moveVector.z += Math.sin(this.rotation.yaw);
        }
        if (this.keys.right) {
            moveVector.x += Math.cos(this.rotation.yaw);
            moveVector.z -= Math.sin(this.rotation.yaw);
        }

        // Normalize movement vector
        const length = Math.sqrt(moveVector.x * moveVector.x + moveVector.z * moveVector.z);
        if (length > 0) {
            moveVector.x /= length;
            moveVector.z /= length;
        }

        // Apply speed
        const currentSpeed = this.keys.run ? this.speed.run : this.speed.walk;
        this.velocity.x = moveVector.x * currentSpeed;
        this.velocity.z = moveVector.z * currentSpeed;

        // Debug logging
        if (length > 0) {
            console.log('Movement - Keys:', this.keys, 'Velocity:', this.velocity, 'Position:', this.position);
        }

        // Handle jumping
        if (this.keys.jump && this.isOnGround) {
            this.velocity.y = this.speed.jump;
            this.isOnGround = false;
        }
    }

    applyPhysics(deltaTime) {
        // Apply gravity
        if (!this.isOnGround) {
            this.velocity.y += this.gravity * deltaTime;
        }

        // Calculate new position
        const newPosition = {
            x: this.position.x + this.velocity.x * deltaTime,
            y: this.position.y + this.velocity.y * deltaTime,
            z: this.position.z + this.velocity.z * deltaTime
        };

        // Use simple boundary collision for now (more permissive)
        // Keep player within level bounds but allow free movement
        this.position.x = Math.max(-18, Math.min(18, newPosition.x));
        this.position.z = Math.max(-18, Math.min(18, newPosition.z));
        
        // Vertical movement and ground detection
        if (newPosition.y <= this.groundY) {
            this.position.y = this.groundY;
            this.velocity.y = 0;
            this.isOnGround = true;
        } else {
            this.position.y = newPosition.y;
        }

        // Enhanced obstacle and enemy collision
        if (this.scene && this.scene.getLevel()) {
            // Check collision with level obstacles
            const collision = this.scene.checkCollision(this.position, this.radius);
            if (collision.collision) {
                console.log('Obstacle collision detected!', collision.box);
                // More aggressive pushback from obstacles
                const obstacle = collision.box;
                const pushDistance = 1.0; // Increased push distance
                
                // Calculate direction away from obstacle
                const dx = this.position.x - obstacle.center.x;
                const dz = this.position.z - obstacle.center.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance > 0) {
                    // Push away from obstacle center
                    this.position.x = obstacle.center.x + (dx / distance) * (obstacle.size.x / 2 + this.radius + 0.2);
                    this.position.z = obstacle.center.z + (dz / distance) * (obstacle.size.z / 2 + this.radius + 0.2);
                    console.log('Player pushed to:', this.position);
                }
            }
        } else {
            console.log('Scene or level not available for collision');
        }

        // Check collision with enemies - need to get enemyManager from game
        if (this.scene && this.scene.game && this.scene.game.enemyManager) {
            const enemies = this.scene.game.enemyManager.getEnemies();
            console.log('Checking enemy collision with', enemies.length, 'enemies');
            for (const enemy of enemies) {
                if (!enemy.isAlive()) continue;
                
                const enemyPos = enemy.getPosition();
                const distance = Math.sqrt(
                    Math.pow(this.position.x - enemyPos.x, 2) + 
                    Math.pow(this.position.z - enemyPos.z, 2)
                );
                
                // Enemy collision radius (slightly larger than visual)
                const enemyRadius = 0.6;
                const totalRadius = this.radius + enemyRadius;
                
                if (distance < totalRadius && distance > 0) {
                    console.log('Enemy collision detected! Distance:', distance);
                    // Push player away from enemy
                    const pushDistance = totalRadius - distance + 0.1;
                    const dx = (this.position.x - enemyPos.x) / distance;
                    const dz = (this.position.z - enemyPos.z) / distance;
                    
                    this.position.x += dx * pushDistance;
                    this.position.z += dz * pushDistance;
                }
            }
        }

    }

    updateCameraPosition() {
        this.camera.position.set(
            this.position.x,
            this.position.y,
            this.position.z
        );
    }

    updateCameraRotation() {
        // Apply pitch (up/down rotation)
        this.camera.rotation.x = this.rotation.pitch;

        // Apply yaw (left/right rotation)
        this.camera.rotation.y = this.rotation.yaw;

        // Ensure proper rotation order
        this.camera.rotation.order = 'YXZ';
    }

    // Input handling methods
    onMouseMove(deltaX, deltaY) {
        // Update rotation based on mouse movement
        this.rotation.yaw -= deltaX * this.mouseSensitivity;
        this.rotation.pitch -= deltaY * this.mouseSensitivity;

        // Clamp pitch to prevent over-rotation
        this.rotation.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.rotation.pitch));
    }

    onKeyDown(key) {
        console.log('Player received keyDown:', key);
        switch (key.toLowerCase()) {
            case 'w':
                this.keys.forward = true;
                console.log('Forward key pressed');
                break;
            case 's':
                this.keys.backward = true;
                console.log('Backward key pressed');
                break;
            case 'a':
                this.keys.left = true;
                console.log('Left key pressed');
                break;
            case 'd':
                this.keys.right = true;
                console.log('Right key pressed');
                break;
            case ' ':
                this.keys.jump = true;
                console.log('Jump key pressed');
                break;
            case 'shift':
                this.keys.run = true;
                console.log('Run key pressed');
                break;
            case 'r':
                this.reload();
                break;
        }
        console.log('Current keys state:', this.keys);
    }

    onKeyUp(key) {
        switch (key.toLowerCase()) {
            case 'w':
                this.keys.forward = false;
                break;
            case 's':
                this.keys.backward = false;
                break;
            case 'a':
                this.keys.left = false;
                break;
            case 'd':
                this.keys.right = false;
                break;
            case ' ':
                this.keys.jump = false;
                break;
            case 'shift':
                this.keys.run = false;
                break;
        }
    }

    // Utility methods
    getPosition() {
        return { ...this.position };
    }

    getRotation() {
        return { ...this.rotation };
    }

    getForwardDirection() {
        return {
            x: -Math.sin(this.rotation.yaw),
            y: -Math.sin(this.rotation.pitch),
            z: -Math.cos(this.rotation.yaw)
        };
    }

    // Get shooting direction toward center of screen (slightly below center)
    getShootingDirection() {
        // Get the camera's forward direction vector
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        
        // Adjust slightly downward for better aiming feel
        cameraDirection.y -= 0.02;
        
        // Normalize the direction
        cameraDirection.normalize();
        
        return {
            x: cameraDirection.x,
            y: cameraDirection.y,
            z: cameraDirection.z
        };
    }

    getRightDirection() {
        return {
            x: Math.cos(this.rotation.yaw),
            y: 0,
            z: -Math.sin(this.rotation.yaw)
        };
    }

    setPosition(x, y, z) {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
        this.updateCameraPosition();
    }

    // Weapon methods
    shoot() {
        if (!this.weapon) return false;

        const origin = this.getPosition();
        const direction = this.getShootingDirection();
        
        return this.weapon.fire(origin, direction, this);
    }

    reload() {
        if (!this.weapon) return false;
        return this.weapon.reload();
    }

    // Mouse click handling
    onMouseClick(button) {
        if (button === 0) { // Left click
            this.shoot();
        }
    }

    // Weapon getters for UI
    getCurrentAmmo() {
        return this.weapon ? this.weapon.getCurrentAmmo() : 0;
    }

    getMaxAmmo() {
        return this.weapon ? this.weapon.getMaxAmmo() : 0;
    }

    isReloading() {
        return this.weapon ? this.weapon.getReloadStatus() : false;
    }

    // Health and damage system
    takeDamage(damage) {
        if (this.isDead) return false;

        const currentTime = performance.now() / 1000;
        
        // Check damage immunity
        if (currentTime - this.lastDamageTime < this.damageImmunityDuration) {
            return false; // Still immune from last damage
        }

        this.currentHealth -= damage;
        this.lastDamageTime = currentTime;
        
        console.log(`Player took ${damage} damage! Health: ${this.currentHealth}/${this.maxHealth}`);

        // Create damage effects
        this.createDamageEffect();

        // Check if player died
        if (this.currentHealth <= 0) {
            this.currentHealth = 0;
            this.die();
            return true; // Player died
        }

        return false; // Player still alive
    }

    createDamageEffect() {
        // Screen flash effect
        this.damageFlashTimer = this.damageFlashDuration;
        
        // Create red overlay effect
        this.createScreenFlash();
    }

    createScreenFlash() {
        // Create red flash overlay
        let flashOverlay = document.getElementById('damageFlash');
        
        if (!flashOverlay) {
            flashOverlay = document.createElement('div');
            flashOverlay.id = 'damageFlash';
            flashOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(255, 0, 0, 0.3);
                pointer-events: none;
                z-index: 25;
                opacity: 0;
                transition: opacity 0.1s;
            `;
            document.getElementById('gameContainer').appendChild(flashOverlay);
        }

        // Flash effect
        flashOverlay.style.opacity = '1';
        setTimeout(() => {
            flashOverlay.style.opacity = '0';
        }, 100);
    }

    updateDamageEffects(deltaTime) {
        // Update damage flash timer
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= deltaTime;
        }
    }

    die() {
        this.isDead = true;
        console.log('Player died!');
        
        // Trigger game over
        if (this.scene && this.scene.game) {
            this.scene.game.setGameState('gameover');
        }
    }

    heal(amount) {
        if (this.isDead) return false;
        
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        console.log(`Player healed ${amount} HP! Health: ${this.currentHealth}/${this.maxHealth}`);
        return true;
    }

    // Health getters
    getHealth() {
        return this.currentHealth;
    }

    getMaxHealth() {
        return this.maxHealth;
    }

    getHealthPercent() {
        return this.currentHealth / this.maxHealth;
    }

    isPlayerDead() {
        return this.isDead;
    }

    // Reset to spawn position
    respawn() {
        if (this.scene && this.scene.getLevel()) {
            const spawnPoint = this.scene.getLevel().getPlayerSpawn();
            this.setPosition(spawnPoint.x, spawnPoint.y, spawnPoint.z);
        } else {
            this.setPosition(0, 1.8, 0);
        }

        this.velocity = { x: 0, y: 0, z: 0 };
        this.rotation = { pitch: 0, yaw: 0 };
        this.isOnGround = true;

        // Reset health
        this.currentHealth = this.maxHealth;
        this.isDead = false;
        this.lastDamageTime = 0;

        console.log('Player respawned');
    }
}