class Weapon {
    constructor(scene, assetLoader) {
        this.scene = scene;
        this.assetLoader = assetLoader;
        
        // Weapon properties
        this.name = 'Assault Rifle';
        this.damage = 25;
        this.fireRate = 0.1; // Time between shots in seconds
        this.maxAmmo = 30;
        this.currentAmmo = 30;
        this.range = 100;
        this.spread = 0.02; // Bullet spread accuracy
        
        // Firing state
        this.lastFireTime = 0;
        this.isFiring = false;
        this.isReloading = false;
        
        // Visual effects
        this.muzzleFlash = null;
        this.muzzleFlashDuration = 0.05; // seconds
        this.muzzleFlashTimer = 0;
        
        // Weapon model
        this.weaponModel = null;
        this.weaponGroup = null;
        
        // Projectile management
        this.projectiles = [];
        this.maxProjectiles = 50; // Limit for performance
        
        this.initialize();
    }

    initialize() {
        this.createMuzzleFlash();
        this.createWeaponModel();
        console.log(`${this.name} initialized - Ammo: ${this.currentAmmo}/${this.maxAmmo}`);
    }

    createMuzzleFlash() {
        // Create a simple muzzle flash effect
        const geometry = new THREE.SphereGeometry(0.1, 8, 6);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        
        this.muzzleFlash = new THREE.Mesh(geometry, material);
        this.muzzleFlash.visible = false;
        this.scene.add(this.muzzleFlash);
    }

    createWeaponModel() {
        // Create weapon group to hold all parts
        this.weaponGroup = new THREE.Group();
        
        // Main body (receiver)
        const bodyGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.4);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 0, 0);
        this.weaponGroup.add(body);
        
        // Barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8);
        const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0, 0.02, -0.35);
        this.weaponGroup.add(barrel);
        
        // Stock
        const stockGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.25);
        const stockMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
        const stock = new THREE.Mesh(stockGeometry, stockMaterial);
        stock.position.set(0, -0.02, 0.3);
        this.weaponGroup.add(stock);
        
        // Grip
        const gripGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.08);
        const gripMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
        const grip = new THREE.Mesh(gripGeometry, gripMaterial);
        grip.position.set(0, -0.12, 0.05);
        this.weaponGroup.add(grip);
        
        // Trigger guard
        const triggerGeometry = new THREE.TorusGeometry(0.04, 0.01, 4, 8);
        const triggerMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const trigger = new THREE.Mesh(triggerGeometry, triggerMaterial);
        trigger.rotation.x = Math.PI / 2;
        trigger.position.set(0, -0.08, 0);
        this.weaponGroup.add(trigger);
        
        // Magazine
        const magGeometry = new THREE.BoxGeometry(0.06, 0.2, 0.08);
        const magMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const magazine = new THREE.Mesh(magGeometry, magMaterial);
        magazine.position.set(0, -0.18, -0.05);
        this.weaponGroup.add(magazine);
        
        // Sight (front)
        const sightGeometry = new THREE.BoxGeometry(0.02, 0.03, 0.02);
        const sightMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const frontSight = new THREE.Mesh(sightGeometry, sightMaterial);
        frontSight.position.set(0, 0.06, -0.45);
        this.weaponGroup.add(frontSight);
        
        // Position weapon in first-person view
        this.weaponGroup.position.set(0.3, -0.3, -0.6); // Right side, lower, in front
        this.weaponGroup.rotation.y = -0.1; // Slight angle
        this.weaponGroup.rotation.x = 0.05;
        
        // Add to scene
        this.scene.add(this.weaponGroup);
        
        console.log('Weapon model created');
    }

    update(deltaTime, camera) {
        // Update muzzle flash
        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= deltaTime;
            if (this.muzzleFlashTimer <= 0) {
                this.muzzleFlash.visible = false;
            }
        }
        
        // Update weapon position to follow camera
        this.updateWeaponPosition(camera);
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
    }

    updateWeaponPosition(camera) {
        if (!this.weaponGroup || !camera) return;
        
        // Get camera world position and rotation
        const cameraPosition = camera.position.clone();
        const cameraRotation = camera.rotation.clone();
        
        // Position weapon relative to camera
        const weaponOffset = new THREE.Vector3(0.3, -0.3, -0.6);
        
        // Apply camera rotation to the offset
        weaponOffset.applyEuler(cameraRotation);
        
        // Set weapon position
        this.weaponGroup.position.copy(cameraPosition.add(weaponOffset));
        
        // Set weapon rotation to match camera (with slight offset)
        this.weaponGroup.rotation.copy(cameraRotation);
        this.weaponGroup.rotation.y += -0.1; // Slight angle adjustment
        this.weaponGroup.rotation.x += 0.05;
    }

    canFire() {
        const currentTime = performance.now() / 1000;
        return (
            !this.isReloading &&
            this.currentAmmo > 0 &&
            (currentTime - this.lastFireTime) >= this.fireRate
        );
    }

    fire(origin, direction, player) {
        if (!this.canFire()) {
            // Try to play empty click sound
            if (this.currentAmmo === 0) {
                console.log('*click* - Out of ammo! Press R to reload');
            }
            return false;
        }

        // Consume ammo
        this.currentAmmo--;
        this.lastFireTime = performance.now() / 1000;

        // Apply spread for accuracy
        const spreadDirection = this.applySpread(direction);

        // Create projectile
        const projectile = new Projectile(
            this.scene,
            { ...origin },
            spreadDirection,
            this.damage,
            this.range,
            player
        );
        
        this.projectiles.push(projectile);
        
        // Limit projectile count for performance
        if (this.projectiles.length > this.maxProjectiles) {
            const oldProjectile = this.projectiles.shift();
            oldProjectile.destroy();
        }

        // Show muzzle flash
        this.showMuzzleFlash(origin, direction);

        // Play sound effect
        this.playFireSound();

        console.log(`Fired! Ammo: ${this.currentAmmo}/${this.maxAmmo}`);
        return true;
    }

    applySpread(direction) {
        // Add random spread to direction for weapon accuracy
        const spread = this.spread;
        const spreadX = (Math.random() - 0.5) * spread;
        const spreadY = (Math.random() - 0.5) * spread;
        const spreadZ = (Math.random() - 0.5) * spread;

        return {
            x: direction.x + spreadX,
            y: direction.y + spreadY,
            z: direction.z + spreadZ
        };
    }

    showMuzzleFlash(origin, direction) {
        // Position muzzle flash slightly in front of player
        const flashOffset = 0.5;
        this.muzzleFlash.position.set(
            origin.x + direction.x * flashOffset,
            origin.y + direction.y * flashOffset,
            origin.z + direction.z * flashOffset
        );
        
        this.muzzleFlash.visible = true;
        this.muzzleFlashTimer = this.muzzleFlashDuration;
        
        // Random scale for variety
        const scale = 0.5 + Math.random() * 0.5;
        this.muzzleFlash.scale.set(scale, scale, scale);
    }

    playFireSound() {
        // Play gunshot sound if available
        if (this.assetLoader) {
            this.assetLoader.playSound('gunshot', 0.3);
        }
    }

    updateProjectiles(deltaTime) {
        // Update all active projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            if (projectile.update(deltaTime)) {
                // Projectile is still active
                continue;
            } else {
                // Projectile hit something or expired
                projectile.destroy();
                this.projectiles.splice(i, 1);
            }
        }
    }

    reload() {
        if (this.isReloading || this.currentAmmo === this.maxAmmo) {
            return false;
        }

        this.isReloading = true;
        console.log('Reloading...');

        // Simulate reload time
        setTimeout(() => {
            this.currentAmmo = this.maxAmmo;
            this.isReloading = false;
            console.log(`Reloaded! Ammo: ${this.currentAmmo}/${this.maxAmmo}`);
        }, 2000); // 2 second reload time

        return true;
    }

    // Getters for UI and game state
    getCurrentAmmo() {
        return this.currentAmmo;
    }

    getMaxAmmo() {
        return this.maxAmmo;
    }

    isOutOfAmmo() {
        return this.currentAmmo === 0;
    }

    getReloadStatus() {
        return this.isReloading;
    }

    getName() {
        return this.name;
    }

    getDamage() {
        return this.damage;
    }

    // Cleanup
    dispose() {
        // Remove muzzle flash
        if (this.muzzleFlash) {
            this.scene.remove(this.muzzleFlash);
            this.muzzleFlash.geometry.dispose();
            this.muzzleFlash.material.dispose();
        }

        // Remove weapon model
        if (this.weaponGroup) {
            this.scene.remove(this.weaponGroup);
            
            // Dispose of all weapon parts
            this.weaponGroup.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            
            this.weaponGroup = null;
        }

        // Clean up all projectiles
        this.projectiles.forEach(projectile => {
            projectile.destroy();
        });
        this.projectiles = [];

        console.log('Weapon disposed');
    }
}