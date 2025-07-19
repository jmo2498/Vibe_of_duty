class InputHandler {
    constructor(player, game) {
        this.player = player;
        this.game = game;
        
        // Pointer lock state
        this.isPointerLocked = false;
        this.pointerLockElement = null;
        
        // Mouse state
        this.mouseState = {
            x: 0,
            y: 0,
            buttons: {
                left: false,
                right: false,
                middle: false
            }
        };
        
        // Keyboard state
        this.keyState = {};
        
        this.initialize();
    }

    initialize() {
        console.log('Initializing input handler...');
        
        // Set up event listeners
        this.setupKeyboardEvents();
        this.setupMouseEvents();
        this.setupPointerLock();
        

        
        console.log('Input handler initialized');
    }

    setupKeyboardEvents() {
        console.log('Setting up keyboard events...');
        
        // Use arrow functions to preserve 'this' context
        this.keyDownHandler = (event) => {
            console.log('Keydown captured by InputHandler:', event.key);
            this.onKeyDown(event);
        };
        
        this.keyUpHandler = (event) => {
            console.log('Keyup captured by InputHandler:', event.key);
            this.onKeyUp(event);
        };
        
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
        
        console.log('Keyboard events set up successfully');
    }

    setupMouseEvents() {
        document.addEventListener('mousemove', (event) => {
            this.onMouseMove(event);
        });

        document.addEventListener('mousedown', (event) => {
            this.onMouseDown(event);
        });

        document.addEventListener('mouseup', (event) => {
            this.onMouseUp(event);
        });

        // Handle mouse wheel for future weapon switching
        document.addEventListener('wheel', (event) => {
            this.onMouseWheel(event);
        });
    }

    setupPointerLock() {
        // Get the game container for pointer lock
        this.pointerLockElement = document.getElementById('gameContainer');
        
        if (!this.pointerLockElement) {
            console.warn('Game container not found for pointer lock');
            return;
        }

        // Pointer lock change events
        document.addEventListener('pointerlockchange', () => {
            this.onPointerLockChange();
        });

        document.addEventListener('pointerlockerror', () => {
            console.error('Pointer lock error');
        });

        // Click to lock pointer
        this.pointerLockElement.addEventListener('click', () => {
            this.requestPointerLock();
        });
    }

    requestPointerLock() {
        if (this.pointerLockElement && !this.isPointerLocked) {
            this.pointerLockElement.requestPointerLock();
        }
    }

    exitPointerLock() {
        if (this.isPointerLocked) {
            document.exitPointerLock();
        }
    }

    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === this.pointerLockElement;
        
        if (this.isPointerLocked) {
            console.log('Pointer locked - mouse look enabled');
            // Don't automatically show/hide instructions - let TAB handle it
        } else {
            console.log('Pointer unlocked - mouse look disabled');
            // Don't automatically show instructions - let TAB handle it
        }
    }

    showInstructions(show) {
        // Create or update instruction overlay
        let instructions = document.getElementById('instructions');
        
        if (show && !instructions) {
            instructions = document.createElement('div');
            instructions.id = 'instructions';
            instructions.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                font-family: Arial, sans-serif;
                z-index: 1000;
                pointer-events: none;
            `;
            instructions.innerHTML = `
                <h3>Vibe of Duty Controls</h3>
                <p><strong>Click to start playing</strong></p>
                <p>WASD - Move</p>
                <p>Mouse - Look around</p>
                <p>Shift - Run</p>
                <p>Space - Jump</p>
                <p>ESC - Pause/Menu</p>
            `;
            document.body.appendChild(instructions);
        } else if (!show && instructions) {
            instructions.remove();
        }
    }

    onKeyDown(event) {
        console.log('InputHandler received keyDown:', event.key, event.code);
        const key = event.code || event.key;
        
        // Prevent default for game keys
        if (this.isGameKey(key)) {
            event.preventDefault();
        }
        
        // Store key state
        this.keyState[key] = true;
        
        // Handle special keys
        switch(key) {
            case 'Escape':
                this.handleEscapeKey();
                break;
            case 'Tab':
                event.preventDefault(); // Prevent browser tab switching
                this.handleTabKey();
                break;
            case 'F11':
                this.toggleFullscreen();
                break;
            default:
                // Pass to player only if game is not paused
                if (this.player && this.game && this.game.getGameState() !== 'paused') {
                    console.log('Passing key to player:', event.key);
                    this.player.onKeyDown(event.key);
                } else if (this.game && this.game.getGameState() === 'paused') {
                    console.log('Game is paused - ignoring movement input');
                } else {
                    console.log('No player to pass key to');
                }
                break;
        }
    }

    onKeyUp(event) {
        const key = event.code || event.key;
        
        // Prevent default for game keys
        if (this.isGameKey(key)) {
            event.preventDefault();
        }
        
        // Store key state
        this.keyState[key] = false;
        
        // Pass to player only if game is not paused
        if (this.player && this.game && this.game.getGameState() !== 'paused') {
            this.player.onKeyUp(event.key);
        }
    }

    onMouseMove(event) {
        // Only use mouse look when pointer is locked
        if (this.isPointerLocked && this.player) {
            // Get mouse movement delta
            const deltaX = event.movementX || 0;
            const deltaY = event.movementY || 0;
            
            // Pass to player for camera rotation
            this.player.onMouseMove(deltaX, deltaY);
        }
    }

    onMouseDown(event) {
        event.preventDefault();
        
        // Update mouse button state
        switch(event.button) {
            case 0: // Left click
                this.mouseState.buttons.left = true;
                break;
            case 1: // Middle click
                this.mouseState.buttons.middle = true;
                break;
            case 2: // Right click
                this.mouseState.buttons.right = true;
                break;
        }

        // Handle game actions
        if (this.isPointerLocked) {
            switch(event.button) {
                case 0: // Left click - will be used for shooting
                    this.onLeftClick();
                    break;
                case 2: // Right click - will be used for aiming
                    this.onRightClick();
                    break;
            }
        } else {
            // Request pointer lock on click
            this.requestPointerLock();
        }
    }

    onMouseUp(event) {
        event.preventDefault();
        
        // Update mouse button state
        switch(event.button) {
            case 0:
                this.mouseState.buttons.left = false;
                break;
            case 1:
                this.mouseState.buttons.middle = false;
                break;
            case 2:
                this.mouseState.buttons.right = false;
                break;
        }
    }

    onMouseWheel(event) {
        if (!this.isPointerLocked) return;
        
        event.preventDefault();
        
        // Will be used for weapon switching in future tasks
        const delta = event.deltaY > 0 ? 1 : -1;
        console.log('Mouse wheel:', delta);
    }

    onLeftClick() {
        // Shoot weapon only if game is not paused
        if (this.player && this.game && this.game.getGameState() !== 'paused') {
            this.player.shoot();
        }
    }

    onRightClick() {
        // Will be implemented for aiming
        console.log('Right click - aim');
    }

    handleEscapeKey() {
        // Check current state before toggling
        const wasPlaying = this.game && this.game.getGameState() === 'playing';
        
        // Toggle pause menu
        if (this.game) {
            this.game.togglePause();
        }
        
        // Exit pointer lock if we just paused (was playing, now paused)
        if (this.isPointerLocked && wasPlaying) {
            this.exitPointerLock();
        }
    }

    handleTabKey() {
        // Show/hide controls
        this.toggleControls();
    }

    toggleControls() {
        let instructions = document.getElementById('instructions');
        
        if (!instructions) {
            this.showInstructions(true);
        } else {
            if (instructions.style.display === 'none') {
                instructions.style.display = 'block';
            } else {
                instructions.style.display = 'none';
            }
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    isGameKey(key) {
        const gameKeys = [
            'KeyW', 'KeyA', 'KeyS', 'KeyD',
            'Space', 'ShiftLeft', 'ShiftRight',
            'Escape', 'Tab'
        ];
        return gameKeys.includes(key) || 
               ['w', 'a', 's', 'd', ' ', 'Shift', 'Escape', 'Tab'].includes(key);
    }

    // Utility methods
    isKeyPressed(key) {
        return this.keyState[key] || false;
    }

    isMouseButtonPressed(button) {
        switch(button) {
            case 'left': return this.mouseState.buttons.left;
            case 'right': return this.mouseState.buttons.right;
            case 'middle': return this.mouseState.buttons.middle;
            default: return false;
        }
    }

    getMouseState() {
        return { ...this.mouseState };
    }

    isPointerLockActive() {
        return this.isPointerLocked;
    }

    // Cleanup
    dispose() {
        // Remove event listeners
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('wheel', this.onMouseWheel);
        
        // Exit pointer lock
        this.exitPointerLock();
        
        console.log('Input handler disposed');
    }
}