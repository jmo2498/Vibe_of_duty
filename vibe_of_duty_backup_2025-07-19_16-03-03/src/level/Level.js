class Level {
    constructor(scene, assets) {
        this.scene = scene;
        this.assets = assets;
        this.geometry = [];
        this.collisionBoxes = [];
        this.spawnPoints = {
            player: { x: 0, y: 1.8, z: 0 },
            enemies: [
                { x: 10, y: 0, z: 10 },
                { x: -10, y: 0, z: 10 },
                { x: 10, y: 0, z: -10 },
                { x: -10, y: 0, z: -10 }
            ]
        };
    }

    init() {
        console.log('Initializing level geometry...');

        // Clear existing geometry
        this.clearLevel();

        // Create level components
        this.createFloor();
        this.createWalls();
        this.createObstacles();

        console.log('Level initialized with', this.collisionBoxes.length, 'collision boxes');
    }

    clearLevel() {
        // Remove existing level geometry from scene
        this.geometry.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        });

        this.geometry = [];
        this.collisionBoxes = [];
    }

    createFloor() {
        const floorSize = 40;
        const geometry = new THREE.PlaneGeometry(floorSize, floorSize);

        let material;
        if (this.assets && this.assets.textures && this.assets.textures.floor) {
            material = new THREE.MeshLambertMaterial({
                map: this.assets.textures.floor
            });
            // Repeat texture for better appearance
            this.assets.textures.floor.wrapS = THREE.RepeatWrapping;
            this.assets.textures.floor.wrapT = THREE.RepeatWrapping;
            this.assets.textures.floor.repeat.set(8, 8);
        } else {
            material = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        }

        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1;
        floor.receiveShadow = true;

        this.scene.add(floor);
        this.geometry.push(floor);

        // Floor doesn't need collision box as it's handled by Y position limits
    }

    createWalls() {
        const wallHeight = 5;
        const wallThickness = 1;
        const levelSize = 20;

        const wallConfigs = [
            // North wall
            {
                position: { x: 0, y: wallHeight / 2, z: -levelSize },
                size: { x: levelSize * 2, y: wallHeight, z: wallThickness }
            },
            // South wall
            {
                position: { x: 0, y: wallHeight / 2, z: levelSize },
                size: { x: levelSize * 2, y: wallHeight, z: wallThickness }
            },
            // East wall
            {
                position: { x: levelSize, y: wallHeight / 2, z: 0 },
                size: { x: wallThickness, y: wallHeight, z: levelSize * 2 }
            },
            // West wall
            {
                position: { x: -levelSize, y: wallHeight / 2, z: 0 },
                size: { x: wallThickness, y: wallHeight, z: levelSize * 2 }
            }
        ];

        wallConfigs.forEach((config, index) => {
            const geometry = new THREE.BoxGeometry(
                config.size.x,
                config.size.y,
                config.size.z
            );

            let material;
            if (this.assets && this.assets.textures && this.assets.textures.wall) {
                material = new THREE.MeshLambertMaterial({
                    map: this.assets.textures.wall
                });
            } else {
                material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            }

            const wall = new THREE.Mesh(geometry, material);
            wall.position.set(
                config.position.x,
                config.position.y,
                config.position.z
            );
            wall.castShadow = true;
            wall.receiveShadow = true;

            this.scene.add(wall);
            this.geometry.push(wall);

            // Add collision box
            this.addCollisionBox(
                config.position.x,
                config.position.y,
                config.position.z,
                config.size.x,
                config.size.y,
                config.size.z
            );
        });
    }

    createObstacles() {
        const obstacles = [
            // Central pillar
            {
                position: { x: 0, y: 2, z: 0 },
                size: { x: 2, y: 4, z: 2 }
            },
            // Corner obstacles (made taller and wider)
            {
                position: { x: 8, y: 1.5, z: 8 },
                size: { x: 5, y: 3, z: 3 }
            },
            {
                position: { x: -8, y: 1.5, z: -8 },
                size: { x: 3, y: 3, z: 5 }
            },
            // Cover obstacles (made taller and wider)
            {
                position: { x: 5, y: 1.5, z: -5 },
                size: { x: 6, y: 3, z: 3 }
            },
            {
                position: { x: -5, y: 1.5, z: 5 },
                size: { x: 3, y: 3, z: 6 }
            }
        ];

        obstacles.forEach((config, index) => {
            const geometry = new THREE.BoxGeometry(
                config.size.x,
                config.size.y,
                config.size.z
            );

            let material;
            if (this.assets && this.assets.textures && this.assets.textures.wall) {
                material = new THREE.MeshLambertMaterial({
                    map: this.assets.textures.wall
                });
            } else {
                material = new THREE.MeshLambertMaterial({ color: 0x696969 });
            }

            const obstacle = new THREE.Mesh(geometry, material);
            obstacle.position.set(
                config.position.x,
                config.position.y,
                config.position.z
            );
            obstacle.castShadow = true;
            obstacle.receiveShadow = true;

            this.scene.add(obstacle);
            this.geometry.push(obstacle);

            // Add collision box
            this.addCollisionBox(
                config.position.x,
                config.position.y,
                config.position.z,
                config.size.x,
                config.size.y,
                config.size.z
            );
        });
    }

    addCollisionBox(x, y, z, width, height, depth) {
        const box = {
            min: {
                x: x - width / 2,
                y: y - height / 2,
                z: z - depth / 2
            },
            max: {
                x: x + width / 2,
                y: y + height / 2,
                z: z + depth / 2
            },
            center: { x, y, z },
            size: { x: width, y: height, z: depth }
        };

        this.collisionBoxes.push(box);
    }

    // Collision detection methods
    checkCollision(position, radius = 0.5) {
        const playerBox = {
            min: {
                x: position.x - radius,
                y: position.y - radius,
                z: position.z - radius
            },
            max: {
                x: position.x + radius,
                y: position.y + radius,
                z: position.z + radius
            }
        };

        for (const box of this.collisionBoxes) {
            if (this.boxIntersection(playerBox, box)) {
                return {
                    collision: true,
                    box: box
                };
            }
        }

        return { collision: false };
    }

    boxIntersection(box1, box2) {
        return (
            box1.min.x < box2.max.x &&
            box1.max.x > box2.min.x &&
            box1.min.y < box2.max.y &&
            box1.max.y > box2.min.y &&
            box1.min.z < box2.max.z &&
            box1.max.z > box2.min.z
        );
    }

    // Raycast collision for projectiles
    raycastCollision(origin, direction, maxDistance = 100) {
        const raycaster = new THREE.Raycaster(
            new THREE.Vector3(origin.x, origin.y, origin.z),
            new THREE.Vector3(direction.x, direction.y, direction.z).normalize(),
            0,
            maxDistance
        );

        const intersects = raycaster.intersectObjects(this.geometry);

        if (intersects.length > 0) {
            return {
                hit: true,
                point: intersects[0].point,
                distance: intersects[0].distance,
                object: intersects[0].object
            };
        }

        return { hit: false };
    }

    // Get valid movement position (resolves collisions)
    getValidPosition(currentPos, newPos, radius = 0.5) {
        const collision = this.checkCollision(newPos, radius);

        if (!collision.collision) {
            return newPos;
        }

        // Try moving only on X axis
        const xOnlyPos = { x: newPos.x, y: currentPos.y, z: currentPos.z };
        if (!this.checkCollision(xOnlyPos, radius).collision) {
            return xOnlyPos;
        }

        // Try moving only on Z axis
        const zOnlyPos = { x: currentPos.x, y: currentPos.y, z: newPos.z };
        if (!this.checkCollision(zOnlyPos, radius).collision) {
            return zOnlyPos;
        }

        // No valid movement, return current position
        return currentPos;
    }

    // Utility methods
    getSpawnPoints() {
        return this.spawnPoints;
    }

    getPlayerSpawn() {
        return { ...this.spawnPoints.player };
    }

    getEnemySpawns() {
        return this.spawnPoints.enemies.map(spawn => ({ ...spawn }));
    }

    // Check if position is within level bounds
    isWithinBounds(position, margin = 1) {
        const levelSize = 20 - margin;
        return (
            position.x >= -levelSize &&
            position.x <= levelSize &&
            position.z >= -levelSize &&
            position.z <= levelSize &&
            position.y >= -0.5 &&
            position.y <= 10
        );
    }

    // Get collision boxes for debugging
    getCollisionBoxes() {
        return this.collisionBoxes;
    }

    // Cleanup
    dispose() {
        this.clearLevel();
    }
}