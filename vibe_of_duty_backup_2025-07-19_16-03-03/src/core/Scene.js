class Scene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.lights = [];
        this.assets = null;
        this.level = null;
        this.game = null; // Reference to game instance
    }

    init(container) {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, // Field of view
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near clipping plane
            1000 // Far clipping plane
        );
        this.camera.position.set(0, 2, 5);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add renderer to container
        container.appendChild(this.renderer.domElement);

        // Setup lighting
        this.setupLighting();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);

        // Directional light for shadows and definition
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        this.lights.push(directionalLight);
    }

    update(deltaTime) {
        // Scene update logic (cube removed)
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    getCamera() {
        return this.camera;
    }

    getScene() {
        return this.scene;
    }

    getRenderer() {
        return this.renderer;
    }

    setAssets(assets) {
        this.assets = assets;
        console.log('Assets loaded into scene:', assets);
        
        // Initialize level with assets
        this.initializeLevel();
        
        // Update materials with loaded textures if available
        if (this.assets && this.assets.textures) {
            this.updateMaterialsWithTextures();
        }
    }

    updateMaterialsWithTextures() {
        // Materials are now handled by the Level system
        // This method can be used for future dynamic material updates
    }

    initializeLevel() {
        if (!this.assets) {
            console.warn('Assets not loaded, cannot initialize level');
            return;
        }

        // Remove the simple ground plane since Level will create proper geometry
        const existingGround = this.scene.children.find(child => 
            child.geometry && child.geometry.type === 'PlaneGeometry'
        );
        if (existingGround) {
            this.scene.remove(existingGround);
            existingGround.geometry.dispose();
            existingGround.material.dispose();
        }

        // Initialize level
        this.level = new Level(this.scene, this.assets);
        this.level.init();
        
        console.log('Level initialized with collision system');
    }

    getLevel() {
        return this.level;
    }

    // Collision testing methods for other systems to use
    checkCollision(position, radius = 0.5) {
        if (!this.level) return { collision: false };
        return this.level.checkCollision(position, radius);
    }

    getValidPosition(currentPos, newPos, radius = 0.5) {
        if (!this.level) return newPos;
        return this.level.getValidPosition(currentPos, newPos, radius);
    }

    raycastCollision(origin, direction, maxDistance = 100) {
        if (!this.level) return { hit: false };
        return this.level.raycastCollision(origin, direction, maxDistance);
    }

    getAssets() {
        return this.assets;
    }
}