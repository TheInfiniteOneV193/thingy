// Game constants
const CANVAS = document.getElementById('gameCanvas');
const CTX = CANVAS.getContext('2d');
const PADDING = 50;
const ARENA_WIDTH = CANVAS.width = window.innerWidth;
const ARENA_HEIGHT = CANVAS.height = window.innerHeight;

// Game state
const gameState = {
    score: 0,
    bossesDefeated: 0,
    playerHealth: 100,
    maxPlayerHealth: 100,
    isStunned: false,
    stunTimeRemaining: 0,
    playerAbilities: [],
    enemies: [],
    projectiles: [],
    explosions: [],
    enemiesKilledSinceLastBoss: 0,
};

// Enemy abilities
const ENEMY_ABILITIES = {
    FLASH_STEP: 'flash_step',
    TANK: 'tank',
    PROJECTILE: 'projectile',
    SECOND_WIND: 'second_wind',
    EXPLODER: 'exploder'
};

// Player abilities
const PLAYER_ABILITIES = {
    DOUBLE_DAMAGE: 'double_damage',
    LESS_STUN: 'less_stun',
    EXPLOSION: 'explosion',
    BEAM: 'beam',
    UPHEAVAL: 'upheaval',
    EXPLOSIVE_STRIKE: 'explosive_strike',
    HEAL: 'heal'
};

class Enemy {
    constructor(x, y, isBoss = false) {
        this.x = x;
        this.y = y;
        this.isBoss = isBoss;
        this.radius = isBoss ? 40 : 30;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.color = isBoss ? '#FF6B00' : this.getRandomColor();
        this.maxHealth = isBoss ? 50 : 3;
        this.health = this.maxHealth;
        this.flashStepCount = 0;
        
        // Random ability (30% chance for normal enemies, 50% for boss)
        const abilityChance = isBoss ? 0.5 : 0.3;
        if (Math.random() < abilityChance) {
            const abilities = Object.values(ENEMY_ABILITIES);
            this.ability = abilities[Math.floor(Math.random() * abilities.length)];
        } else {
            this.ability = null;
        }

        // For projectile ability
        this.shootCooldown = 0;
        this.hasSecondWind = this.ability === ENEMY_ABILITIES.SECOND_WIND;
        
        // For exploder ability
        this.explodeCooldown = 0;
        this.baseSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }

    getRandomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        // Movement
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x - this.radius < PADDING) {
            this.x = PADDING + this.radius;
            this.vx = Math.abs(this.vx);
        }
        if (this.x + this.radius > ARENA_WIDTH - PADDING) {
            this.x = ARENA_WIDTH - PADDING - this.radius;
            this.vx = -Math.abs(this.vx);
        }
        if (this.y - this.radius < PADDING) {
            this.y = PADDING + this.radius;
            this.vy = Math.abs(this.vy);
        }
        if (this.y + this.radius > ARENA_HEIGHT - PADDING) {
            this.y = ARENA_HEIGHT - PADDING - this.radius;
            this.vy = -Math.abs(this.vy);
        }

        // Projectile ability shooting
        if (this.ability === ENEMY_ABILITIES.PROJECTILE) {
            this.shootCooldown--;
            if (this.shootCooldown <= 0) {
                this.shootProjectile();
                this.shootCooldown = 120; // Shoot every 2 seconds
            }
        }

        // Exploder ability
        if (this.ability === ENEMY_ABILITIES.EXPLODER) {
            this.explodeCooldown--;
            if (this.explodeCooldown <= 0) {
                this.explode();
                this.explodeCooldown = 180; // Explode every 3 seconds
            }
        }
    }

    shootProjectile() {
        const angle = Math.random() * Math.PI * 2;
        gameState.projectiles.push(new EnemyProjectile(this.x, this.y, angle));
    }

    draw() {
        // Draw circle
        CTX.fillStyle = this.color;
        CTX.beginPath();
        CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        CTX.fill();

        // Draw health bar
        if (this.health < this.maxHealth) {
            const barWidth = this.radius * 2;
            const barHeight = 4;
            CTX.fillStyle = '#333';
            CTX.fillRect(this.x - barWidth / 2, this.y - this.radius - 10, barWidth, barHeight);
            CTX.fillStyle = '#4CAF50';
            CTX.fillRect(this.x - barWidth / 2, this.y - this.radius - 10, (barWidth * this.health) / this.maxHealth, barHeight);
        }

        // Draw ability icon
        if (this.ability) {
            this.drawAbilityIcon();
        }

        // Draw boss indicator
        if (this.isBoss) {
            CTX.strokeStyle = '#FFD700';
            CTX.lineWidth = 3;
            CTX.beginPath();
            CTX.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
            CTX.stroke();
        }
    }

    drawAbilityIcon() {
        CTX.save();
        CTX.fillStyle = '#000000';
        CTX.font = 'bold 10px Arial';
        CTX.textAlign = 'center';
        CTX.textBaseline = 'middle';

        let text = '';
        switch (this.ability) {
            case ENEMY_ABILITIES.FLASH_STEP: text = 'FLASH'; break;
            case ENEMY_ABILITIES.TANK: text = 'TANK'; break;
            case ENEMY_ABILITIES.PROJECTILE: text = 'PROJ'; break;
            case ENEMY_ABILITIES.SECOND_WIND: text = 'WIND'; break;
            case ENEMY_ABILITIES.EXPLODER: text = 'BOOM'; break;
        }

        CTX.fillText(text, this.x, this.y);
        CTX.restore();
    }

    onHit() {
        this.health--;

        if (this.health <= 0) {
            if (this.ability === ENEMY_ABILITIES.FLASH_STEP) {
                this.flashStepCount++;
                if (this.flashStepCount < 3) {
                    this.flashStep();
                    this.health = this.maxHealth;
                    return false;
                } else {
                    return true; // Flash step used 3 times, enemy is dead
                }
            } else if (this.ability === ENEMY_ABILITIES.SECOND_WIND && this.hasSecondWind) {
                this.health = this.maxHealth;
                this.hasSecondWind = false;
                // Increase speed on second life
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                const newSpeed = speed * 1.5;
                const angle = Math.atan2(this.vy, this.vx);
                this.vx = Math.cos(angle) * newSpeed;
                this.vy = Math.sin(angle) * newSpeed;
                return false;
            } else {
                return true; // Enemy is dead
            }
        }

        return false; // Enemy is still alive
    }

    flashStep() {
        // Teleport to random location
        this.x = PADDING + this.radius + Math.random() * (ARENA_WIDTH - 2 * PADDING - 2 * this.radius);
        this.y = PADDING + this.radius + Math.random() * (ARENA_HEIGHT - 2 * PADDING - 2 * this.radius);
    }

    explode() {
        // Create explosion that damages player if they're in range
        const explosionRadius = 80;
        gameState.explosions.push(new EnemyExplosion(this.x, this.y, explosionRadius));
    }
}

class EnemyProjectile {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 3;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.radius = 5;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        CTX.fillStyle = '#FF4444';
        CTX.beginPath();
        CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        CTX.fill();
    }

    isOutOfBounds() {
        return this.x < 0 || this.x > ARENA_WIDTH || this.y < 0 || this.y > ARENA_HEIGHT;
    }
}

class PlayerProjectile {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 6;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.radius = 4;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        CTX.fillStyle = '#4CAF50';
        CTX.beginPath();
        CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        CTX.fill();
    }

    isOutOfBounds() {
        return this.x < 0 || this.x > ARENA_WIDTH || this.y < 0 || this.y > ARENA_HEIGHT;
    }
}

class Explosion {
    constructor(x, y, radius = 40) {
        this.x = x;
        this.y = y;
        this.maxRadius = radius;
        this.currentRadius = 0;
        this.duration = 20;
        this.timeLeft = 20;
    }

    update() {
        this.timeLeft--;
        this.currentRadius = (this.maxRadius * (this.duration - this.timeLeft)) / this.duration;
    }

    draw() {
        CTX.fillStyle = `rgba(255, 165, 0, ${(this.timeLeft / this.duration) * 0.7})`;
        CTX.beginPath();
        CTX.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        CTX.fill();

        CTX.strokeStyle = `rgba(255, 100, 0, ${(this.timeLeft / this.duration) * 0.9})`;
        CTX.lineWidth = 2;
        CTX.beginPath();
        CTX.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        CTX.stroke();
    }

    isActive() {
        return this.timeLeft > 0;
    }
}

class EnemyExplosion extends Explosion {
    constructor(x, y, radius = 80) {
        super(x, y, radius);
        this.isEnemyExplosion = true;
    }

    draw() {
        CTX.fillStyle = `rgba(255, 100, 0, ${(this.timeLeft / this.duration) * 0.7})`;
        CTX.beginPath();
        CTX.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        CTX.fill();

        CTX.strokeStyle = `rgba(255, 50, 0, ${(this.timeLeft / this.duration) * 0.9})`;
        CTX.lineWidth = 2;
        CTX.beginPath();
        CTX.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        CTX.stroke();
    }
}

function getPlayerPosition() {
    return { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 };
}

function spawnEnemy(isBoss = false) {
    let x, y, distance;
    const minDistance = 150;
    const playerPos = getPlayerPosition();

    do {
        x = PADDING + Math.random() * (ARENA_WIDTH - 2 * PADDING);
        y = PADDING + Math.random() * (ARENA_HEIGHT - 2 * PADDING);
        distance = Math.sqrt((x - playerPos.x) ** 2 + (y - playerPos.y) ** 2);
    } while (distance < minDistance);

    const enemy = new Enemy(x, y, isBoss);
    gameState.enemies.push(enemy);
}

function spawnBoss() {
    spawnEnemy(true);
}

function updateUI() {
    document.getElementById('score').textContent = `Eliminations: ${gameState.score}`;
    document.getElementById('bosses').textContent = `Bosses Defeated: ${gameState.bossesDefeated}`;
    document.getElementById('health').textContent = `Health: ${gameState.playerHealth}/${gameState.maxPlayerHealth}`;

    if (gameState.isStunned) {
        const stunDisplay = document.getElementById('stun-timer');
        stunDisplay.style.display = 'block';
        stunDisplay.textContent = `Stunned: ${Math.ceil(gameState.stunTimeRemaining / 60)}s`;
    } else {
        document.getElementById('stun-timer').style.display = 'none';
    }

    // Update abilities list
    const abilitiesList = document.getElementById('abilities-list');
    abilitiesList.innerHTML = '';
    gameState.playerAbilities.forEach(ability => {
        const badge = document.createElement('div');
        badge.className = `ability-badge ${ability}`;
        badge.textContent = getAbilityDisplayName(ability);
        abilitiesList.appendChild(badge);
    });
}

function getAbilityDisplayName(ability) {
    const names = {
        double_damage: 'Double Damage',
        less_stun: 'Less Stun',
        explosion: 'Explosion',
        beam: 'Beam',
        upheaval: 'Upheaval',
        explosive_strike: 'Explosive Strike',
        heal: 'Heal'
    };
    return names[ability] || ability;
}

function grantRandomAbility() {
    const availableAbilities = Object.values(PLAYER_ABILITIES);
    const ability = availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
    gameState.playerAbilities.push(ability);
}

function onEnemyClicked(enemy) {
    if (gameState.isStunned) return;

    let damage = 1;
    if (gameState.playerAbilities.includes(PLAYER_ABILITIES.DOUBLE_DAMAGE)) {
        damage = 2;
    }

    const isDead = enemy.onHit();

    if (damage > 1 || gameState.playerAbilities.includes(PLAYER_ABILITIES.EXPLOSION)) {
        if (!isDead && gameState.playerAbilities.includes(PLAYER_ABILITIES.EXPLOSION)) {
            gameState.explosions.push(new Explosion(enemy.x, enemy.y, 60));
            checkExplosionCollisions(enemy.x, enemy.y, 60);
        }
    }

    if (gameState.playerAbilities.includes(PLAYER_ABILITIES.EXPLOSIVE_STRIKE)) {
        gameState.explosions.push(new Explosion(enemy.x, enemy.y, 40));
        checkExplosionCollisions(enemy.x, enemy.y, 40);
    }

    if (isDead) {
        gameState.score++;
        gameState.enemiesKilledSinceLastBoss++;

        if (gameState.enemiesKilledSinceLastBoss >= 20) {
            gameState.enemiesKilledSinceLastBoss = 0;
            gameState.bossesDefeated++;
            grantRandomAbility();
        }

        // Remove enemy from array
        gameState.enemies = gameState.enemies.filter(e => e !== enemy);
    }
}

function checkExplosionCollisions(centerX, centerY, radius) {
    gameState.enemies.forEach(enemy => {
        const dist = Math.sqrt((enemy.x - centerX) ** 2 + (enemy.y - centerY) ** 2);
        if (dist < radius + enemy.radius) {
            if (enemy.onHit() === true) {
                gameState.score++;
                gameState.enemiesKilledSinceLastBoss++;
                if (gameState.enemiesKilledSinceLastBoss >= 20) {
                    gameState.enemiesKilledSinceLastBoss = 0;
                    gameState.bossesDefeated++;
                    grantRandomAbility();
                }
                gameState.enemies = gameState.enemies.filter(e => e !== enemy);
            }
        }
    });
}

function handleCanvasClick(event) {
    if (gameState.isStunned) return;

    const rect = CANVAS.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Check for heal ability
    if (gameState.playerAbilities.includes(PLAYER_ABILITIES.HEAL)) {
        gameState.playerHealth = gameState.maxPlayerHealth;
        // Remove heal ability after use
        const healIndex = gameState.playerAbilities.indexOf(PLAYER_ABILITIES.HEAL);
        if (healIndex > -1) {
            gameState.playerAbilities.splice(healIndex, 1);
        }
        return;
    }

    // Check for beam or upheaval abilities
    if (gameState.playerAbilities.includes(PLAYER_ABILITIES.BEAM)) {
        fireBeam(clickX, clickY);
    }

    // Check for enemy hit
    for (let enemy of gameState.enemies) {
        const dist = Math.sqrt((enemy.x - clickX) ** 2 + (enemy.y - clickY) ** 2);
        if (dist < enemy.radius) {
            onEnemyClicked(enemy);
            return;
        }
    }
}

function fireBeam(targetX, targetY) {
    const playerPos = getPlayerPosition();
    const angle = Math.atan2(targetY - playerPos.y, targetX - playerPos.x);
    gameState.projectiles.push(new PlayerProjectile(playerPos.x, playerPos.y, angle));
}

function updateProjectiles() {
    gameState.projectiles.forEach(proj => proj.update());
    gameState.projectiles = gameState.projectiles.filter(proj => !proj.isOutOfBounds());

    // Check collisions with enemies
    gameState.projectiles.forEach((proj, projIndex) => {
        gameState.enemies.forEach((enemy, enemyIndex) => {
            const dist = Math.sqrt((enemy.x - proj.x) ** 2 + (enemy.y - proj.y) ** 2);
            if (dist < enemy.radius + proj.radius) {
                const isDead = enemy.onHit();
                gameState.projectiles.splice(projIndex, 1);

                if (isDead) {
                    gameState.score++;
                    gameState.enemiesKilledSinceLastBoss++;
                    if (gameState.enemiesKilledSinceLastBoss >= 20) {
                        gameState.enemiesKilledSinceLastBoss = 0;
                        gameState.bossesDefeated++;
                        grantRandomAbility();
                    }
                    gameState.enemies.splice(enemyIndex, 1);
                }
            }
        });
    });
}

function updateEnemyProjectiles() {
    gameState.projectiles.forEach(proj => {
        if (proj instanceof EnemyProjectile) proj.update();
    });

    // Remove out of bounds
    gameState.projectiles = gameState.projectiles.filter(proj => {
        if (proj instanceof EnemyProjectile && proj.isOutOfBounds()) {
            return false;
        }
        return true;
    });

    // Check collisions with player
    const playerPos = getPlayerPosition();
    const playerRadius = 20;

    gameState.projectiles.forEach((proj, projIndex) => {
        if (proj instanceof EnemyProjectile) {
            const dist = Math.sqrt((playerPos.x - proj.x) ** 2 + (playerPos.y - proj.y) ** 2);
            if (dist < playerRadius + proj.radius) {
                gameState.projectiles.splice(projIndex, 1);
                applyProjectileDamage();
            }
        }
    });
}

function applyProjectileDamage() {
    let damage = 10;
    gameState.playerHealth -= damage;
    if (gameState.playerHealth <= 0) {
        gameState.playerHealth = 0;
    }
}

function updateStun() {
    if (gameState.isStunned) {
        gameState.stunTimeRemaining--;
        if (gameState.stunTimeRemaining <= 0) {
            gameState.isStunned = false;
        }
    }
}

function drawPlayer() {
    const playerPos = getPlayerPosition();
    const playerRadius = 20;

    CTX.fillStyle = '#4CAF50';
    CTX.beginPath();
    CTX.arc(playerPos.x, playerPos.y, playerRadius, 0, Math.PI * 2);
    CTX.fill();

    CTX.strokeStyle = '#2E7D32';
    CTX.lineWidth = 3;
    CTX.beginPath();
    CTX.arc(playerPos.x, playerPos.y, playerRadius, 0, Math.PI * 2);
    CTX.stroke();

    // Draw health bar above player
    const healthBarWidth = 60;
    const healthBarHeight = 8;
    const healthBarX = playerPos.x - healthBarWidth / 2;
    const healthBarY = playerPos.y - playerRadius - 20;

    CTX.fillStyle = '#333';
    CTX.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    const healthPercent = gameState.playerHealth / gameState.maxPlayerHealth;
    CTX.fillStyle = healthPercent > 0.5 ? '#4CAF50' : (healthPercent > 0.25 ? '#FFC107' : '#f44336');
    CTX.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);

    CTX.strokeStyle = '#FFF';
    CTX.lineWidth = 1;
    CTX.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
}

function drawArena() {
    CTX.strokeStyle = '#4CAF50';
    CTX.lineWidth = 3;
    CTX.strokeRect(PADDING, PADDING, ARENA_WIDTH - 2 * PADDING, ARENA_HEIGHT - 2 * PADDING);
}

function checkEnemyExplosionCollisions() {
    const playerPos = getPlayerPosition();
    const playerRadius = 20;

    gameState.explosions.forEach(exp => {
        if (exp.isEnemyExplosion) {
            const dist = Math.sqrt((playerPos.x - exp.x) ** 2 + (playerPos.y - exp.y) ** 2);
            if (dist < exp.currentRadius + playerRadius) {
                // Player hit by enemy explosion - apply stun
                applyEnemyExplosionStun();
            }
        }
    });
}

function applyEnemyExplosionStun() {
    let stunDuration = 180; // 3 seconds at 60 FPS
    if (gameState.playerAbilities.includes(PLAYER_ABILITIES.LESS_STUN)) {
        stunDuration = 90; // 1.5 seconds
    }

    gameState.isStunned = true;
    gameState.stunTimeRemaining = stunDuration;
}

function gameOver() {
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').textContent = `Final Score: ${gameState.score} eliminations\nBosses Defeated: ${gameState.bossesDefeated}`;
}

function update() {
    // Update enemies
    gameState.enemies.forEach(enemy => enemy.update());

    // Update stun
    updateStun();

    // Update projectiles
    updateProjectiles();
    updateEnemyProjectiles();

    // Update explosions
    gameState.explosions.forEach(exp => exp.update());
    gameState.explosions = gameState.explosions.filter(exp => exp.isActive());

    // Check enemy explosion collisions
    checkEnemyExplosionCollisions();

    // Spawn new enemies
    if (gameState.enemies.length < 3 + Math.floor(gameState.score / 10)) {
        spawnEnemy();
    }

    // Check for game over
    if (gameState.playerHealth <= 0) {
        return false; // Stop game loop
    }

    return true;
}

function draw() {
    // Clear canvas
    CTX.fillStyle = '#0d0d0d';
    CTX.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // Draw arena
    drawArena();

    // Draw explosions
    gameState.explosions.forEach(exp => exp.draw());

    // Draw enemies
    gameState.enemies.forEach(enemy => enemy.draw());

    // Draw projectiles
    gameState.projectiles.forEach(proj => proj.draw());

    // Draw player
    drawPlayer();

    // Update UI
    updateUI();
}

let gameLoopRunning = true;

function gameLoop() {
    if (!update()) {
        gameOver();
        gameLoopRunning = false;
        return;
    }

    draw();

    if (gameLoopRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// Event listeners
CANVAS.addEventListener('click', handleCanvasClick);

window.addEventListener('resize', () => {
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
});

// Start the game
spawnEnemy();
spawnEnemy();
gameLoop();
