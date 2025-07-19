class AssetLoader {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.audioContext = null;
        this.loadedAssets = {
            textures: {},
            audio: {}
        };
        this.loadingProgress = {
            total: 0,
            loaded: 0
        };
    }

    async init() {
        // Initialize Web Audio API
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio context initialized');
        } catch (error) {
            console.warn('Audio context initialization failed:', error);
        }
    }

    async loadAssets(assetManifest, onProgress = null) {
        console.log('Loading game assets...');
        
        const promises = [];
        this.loadingProgress.total = Object.keys(assetManifest.textures || {}).length + 
                                   Object.keys(assetManifest.audio || {}).length;
        this.loadingProgress.loaded = 0;

        // Load textures
        if (assetManifest.textures) {
            for (const [key, path] of Object.entries(assetManifest.textures)) {
                promises.push(this.loadTexture(key, path, onProgress));
            }
        }

        // Load audio files
        if (assetManifest.audio) {
            for (const [key, path] of Object.entries(assetManifest.audio)) {
                promises.push(this.loadAudio(key, path, onProgress));
            }
        }

        try {
            await Promise.all(promises);
            console.log('All assets loaded successfully');
            return this.loadedAssets;
        } catch (error) {
            console.error('Error loading assets:', error);
            throw error;
        }
    }

    loadTexture(key, path, onProgress = null) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                path,
                (texture) => {
                    // Configure texture settings
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    
                    this.loadedAssets.textures[key] = texture;
                    this.loadingProgress.loaded++;
                    
                    if (onProgress) {
                        onProgress(this.loadingProgress.loaded / this.loadingProgress.total);
                    }
                    
                    console.log(`Texture loaded: ${key}`);
                    resolve(texture);
                },
                (progress) => {
                    // Loading progress callback
                },
                (error) => {
                    console.warn(`Failed to load texture ${key} from ${path}:`, error);
                    // Create a default colored texture as fallback
                    const canvas = document.createElement('canvas');
                    canvas.width = canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ff6b35';
                    ctx.fillRect(0, 0, 64, 64);
                    
                    const fallbackTexture = new THREE.CanvasTexture(canvas);
                    this.loadedAssets.textures[key] = fallbackTexture;
                    this.loadingProgress.loaded++;
                    
                    if (onProgress) {
                        onProgress(this.loadingProgress.loaded / this.loadingProgress.total);
                    }
                    
                    resolve(fallbackTexture);
                }
            );
        });
    }

    loadAudio(key, path, onProgress = null) {
        return new Promise((resolve, reject) => {
            if (!this.audioContext) {
                console.warn(`Audio context not available, skipping ${key}`);
                this.loadingProgress.loaded++;
                if (onProgress) {
                    onProgress(this.loadingProgress.loaded / this.loadingProgress.total);
                }
                resolve(null);
                return;
            }

            fetch(path)
                .then(response => response.arrayBuffer())
                .then(data => this.audioContext.decodeAudioData(data))
                .then(audioBuffer => {
                    this.loadedAssets.audio[key] = audioBuffer;
                    this.loadingProgress.loaded++;
                    
                    if (onProgress) {
                        onProgress(this.loadingProgress.loaded / this.loadingProgress.total);
                    }
                    
                    console.log(`Audio loaded: ${key}`);
                    resolve(audioBuffer);
                })
                .catch(error => {
                    console.warn(`Failed to load audio ${key} from ${path}:`, error);
                    this.loadedAssets.audio[key] = null;
                    this.loadingProgress.loaded++;
                    
                    if (onProgress) {
                        onProgress(this.loadingProgress.loaded / this.loadingProgress.total);
                    }
                    
                    resolve(null);
                });
        });
    }

    getTexture(key) {
        return this.loadedAssets.textures[key] || null;
    }

    getAudio(key) {
        return this.loadedAssets.audio[key] || null;
    }

    playSound(key, volume = 1.0) {
        if (!this.audioContext || !this.loadedAssets.audio[key]) {
            return null;
        }

        try {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = this.loadedAssets.audio[key];
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start();
            return source;
        } catch (error) {
            console.warn(`Failed to play sound ${key}:`, error);
            return null;
        }
    }

    // Create default asset manifest for the game
    getDefaultAssetManifest() {
        return {
            textures: {
                // We'll add texture paths here later when we have actual texture files
                // For now, we'll use procedural textures
            },
            audio: {
                // We'll add audio paths here later when we have actual audio files
                // For now, we'll use Web Audio API to generate sounds
            }
        };
    }

    // Generate procedural textures for development
    createProceduralTextures() {
        const textures = {};
        
        // Create a simple wall texture
        textures.wall = this.createColorTexture('#8B4513', 64, 64);
        
        // Create a floor texture
        textures.floor = this.createColorTexture('#90EE90', 64, 64);
        
        // Create an enemy texture
        textures.enemy = this.createColorTexture('#FF0000', 32, 32);
        
        return textures;
    }

    createColorTexture(color, width = 64, height = 64) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        
        // Add some noise for texture
        for (let i = 0; i < width * height * 0.1; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            const brightness = Math.random() * 0.3 - 0.15;
            
            ctx.fillStyle = this.adjustBrightness(color, brightness);
            ctx.fillRect(x, y, 1, 1);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    adjustBrightness(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount * 255));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount * 255));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount * 255));
        
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }
}