// Game State
const gameState = {
    gold: 0,
    baseDamage: 1,
    totalDamage: 1,
    damageMultiplier: 1,
    bossMaxHP: 100,
    bossHP: 100,
    autoClickerActive: false,
    autoClickerDPS: 0,
    specialAbilitiesActive: {},
    prestige: 0,
    prestigeMultiplier: 1,
    upgrades: {
        damageBoost: 0,
        autoClicker: 0,
        superClick: 0,
        lifeSteal: 0,
        criticalStrike: 0,
    },
    criticalChance: 0.05,
};

// Upgrade Definitions
const upgrades = {
    damageBoost: {
        name: 'Damage Boost',
        icon: '⚡',
        description: 'Increase damage per click by 5',
        baseCost: 20,
        effect: () => {
            gameState.totalDamage = gameState.baseDamage * gameState.damageMultiplier;
        },
    },
    autoClicker: {
        name: 'Auto Clicker',
        icon: '🤖',
        description: 'Deal 1 DPS automatically',
        baseCost: 100,
        effect: () => {
            updateAutoClickerDPS();
        },
    },
    superClick: {
        name: 'Super Click',
        icon: '💥',
        description: 'Click deals 2x damage next time',
        baseCost: 150,
        effect: () => {
            gameState.damageMultiplier += 0.5;
            gameState.totalDamage = gameState.baseDamage * gameState.damageMultiplier;
        },
    },
    lifeSteal: {
        name: 'Life Steal',
        icon: '🩸',
        description: '10% of damage heals the boss (opposite effect)',
        baseCost: 200,
        effect: () => {
            // This upgrade modifies damage dealt
        },
    },
    criticalStrike: {
        name: 'Critical Strike',
        icon: '🎯',
        description: '5% chance for 2x damage',
        baseCost: 250,
        effect: () => {
            gameState.criticalChance = 0.05 + (0.02 * gameState.upgrades.criticalStrike);
        },
    },
};

// Canvas Setup
const canvas = document.getElementById('bossCanvas');
const ctx = canvas.getContext('2d');

// Event Listeners
canvas.addEventListener('click', handleBossClick);
document.getElementById('prestigeBtn').addEventListener('click', handlePrestige);

// Draw Boss
function drawBoss() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Boss body (purple circle)
    ctx.fillStyle = '#8B008B';
    ctx.beginPath();
    ctx.arc(150, 150, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4B0082';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Boss eyes
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(130, 130, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(170, 130, 12, 0, Math.PI * 2);
    ctx.fill();

    // Boss pupils (animated based on damage taken)
    const pupilShift = (gameState.bossMaxHP - gameState.bossHP) / gameState.bossMaxHP * 5;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(130 + pupilShift, 130, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(170 + pupilShift, 130, 6, 0, Math.PI * 2);
    ctx.fill();

    // Boss mouth (angry expression)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(150, 160, 20, 0, Math.PI);
    ctx.stroke();

    // Boss horns
    ctx.strokeStyle = '#FF6347';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(110, 90);
    ctx.lineTo(95, 60);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(190, 90);
    ctx.lineTo(205, 60);
    ctx.stroke();

    // Health bar indicator on boss
    const healthPercentage = gameState.bossHP / gameState.bossMaxHP;
    ctx.fillStyle = healthPercentage > 0.5 ? '#00FF00' : healthPercentage > 0.25 ? '#FFD700' : '#FF6347';
    ctx.fillRect(120, 220, 60 * healthPercentage, 15);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(120, 220, 60, 15);
}

// Handle Boss Click
function handleBossClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on boss (within radius of ~60)
    const dx = x - 150;
    const dy = y - 150;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 60) {
        dealDamage();
    }
}

// Deal Damage
function dealDamage() {
    let damage = gameState.totalDamage;

    // Critical strike check
    if (Math.random() < gameState.criticalChance) {
        damage *= 2;
        showDamagePopup('CRIT!', '#FF00FF');
    }

    gameState.bossHP -= damage;
    gameState.gold += Math.floor(damage);

    // Life steal (heals boss - opposite effect, funny mechanic)
    if (gameState.upgrades.lifeSteal > 0) {
        gameState.bossHP += Math.floor(damage * 0.1 * gameState.upgrades.lifeSteal);
    }

    if (gameState.bossHP <= 0) {
        defeatedBoss();
    }

    updateUI();
    saveGame();
    drawBoss();
    showDamagePopup(damage.toFixed(0), '#FF4444');
}

// Defeated Boss
function defeatedBoss() {
    gameState.gold += Math.floor(gameState.bossMaxHP * 10 * gameState.prestigeMultiplier);
    gameState.bossHP = gameState.bossMaxHP;
    updateUI();
    saveGame();
    drawBoss();
    alert('Boss defeated! You earned bonus gold!');
}

// Show Damage Popup
function showDamagePopup(text, color = '#FF4444') {
    const popup = document.createElement('div');
    popup.className = 'damage-popup';
    popup.textContent = text;
    popup.style.color = color;
    popup.style.left = Math.random() * 100 - 50 + 'px';

    const container = document.getElementById('popupContainer');
    container.appendChild(popup);

    setTimeout(() => popup.remove(), 1000);
}

// Update Auto Clicker DPS
function updateAutoClickerDPS() {
    gameState.autoClickerDPS = gameState.upgrades.autoClicker * 1 * gameState.prestigeMultiplier;
    gameState.autoClickerActive = gameState.upgrades.autoClicker > 0;
}

// Auto Clicker Loop
function autoClickerLoop() {
    if (gameState.autoClickerActive && gameState.autoClickerDPS > 0) {
        const damagePerFrame = gameState.autoClickerDPS / 60; // 60 FPS
        gameState.bossHP -= damagePerFrame;
        gameState.gold += damagePerFrame;

        if (gameState.bossHP <= 0) {
            defeatedBoss();
        }

        updateUI();
        drawBoss();
    }

    requestAnimationFrame(autoClickerLoop);
}

// Update UI
function updateUI() {
    document.getElementById('goldDisplay').textContent = Math.floor(gameState.gold);
    document.getElementById('damageDisplay').textContent = gameState.totalDamage.toFixed(1);
    document.getElementById('dpsDisplay').textContent = gameState.autoClickerDPS.toFixed(1);
    document.getElementById('prestigeLevelDisplay').textContent = gameState.prestige;

    // Update HP Bar
    const hpPercentage = (gameState.bossHP / gameState.bossMaxHP) * 100;
    document.getElementById('hpBar').style.width = Math.max(0, hpPercentage) + '%';
    document.getElementById('hpText').textContent = `${Math.max(0, Math.floor(gameState.bossHP))} / ${gameState.bossMaxHP} HP`;

    // Update Upgrades Display
    updateUpgradesDisplay();

    // Update Prestige Button
    const prestigeGain = calculatePrestigeGain();
    const prestigeBtn = document.getElementById('prestigeBtn');
    const prestigeBtnText = document.getElementById('prestigeBtnText');
    prestigeBtnText.textContent = `Prestige (${prestigeGain} Available)`;
    prestigeBtn.disabled = prestigeGain === 0;
}

// Calculate Prestige Gain
function calculatePrestigeGain() {
    return Math.floor(Math.sqrt(gameState.gold / 1000));
}

// Handle Prestige
function handlePrestige() {
    const prestigeGain = calculatePrestigeGain();
    if (prestigeGain > 0) {
        gameState.prestige += prestigeGain;
        gameState.prestigeMultiplier = 1 + (gameState.prestige * 0.1); // 10% per prestige level

        // Reset game
        gameState.gold = 0;
        gameState.baseDamage = 1;
        gameState.totalDamage = 1;
        gameState.damageMultiplier = 1;
        gameState.bossHP = gameState.bossMaxHP;
        gameState.autoClickerDPS = 0;
        gameState.autoClickerActive = false;
        gameState.upgrades = {
            damageBoost: 0,
            autoClicker: 0,
            superClick: 0,
            lifeSteal: 0,
            criticalStrike: 0,
        };

        updateUI();
        saveGame();
        drawBoss();
        alert(`Prestiged! Gained ${prestigeGain} prestige levels. You now have a ${(gameState.prestigeMultiplier * 100 - 100).toFixed(0)}% damage & DPS boost!`);
    }
}

// Update Upgrades Display
function updateUpgradesDisplay() {
    const upgradesGrid = document.getElementById('upgradesGrid');
    upgradesGrid.innerHTML = '';

    for (const [key, upgrade] of Object.entries(upgrades)) {
        const count = gameState.upgrades[key] || 0;
        const baseCost = upgrade.baseCost;
        const currentCost = Math.floor(baseCost * Math.pow(1.15, count));
        const canAfford = gameState.gold >= currentCost;

        const upgradeElement = document.createElement('div');
        upgradeElement.className = `upgrade ${!canAfford ? 'disabled' : ''}`;
        upgradeElement.innerHTML = `
            <div class="upgrade-icon">${upgrade.icon}</div>
            <div class="upgrade-name">${upgrade.name}</div>
            <div class="upgrade-description">${upgrade.description}</div>
            <div class="upgrade-cost">
                <span class="gold">💰 ${currentCost}</span>
                <span class="upgrade-count">${count}</span>
            </div>
        `;

        upgradeElement.addEventListener('click', () => {
            if (canAfford) {
                purchaseUpgrade(key, currentCost);
            }
        });

        upgradesGrid.appendChild(upgradeElement);
    }
}

// Purchase Upgrade
function purchaseUpgrade(upgradeKey, cost) {
    if (gameState.gold >= cost) {
        gameState.gold -= cost;
        gameState.upgrades[upgradeKey]++;

        switch (upgradeKey) {
            case 'damageBoost':
                gameState.baseDamage += 5;
                gameState.totalDamage = gameState.baseDamage * gameState.damageMultiplier;
                break;
            case 'autoClicker':
                updateAutoClickerDPS();
                break;
            case 'superClick':
                gameState.damageMultiplier += 0.5;
                gameState.totalDamage = gameState.baseDamage * gameState.damageMultiplier;
                break;
            case 'criticalStrike':
                gameState.criticalChance = Math.min(0.5, 0.05 + (0.02 * gameState.upgrades.criticalStrike));
                break;
        }

        upgrades[upgradeKey].effect();
        updateUI();
        saveGame();
        drawBoss();
    }
}

// Save Game
function saveGame() {
    localStorage.setItem('clickerGameState', JSON.stringify(gameState));
}

// Load Game
function loadGame() {
    const saved = localStorage.getItem('clickerGameState');
    if (saved) {
        const loadedState = JSON.parse(saved);
        Object.assign(gameState, loadedState);
        updateAutoClickerDPS();
    }
}

// Initialize Game
function initGame() {
    loadGame();
    drawBoss();
    updateUI();
    autoClickerLoop();
    saveGame(); // Save initial state
}

// Initialize on page load
initGame();