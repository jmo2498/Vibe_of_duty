class Projectile {
    constructor(scene, origin, direction, damage, maxRange, owner) {
        this.scene = scene;
        this.origin = { ...origin };
        this.position = { ...origin };
        this.direction = this.normalizeVector(direction);
        this.damage = damage;
        this.maxRange = maxRange;
        this.owner = owner; // Reference to the entity that fired this projectile
        
        // Physics properties
        this.speed = 50; // Units per second
        this.gravity = 0; // No gravity for bullets (they're fast)
        this.distanceTraveled = 0;
        
        // Visual representation
        this.mesh = null;
        this.trail = null;
        
        // State
        this.isActive = true;
        this.hasHit = false;
        
        this.initialize();
    }

    initialize() {
        this.createVisualRepresentation();
        console.log('Projectile created at:', this.position);
    }

    createVisualRepresentation() {
        // Create a small sphere for the bullet
        const geometry = new THREE.SphereGeometry(0.02, 6, 4);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            emissive: 0x444400
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.scene.add(this.mesh);

        // Create a simple trail effect
        this.createTrail();
    }

    createTrail() {
        // Create a line geometry for bullet trail
        const points = [
            new THREE.Vector3(this.position.x, this.position.y, this.position.z),
            new THREE.Vector3(this.position.x, this.position.y, this.position.z)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0xffaa00,
            transparent: true,
            opacity: 0.6
        });
        
        this.trail = new THREE.Line(geometry, material);
        this.scene.add(this.trail);
    }

    update(deltaTime) {
        if (!this.isActive) {
            return false;
        }

        // Calculate movement
        const movement = {
            x: this.direction.x * this.speed * deltaTime,
            y: this.direction.y * this.speed * deltaTime,
            z: this.direction.z * this.speed * deltaTime
        };

        // Update position
        const newPosition = {
            x: this.position.x + movement.x,
            y: this.position.y + movement.y,
            z: this.position.z + movement.z
        };

        // Check collision with level geometry
        const collision = this.checkCollision(this.position, newPosition);
        
        if (collision.hit) {
            // Hit something
            this.onHit(collision);
            return false; // Projectile should be removed
        }

        // Update position
        this.position = newPosition;
        this.distanceTraveled += this.calculateDistance(movement);

        // Update visual representation
        this.updateVisuals();

        // Check if projectile has traveled too far
        if (this.distanceTraveled >= this.maxRange) {
            console.log('Projectile reached max range');
            return false; // Projectile should be removed
        }

        // Check if projectile is out of bounds
        if (this.isOutOfBounds()) {
            console.log('Projectile out of bounds');
            return false; // Projectile should be removed
        }

        return true; // Projectile is still active
    }

    checkCollision(currentPos, newPos) {
        // Check collision with level geometry using raycast
        if (this.scene && this.scene.raycastCollision) {
            const direction = {
                x: newPos.x - currentPos.x,
                y: newPos.y - currentPos.y,
                z: newPos.z - currentPos.z
            };
            
            const distance = this.calculateDistance(direction);
            
            if (distance > 0) {
                const normalizedDirection = {
                    x: direction.x / distance,
                    y: direction.y / distance,
                    z: direction.z / distance
                };
                
                const collision = this.scene.raycastCollision(currentPos, normalizedDirection, distance);
                
                if (collision.hit) {
                    return {
                        hit: true,
                        point: collision.point,
                        object: collision.object,
                        distance: collision.distance
                    };
                }
            }
        }

        return { hit: false };
    }

    onHit(collision) {
        this.hasHit = true;
        this.isActive = false;
        
        console.log('Projectile hit at:', collision.point);
        
        // Create hit effect
        this.createHitEffect(collision.point);
        
        // TODO: Apply damage to enemies when enemy system is implemented
        // if (collision.object.userData && collision.object.userData.isEnemy) {
        //     collision.object.userData.takeDamage(this.damage);
        // }
    }

    createHitEffect(position) {
        // Create a simple spark effect at hit location
        const geometry = new THREE.SphereGeometry(0.05, 8, 6);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff4400,
            transparent: true,
            opacity: 0.8
        });
        
        const spark = new THREE.Mesh(geometry, material);
        spark.position.set(position.x, position.y, position.z);
        this.scene.add(spark);
        
        // Remove spark after short duration
        setTimeout(() => {
            this.scene.remove(spark);
            spark.geometry.dispose();
            spark.material.dispose();
        }, 200);
    }

    updateVisuals() {
        // Update bullet position
        if (this.mesh) {
            this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        }

        // Update trail
        if (this.trail) {
            const positions = this.trail.geometry.attributes.position.array;
            
            // Trail start (current position)
            positions[0] = this.position.x;
            positions[1] = this.position.y;
            positions[2] = this.position.z;
            
            // Trail end (slightly behind current position)
            const trailLength = 0.5;
            positions[3] = this.position.x - this.direction.x * trailLength;
            positions[4] = this.position.y - this.direction.y * trailLength;
            positions[5] = this.position.z - this.direction.z * trailLength;
            
            this.trail.geometry.attributes.position.needsUpdate = true;
        }
    }

    isOutOfBounds() {
        const bounds = 50; // Level bounds
        return (
            Math.abs(this.position.x) > bounds ||
            Math.abs(this.position.z) > bounds ||
            this.position.y < -10 ||
            this.position.y > 20
        );
    }

    // Utility methods
    normalizeVector(vector) {
        const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
        if (length === 0) {
            return { x: 0, y: 0, z: 1 }; // Default forward direction
        }
        return {
            x: vector.x / length,
            y: vector.y / length,
            z: vector.z / length
        };
    }

    calculateDistance(vector) {
        return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    }

    // Getters
    getPosition() {
        return { ...this.position };
    }

    getDamage() {
        return this.damage;
    }

    getOwner() {
        return this.owner;
    }

    isProjectileActive() {
        return this.isActive;
    }

    // Cleanup
    destroy() {
        this.isActive = false;
        
        // Remove visual elements
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
        
        if (this.trail) {
            this.scene.remove(this.trail);
            this.trail.geometry.dispose();
            this.trail.material.dispose();
            this.trail = null;
        }
    }
}