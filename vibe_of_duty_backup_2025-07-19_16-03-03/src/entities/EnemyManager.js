class EnemyManager {
    constructor(scene, player, assetLoader) {
        this.scene = scene;
        this.player = player;
        this.assetLoader = assetLoader;
        
        // Enemy management
        this.enemies = [];
        this.maxEnemies = 8;
        this.spawnPoints = [];
        this.spawnCooldown = 3.0; // seconds between spawns
        this.lastSpawnTime = 0;
        
        // Wave system
        this.currentWave = 1;
        this.enemiesPerWave = 4;
        this.enemiesKilled = 0;
        this.waveInProgress = false;
        
        this.initialize();
    }

    initialize() {
        // Get spawn points from level
        if (this.scene && this.scene.getLevel()) {
            this.spawnPoints = this.scene.getLevel().getEnemySpawns();
        } else {
            // Default spawn points if no level
            this.spawnPoints = [
                { x: 10, y: 0, z: 10 },
                { x: -10, y: 0, z: 10 },
                { x: 10, y: 0, z: -10 },
                { x: -10, y: 0, z: -10 },
                { x: 15, y: 0, z: 0 },
                { x: -15, y: 0, z: 0 },
                { x: 0, y: 0, z: 15 },
                { x: 0, y: 0, z: -15 }
            ];
        }
        
        console.log('EnemyManager initialized with', this.spawnPoints.length, 'spawn points');
        
        // Start first wave
        this.startWave();
    }

    update(deltaTime) {
        // Update all enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (enemy.isAlive()) {
                enemy.update(deltaTime);
            } else {
                // Remove dead enemy
                this.enemies.splice(i, 1);
                this.enemiesKilled++;
                console.log(`Enemy eliminated! Total killed: ${this.enemiesKilled}`);
            }
        }
        
        // Check wave completion
        if (this.waveInProgress && this.enemies.length === 0) {
            this.completeWave();
        }
        
        // Spawn new enemies if needed
        this.handleSpawning(deltaTime);
    }

    startWave() {
        this.waveInProgress = true;
        const enemiesToSpawn = Math.min(this.enemiesPerWave + this.currentWave - 1, this.maxEnemies);
        
        console.log(`Starting Wave ${this.currentWave} - Spawning ${enemiesToSpawn} enemies`);
        
        // Spawn initial enemies for the wave
        for (let i = 0; i < enemiesToSpawn; i++) {
            setTimeout(() => {
                this.spawnEnemy();
            }, i * 500); // Stagger spawns by 0.5 seconds
        }
    }

    completeWave() {
        this.waveInProgress = false;
        this.currentWave++;
        
        console.log(`Wave ${this.currentWave - 1} completed! Starting wave ${this.currentWave} in 5 seconds...`);
        
        // Start next wave after delay
        setTimeout(() => {
            this.startWave();
        }, 5000);
    }

    handleSpawning(deltaTime) {
        const currentTime = performance.now() / 1000;
        
        // Don't spawn if we have enough enemies or wave isn't in progress
        if (!this.waveInProgress || this.enemies.length >= this.maxEnemies) {
            return;
        }
        
        // Check spawn cooldown
        if (currentTime - this.lastSpawnTime >= this.spawnCooldown) {
            // Occasionally spawn replacement enemies during wave
            if (Math.random() < 0.3) { // 30% chance
                this.spawnEnemy();
                this.lastSpawnTime = currentTime;
            }
        }
    }

    spawnEnemy() {
        if (this.enemies.length >= this.maxEnemies) {
            return null;
        }
        
        // Choose random spawn point
        const spawnPoint = this.getRandomSpawnPoint();
        if (!spawnPoint) {
            console.warn('No valid spawn points available');
            return null;
        }
        
        // Create enemy
        const enemy = new Enemy(
            this.scene.getScene(), 
            spawnPoint, 
            this.player, 
            this.assetLoader
        );
        
        this.enemies.push(enemy);
        console.log(`Enemy spawned at (${spawnPoint.x}, ${spawnPoint.z}). Total enemies: ${this.enemies.length}`);
        
        return enemy;
    }

    getRandomSpawnPoint() {
        if (this.spawnPoints.length === 0) {
            return null;
        }
        
        // Filter spawn points that are far enough from player
        const playerPos = this.player.getPosition();
        const minDistance = 8; // Minimum distance from player
        
        const validSpawns = this.spawnPoints.filter(spawn => {
            const distance = Math.sqrt(
                Math.pow(spawn.x - playerPos.x, 2) + 
                Math.pow(spawn.z - playerPos.z, 2)
            );
            return distance >= minDistance;
        });
        
        if (validSpawns.length === 0) {
            // If no valid spawns, use any spawn point
            return this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
        }
        
        return validSpawns[Math.floor(Math.random() * validSpawns.length)];
    }

    // Handle projectile hits
    checkProjectileHits(projectiles) {
        for (const projectile of projectiles) {
            if (!projectile.isProjectileActive()) continue;
            
            const projectilePos = projectile.getPosition();
            
            for (const enemy of this.enemies) {
                if (!enemy.isAlive()) continue;
                
                const enemyPos = enemy.getPosition();
                const distance = Math.sqrt(
                    Math.pow(projectilePos.x - enemyPos.x, 2) +
                    Math.pow(projectilePos.y - enemyPos.y, 2) +
                    Math.pow(projectilePos.z - enemyPos.z, 2)
                );
                
                // Check if projectile hit enemy (simple sphere collision)
                if (distance <= 1.2) {
                    const damage = projectile.getDamage();
                    const enemyDied = enemy.takeDamage(damage);
                    
                    // Destroy projectile
                    projectile.destroy();
                    
                    console.log(`Projectile hit enemy for ${damage} damage!`);
                    
                    if (enemyDied) {
                        console.log('Enemy eliminated by projectile!');
                    }
                    
                    break; // Projectile can only hit one enemy
                }
            }
        }
    }

    // Getters for game state and UI
    getEnemyCount() {
        return this.enemies.filter(enemy => enemy.isAlive()).length;
    }

    getTotalEnemiesKilled() {
        return this.enemiesKilled;
    }

    getCurrentWave() {
        return this.currentWave;
    }

    getEnemies() {
        return this.enemies.filter(enemy => enemy.isAlive());
    }

    isWaveInProgress() {
        return this.waveInProgress;
    }

    // Force spawn enemy (for testing)
    forceSpawnEnemy() {
        return this.spawnEnemy();
    }

    // Clear all enemies (for game reset)
    clearAllEnemies() {
        this.enemies.forEach(enemy => {
            enemy.destroy();
        });
        this.enemies = [];
        this.waveInProgress = false;
    }

    // Cleanup
    dispose() {
        this.clearAllEnemies();
        console.log('EnemyManager disposed');
    }
}