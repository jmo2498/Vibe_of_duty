class Game {
    constructor() {
        this.scene = null;
        this.assetLoader = null;
        this.player = null;
        this.inputHandler = null;
        this.enemyManager = null;
        this.hud = null;
        this.isRunning = false;
        this.lastTime = 0;
        this.container = null;
        this.loadingScreen = null;
        this.gameState = 'loading'; // 'loading', 'menu', 'playing', 'paused', 'gameover'
        this.assets = {
            textures: {},
            audio: {},
            loaded: false
        };
    }

    async init() {
        console.log('Initializing Vibe of Duty...');
        
        // Get DOM elements
        this.container = document.getElementById('gameContainer');
        this.loadingScreen = document.getElementById('loadingScreen');
        
        if (!this.container) {
            console.error('Game container not found!');
            return;
        }

        // Check WebGL support
        if (!this.checkWebGLSupport()) {
            this.showError('WebGL is not supported in your browser. Please use a modern browser.');
            return;
        }

        try {
            // Initialize asset loader
            this.assetLoader = new AssetLoader();
            await this.assetLoader.init();

            // Load assets with progress feedback
            this.updateLoadingScreen('Loading assets...');
            const assetManifest = this.assetLoader.getDefaultAssetManifest();
            
            this.assets = await this.assetLoader.loadAssets(
                assetManifest,
                (progress) => {
                    this.updateLoadingScreen(`Loading assets... ${Math.round(progress * 100)}%`);
                }
            );

            // Create procedural textures for development
            const proceduralTextures = this.assetLoader.createProceduralTextures();
            Object.assign(this.assets.textures, proceduralTextures);
            this.assets.loaded = true;

            // Initialize scene
            this.updateLoadingScreen('Initializing scene...');
            this.scene = new Scene();
            this.scene.init(this.container);
            
            // Set game reference in scene for collision system
            this.scene.game = this;

            // Pass assets to scene
            this.scene.setAssets(this.assets);

            // Initialize player
            this.updateLoadingScreen('Initializing player...');
            this.player = new Player(this.scene, this.scene.getCamera(), this.assetLoader);

            // Initialize input handler
            this.inputHandler = new InputHandler(this.player, this);

            // Initialize enemy manager
            this.updateLoadingScreen('Spawning enemies...');
            this.enemyManager = new EnemyManager(this.scene, this.player, this.assetLoader);

            // Initialize HUD
            this.updateLoadingScreen('Setting up HUD...');
            this.hud = new HUD(this.player, this.enemyManager);
            
            // Test direct player movement (temporary debug)
            console.log('Setting up direct keyboard test...');
            document.addEventListener('keydown', (e) => {
                console.log('Direct test - key pressed:', e.key);
                if (this.player) {
                    this.player.onKeyDown(e.key);
                }
            });
            document.addEventListener('keyup', (e) => {
                if (this.player) {
                    this.player.onKeyUp(e.key);
                }
            });

            // Hide loading screen and start game
            this.gameState = 'playing';
            if (this.loadingScreen) {
                this.loadingScreen.style.display = 'none';
            }

            // Start game loop
            this.start();
            
            console.log('Vibe of Duty initialized successfully!');
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError('Failed to load game assets. Please refresh and try again.');
        }
    }

    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                     (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
        
        console.log('Game loop started');
    }

    stop() {
        this.isRunning = false;
        console.log('Game loop stopped');
    }

    gameLoop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;

        // Update game logic
        this.update(deltaTime);

        // Render frame
        this.render();

        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        // Don't update game logic if paused
        if (this.gameState === 'paused') {
            return;
        }
        
        // Update player
        if (this.player) {
            this.player.update(deltaTime);
        }
        
        // Update enemy manager
        if (this.enemyManager) {
            this.enemyManager.update(deltaTime);
            
            // Check projectile-enemy collisions
            if (this.player && this.player.weapon) {
                this.enemyManager.checkProjectileHits(this.player.weapon.projectiles);
            }
        }
        
        // Update HUD
        if (this.hud) {
            this.hud.update(deltaTime);
        }
        
        // Update scene
        if (this.scene) {
            this.scene.update(deltaTime);
        }
    }

    render() {
        // Render scene
        if (this.scene) {
            this.scene.render();
        }
    }

    updateLoadingScreen(message) {
        if (this.loadingScreen) {
            this.loadingScreen.innerHTML = `
                <h2>Vibe of Duty</h2>
                <p>${message}</p>
            `;
        }
    }

    showError(message) {
        if (this.loadingScreen) {
            this.loadingScreen.innerHTML = `
                <h2>Error</h2>
                <p style="color: #ff6b6b;">${message}</p>
            `;
        }
    }

    // Utility methods
    getScene() {
        return this.scene;
    }

    getAssetLoader() {
        return this.assetLoader;
    }

    getGameState() {
        return this.gameState;
    }

    setGameState(state) {
        this.gameState = state;
        console.log(`Game state changed to: ${state}`);
        
        // Handle state changes
        if (state === 'paused') {
            this.showPauseMenu();
        } else if (state === 'playing') {
            this.hidePauseMenu();
        } else if (state === 'gameover') {
            this.showGameOverScreen();
        }
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.setGameState('paused');
        } else if (this.gameState === 'paused') {
            this.setGameState('playing');
        }
    }

    showPauseMenu() {
        let pauseMenu = document.getElementById('pauseMenu');
        
        if (!pauseMenu) {
            pauseMenu = document.createElement('div');
            pauseMenu.id = 'pauseMenu';
            pauseMenu.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                font-family: Arial, sans-serif;
                z-index: 1000;
                pointer-events: auto;
            `;
            pauseMenu.innerHTML = `
                <h2>Game Paused</h2>
                <p>Press ESC to resume</p>
                <p>Health: ${this.player ? this.player.getHealth() : 100}/100</p>
                <p>Ammo: ${this.player ? this.player.getCurrentAmmo() : 0}/${this.player ? this.player.getMaxAmmo() : 30}</p>
                <p>Wave: ${this.enemyManager ? this.enemyManager.getCurrentWave() : 1}</p>
                <p>Enemies Killed: ${this.enemyManager ? this.enemyManager.getTotalEnemiesKilled() : 0}</p>
            `;
            document.getElementById('gameContainer').appendChild(pauseMenu);
        } else {
            // Update pause menu with current stats
            pauseMenu.innerHTML = `
                <h2>Game Paused</h2>
                <p>Press ESC to resume</p>
                <p>Health: ${this.player ? this.player.getHealth() : 100}/100</p>
                <p>Ammo: ${this.player ? this.player.getCurrentAmmo() : 0}/${this.player ? this.player.getMaxAmmo() : 30}</p>
                <p>Wave: ${this.enemyManager ? this.enemyManager.getCurrentWave() : 1}</p>
                <p>Enemies Killed: ${this.enemyManager ? this.enemyManager.getTotalEnemiesKilled() : 0}</p>
            `;
            pauseMenu.style.display = 'block';
        }
    }

    hidePauseMenu() {
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
    }

    showGameOverScreen() {
        let gameOverScreen = document.getElementById('gameOverScreen');
        
        if (!gameOverScreen) {
            gameOverScreen = document.createElement('div');
            gameOverScreen.id = 'gameOverScreen';
            gameOverScreen.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 40px;
                border-radius: 10px;
                text-align: center;
                font-family: Arial, sans-serif;
                z-index: 1000;
                pointer-events: auto;
            `;
            document.getElementById('gameContainer').appendChild(gameOverScreen);
        }
        
        gameOverScreen.innerHTML = `
            <h2 style="color: #ff4444;">GAME OVER</h2>
            <p>You survived ${this.enemyManager ? this.enemyManager.getCurrentWave() - 1 : 0} waves</p>
            <p>Enemies Killed: ${this.enemyManager ? this.enemyManager.getTotalEnemiesKilled() : 0}</p>
            <p style="margin-top: 20px;">Refresh page to play again</p>
        `;
        gameOverScreen.style.display = 'block';
    }
}