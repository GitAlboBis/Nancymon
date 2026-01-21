import Phaser from 'phaser';
import {
    StressEnemy,
    Memory,
    BattleData,
    DEFAULT_PLAYER_MEMORY,
    createEnemyInstance,
    calculateDamage
} from '../data/Memories';
import { getMoveDescription, getVictoryMessage } from '../data/Dialogues';
import { GameState } from '../state/GameState';
import { AllMemories, MemoryItem } from '../data/MemoriesData';

/**
 * Battle States for the state machine
 */
enum BattleState {
    INTRO,
    PLAYER_TURN,
    PLAYER_SELECTING_MOVE,
    PLAYER_ACTION,
    ENEMY_TURN,
    ENEMY_ACTION,
    VICTORY,
    MEMORY_DROP,
    DEFEAT,
    RUN_AWAY
}

/**
 * BattleScene
 * Turn-based battle system with romantic/stress-relief theme
 */
export class BattleScene extends Phaser.Scene {
    // Battle state
    private state: BattleState = BattleState.INTRO;
    private enemy!: StressEnemy;
    private playerMemory!: Memory;
    private returnPosition: { x: number; y: number } = { x: 15, y: 10 };

    // UI Elements
    private textBox!: Phaser.GameObjects.Container;
    private textContent!: Phaser.GameObjects.Text;
    private menuContainer!: Phaser.GameObjects.Container;
    private moveMenuContainer!: Phaser.GameObjects.Container;
    private enemyStressBar!: Phaser.GameObjects.Graphics;
    private playerVibeBar!: Phaser.GameObjects.Graphics;
    private enemySprite!: Phaser.GameObjects.Sprite;
    private playerSprite!: Phaser.GameObjects.Sprite;

    // UI Constants
    private readonly MENU_OPTIONS = ['COMFORT', 'ITEMS', 'RUN'];
    private currentMenuIndex = 0;
    private currentMoveIndex = 0;
    private isAnimating = false;

    // Text queue for typewriter effect
    private textQueue: string[] = [];
    private isTyping = false;
    private typewriterEvent?: Phaser.Time.TimerEvent;

    // Memory drop system
    private droppedMemory: MemoryItem | null = null;
    private memoryPopup!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'BattleScene' });
    }

    init(data?: BattleData): void {
        // Initialize battle data from scene transition
        if (data?.enemy) {
            this.enemy = data.enemy;
        } else {
            this.enemy = createEnemyInstance('workStress');
        }

        if (data?.playerMemory) {
            this.playerMemory = { ...data.playerMemory };
        } else {
            this.playerMemory = { ...DEFAULT_PLAYER_MEMORY };
        }

        if (data?.returnPosition) {
            this.returnPosition = data.returnPosition;
        }

        // Reset state
        this.state = BattleState.INTRO;
        this.currentMenuIndex = 0;
        this.currentMoveIndex = 0;
        this.isAnimating = false;
        this.textQueue = [];
        this.isTyping = false;
    }

    create(): void {
        const { width, height } = this.cameras.main;

        // Background gradient
        this.cameras.main.setBackgroundColor('#1a1a2e');
        this.createBackground(width, height);

        // Create battle arena
        this.createBattleArena(width, height);

        // Create UI
        this.createTextBox(width, height);
        this.createMainMenu(width, height);
        this.createMoveMenu(width, height);
        this.createHealthBars(width, height);
        this.createMemoryPopup(width, height);

        // Setup input
        this.setupInput();

        // Start battle intro
        this.startBattleIntro();
    }

    // ===========================================================================
    // BACKGROUND & ARENA
    // ===========================================================================

    private createBackground(width: number, height: number): void {
        // Gradient background using graphics
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x2d2d44, 0x2d2d44, 0x1a1a2e, 0x1a1a2e, 1);
        bg.fillRect(0, 0, width, height);

        // Add some ambient particles (hearts)
        for (let i = 0; i < 5; i++) {
            const heart = this.add.text(
                Math.random() * width,
                Math.random() * (height * 0.5),
                '💕',
                { fontSize: '16px' }
            );
            heart.setAlpha(0.3);

            this.tweens.add({
                targets: heart,
                y: heart.y - 20,
                alpha: 0.1,
                duration: 3000 + Math.random() * 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    private createBattleArena(width: number, height: number): void {
        // Enemy platform (top right)
        this.add.ellipse(width * 0.7, height * 0.35, 100, 30, 0x4a4a6a, 0.5);

        // Enemy sprite
        this.enemySprite = this.add.sprite(width * 0.7, height * 0.25, this.enemy.sprite);
        this.enemySprite.setScale(2);

        // Player platform (bottom left)
        this.add.ellipse(width * 0.25, height * 0.6, 100, 30, 0x4a4a6a, 0.5);

        // Player sprite with error handling and frame validation
        if (this.textures.exists('player')) {
            this.playerSprite = this.add.sprite(width * 0.25, height * 0.52, 'player');
            this.playerSprite.setScale(2.5);

            // Verify frame 12 exists (up-facing frame for back view)
            const texture = this.textures.get('player');
            const frameCount = texture.frameTotal;
            console.log(`🎮 Player sprite frames available: ${frameCount}`);

            if (frameCount > 12) {
                this.playerSprite.setFrame(12); // Up-facing frame (back to camera)
            } else {
                console.warn('⚠️ Frame 12 not available, using frame 0');
                this.playerSprite.setFrame(0);
            }
        } else {
            // Fallback: create a colored rectangle if texture failed
            console.error('❌ Player texture not found in battle, using fallback graphics');
            const fallbackGraphics = this.add.graphics();
            fallbackGraphics.fillStyle(0x4a90d9, 1);
            fallbackGraphics.fillRect(width * 0.25 - 16, height * 0.52 - 24, 32, 48);
            // Create a sprite reference anyway to avoid null errors
            this.playerSprite = this.add.sprite(width * 0.25, height * 0.52, 'player');
            this.playerSprite.setVisible(false);
        }
    }

    // ===========================================================================
    // UI CREATION
    // ===========================================================================

    private createTextBox(width: number, height: number): void {
        this.textBox = this.add.container(0, height * 0.72);

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x2d2d44, 0.95);
        bg.fillRoundedRect(10, 0, width * 0.58, height * 0.26, 8);
        bg.lineStyle(3, 0x6a6a8a, 1);
        bg.strokeRoundedRect(10, 0, width * 0.58, height * 0.26, 8);

        // Text content
        this.textContent = this.add.text(25, 15, '', {
            fontSize: '14px',
            color: '#ffffff',
            wordWrap: { width: width * 0.54 },
            lineSpacing: 4
        });

        // Continue indicator
        const continueIndicator = this.add.text(width * 0.52, height * 0.20, '▼', {
            fontSize: '12px',
            color: '#888888'
        });
        continueIndicator.setName('continueIndicator');
        continueIndicator.setVisible(false);

        this.tweens.add({
            targets: continueIndicator,
            y: continueIndicator.y + 5,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.textBox.add([bg, this.textContent, continueIndicator]);
    }

    private createMainMenu(width: number, height: number): void {
        this.menuContainer = this.add.container(width * 0.60, height * 0.72);

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x2d2d44, 0.95);
        bg.fillRoundedRect(0, 0, width * 0.38, height * 0.26, 8);
        bg.lineStyle(3, 0x6a6a8a, 1);
        bg.strokeRoundedRect(0, 0, width * 0.38, height * 0.26, 8);
        this.menuContainer.add(bg);

        // Menu options
        const startY = 20;
        const spacing = 28;

        this.MENU_OPTIONS.forEach((option, index) => {
            const selector = this.add.text(15, startY + spacing * index, '❤️', {
                fontSize: '14px'
            });
            selector.setName(`selector_${index}`);
            selector.setVisible(index === 0);

            const text = this.add.text(40, startY + spacing * index, option, {
                fontSize: '16px',
                color: '#ffffff',
                fontStyle: 'bold'
            });
            text.setName(`option_${index}`);

            this.menuContainer.add([selector, text]);
        });

        this.menuContainer.setVisible(false);
    }

    private createMoveMenu(width: number, height: number): void {
        this.moveMenuContainer = this.add.container(width * 0.60, height * 0.72);

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x2d2d44, 0.95);
        bg.fillRoundedRect(0, 0, width * 0.38, height * 0.26, 8);
        bg.lineStyle(3, 0xff6b9d, 1);
        bg.strokeRoundedRect(0, 0, width * 0.38, height * 0.26, 8);
        this.moveMenuContainer.add(bg);

        // Will be populated when COMFORT is selected
        this.moveMenuContainer.setVisible(false);
    }

    private updateMoveMenu(): void {
        // Clear existing move items
        const toRemove = this.moveMenuContainer.getAll().filter(
            (child) => child.name?.startsWith('move_')
        );
        toRemove.forEach(child => child.destroy());

        const startY = 12;
        const spacing = 20;

        this.playerMemory.moves.forEach((move, index) => {
            const selector = this.add.text(10, startY + spacing * index, '💕', {
                fontSize: '10px'
            });
            selector.setName(`move_selector_${index}`);
            selector.setVisible(index === this.currentMoveIndex);

            const text = this.add.text(28, startY + spacing * index, `${move.emoji} ${move.name}`, {
                fontSize: '12px',
                color: '#ffffff'
            });
            text.setName(`move_${index}`);

            this.moveMenuContainer.add([selector, text]);
        });
    }

    private createHealthBars(width: number, height: number): void {
        // Enemy stress bar (top left)
        const enemyBarContainer = this.add.container(20, 20);

        const enemyBg = this.add.graphics();
        enemyBg.fillStyle(0x2d2d44, 0.9);
        enemyBg.fillRoundedRect(0, 0, 180, 50, 6);
        enemyBg.lineStyle(2, 0x6a6a8a, 1);
        enemyBg.strokeRoundedRect(0, 0, 180, 50, 6);

        const enemyName = this.add.text(10, 5, `${this.enemy.name} Lv.${this.enemy.level}`, {
            fontSize: '12px',
            color: '#ffffff'
        });

        const stressLabel = this.add.text(10, 22, 'STRESS', {
            fontSize: '10px',
            color: '#ff6b6b'
        });

        this.enemyStressBar = this.add.graphics();
        this.updateEnemyBar();

        enemyBarContainer.add([enemyBg, enemyName, stressLabel, this.enemyStressBar]);

        // Player vibe bar (bottom right, above menu)
        const playerBarContainer = this.add.container(width - 200, height * 0.58);

        const playerBg = this.add.graphics();
        playerBg.fillStyle(0x2d2d44, 0.9);
        playerBg.fillRoundedRect(0, 0, 180, 50, 6);
        playerBg.lineStyle(2, 0x6a6a8a, 1);
        playerBg.strokeRoundedRect(0, 0, 180, 50, 6);

        const playerName = this.add.text(10, 5, `${this.playerMemory.name} Lv.${this.playerMemory.level}`, {
            fontSize: '12px',
            color: '#ffffff'
        });

        const vibeLabel = this.add.text(10, 22, 'VIBE', {
            fontSize: '10px',
            color: '#4a90d9'
        });

        this.playerVibeBar = this.add.graphics();
        this.updatePlayerBar();

        playerBarContainer.add([playerBg, playerName, vibeLabel, this.playerVibeBar]);
    }

    private updateEnemyBar(): void {
        const barWidth = 120;
        const barHeight = 8;
        const fillPercent = this.enemy.currentStress / this.enemy.maxStress;

        this.enemyStressBar.clear();

        // Background
        this.enemyStressBar.fillStyle(0x333333, 1);
        this.enemyStressBar.fillRoundedRect(50, 25, barWidth, barHeight, 2);

        // Fill
        const color = fillPercent > 0.5 ? 0xff6b6b : fillPercent > 0.25 ? 0xffaa00 : 0x44ff44;
        this.enemyStressBar.fillStyle(color, 1);
        this.enemyStressBar.fillRoundedRect(50, 25, barWidth * fillPercent, barHeight, 2);
    }

    private updatePlayerBar(): void {
        const barWidth = 120;
        const barHeight = 8;
        const fillPercent = this.playerMemory.currentVibe / this.playerMemory.maxVibe;

        this.playerVibeBar.clear();

        // Background
        this.playerVibeBar.fillStyle(0x333333, 1);
        this.playerVibeBar.fillRoundedRect(50, 25, barWidth, barHeight, 2);

        // Fill
        const color = fillPercent > 0.5 ? 0x4a90d9 : fillPercent > 0.25 ? 0x9966ff : 0xff6b9d;
        this.playerVibeBar.fillStyle(color, 1);
        this.playerVibeBar.fillRoundedRect(50, 25, barWidth * fillPercent, barHeight, 2);
    }

    /**
     * Creates the memory drop popup (hidden by default)
     */
    private createMemoryPopup(width: number, height: number): void {
        this.memoryPopup = this.add.container(width / 2, height / 2);
        this.memoryPopup.setDepth(100);
        this.memoryPopup.setVisible(false);

        // Semi-transparent background
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.8);
        overlay.fillRect(-width / 2, -height / 2, width, height);

        // Popup box
        const boxWidth = 280;
        const boxHeight = 180;
        const box = this.add.graphics();
        box.fillStyle(0x2a2a4a, 1);
        box.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 12);
        box.lineStyle(4, 0xff6b9d, 1);
        box.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 12);

        // Title text
        const title = this.add.text(0, -60, '✨ Nuovo Ricordo! ✨', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffcc00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Memory emoji placeholder (will be updated when showing)
        const memoryEmoji = this.add.text(0, -20, '💕', {
            fontSize: '32px'
        }).setOrigin(0.5).setName('memoryEmoji');

        // Memory name placeholder
        const memoryName = this.add.text(0, 20, 'Memory Name', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setName('memoryName');

        // Memory description placeholder
        const memoryDesc = this.add.text(0, 50, 'Description...', {
            fontSize: '11px',
            fontFamily: 'Arial',
            color: '#aaaaaa',
            wordWrap: { width: 240 },
            align: 'center'
        }).setOrigin(0.5).setName('memoryDesc');

        // Continue prompt
        const continueText = this.add.text(0, 75, '[ Premi SPAZIO ]', {
            fontSize: '10px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);

        // Add all elements to container
        this.memoryPopup.add([overlay, box, title, memoryEmoji, memoryName, memoryDesc, continueText]);
    }

    // ===========================================================================
    // INPUT HANDLING
    // ===========================================================================

    private setupInput(): void {
        this.input.keyboard!.on('keydown-UP', () => this.handleMenuNavigation(-1));
        this.input.keyboard!.on('keydown-DOWN', () => this.handleMenuNavigation(1));
        this.input.keyboard!.on('keydown-W', () => this.handleMenuNavigation(-1));
        this.input.keyboard!.on('keydown-S', () => this.handleMenuNavigation(1));
        this.input.keyboard!.on('keydown-ENTER', () => this.handleConfirm());
        this.input.keyboard!.on('keydown-SPACE', () => this.handleConfirm());
        this.input.keyboard!.on('keydown-ESC', () => this.handleCancel());
        this.input.keyboard!.on('keydown-X', () => this.handleCancel());
    }

    private handleMenuNavigation(direction: number): void {
        if (this.isAnimating || this.isTyping) return;

        if (this.state === BattleState.PLAYER_TURN) {
            this.currentMenuIndex = (this.currentMenuIndex + direction + this.MENU_OPTIONS.length) % this.MENU_OPTIONS.length;
            this.updateMenuSelection();
        } else if (this.state === BattleState.PLAYER_SELECTING_MOVE) {
            const moveCount = this.playerMemory.moves.length;
            this.currentMoveIndex = (this.currentMoveIndex + direction + moveCount) % moveCount;
            this.updateMoveSelection();
        }
    }

    private updateMenuSelection(): void {
        this.MENU_OPTIONS.forEach((_, index) => {
            const selector = this.menuContainer.getByName(`selector_${index}`) as Phaser.GameObjects.Text;
            if (selector) {
                selector.setVisible(index === this.currentMenuIndex);
            }
        });
    }

    private updateMoveSelection(): void {
        this.playerMemory.moves.forEach((_, index) => {
            const selector = this.moveMenuContainer.getByName(`move_selector_${index}`) as Phaser.GameObjects.Text;
            if (selector) {
                selector.setVisible(index === this.currentMoveIndex);
            }
        });
    }

    private handleConfirm(): void {
        console.log(`🎮 handleConfirm | state: ${BattleState[this.state]} | isTyping: ${this.isTyping} | textQueue: ${this.textQueue.length}`);

        if (this.isTyping) {
            // Skip typewriter, show full text
            this.skipTypewriter();
            return;
        }

        if (this.textQueue.length > 0) {
            this.showNextText();
            return;
        }

        if (this.isAnimating) return;

        switch (this.state) {
            case BattleState.INTRO:
                this.transitionToPlayerTurn();
                break;
            case BattleState.PLAYER_TURN:
                this.handleMainMenuSelection();
                break;
            case BattleState.PLAYER_SELECTING_MOVE:
                this.executePlayerMove();
                break;
            case BattleState.VICTORY:
            case BattleState.DEFEAT:
            case BattleState.RUN_AWAY:
                this.endBattle();
                break;
            case BattleState.MEMORY_DROP:
                // Dismiss popup and end battle
                console.log('✅ Closing memory popup and ending battle');
                this.memoryPopup.setVisible(false);
                this.endBattle();
                break;
        }
    }

    private handleCancel(): void {
        if (this.isAnimating || this.isTyping) return;

        if (this.state === BattleState.PLAYER_SELECTING_MOVE) {
            this.state = BattleState.PLAYER_TURN;
            this.moveMenuContainer.setVisible(false);
            this.menuContainer.setVisible(true);
            this.showText('What will you do?');
        }
    }

    private handleMainMenuSelection(): void {
        const selected = this.MENU_OPTIONS[this.currentMenuIndex];

        switch (selected) {
            case 'COMFORT':
                this.state = BattleState.PLAYER_SELECTING_MOVE;
                this.menuContainer.setVisible(false);
                this.moveMenuContainer.setVisible(true);
                this.currentMoveIndex = 0;
                this.updateMoveMenu();
                this.showText('Choose how to comfort...');
                break;
            case 'ITEMS':
                this.showText('Your bag is empty... but your heart is full! 💕');
                break;
            case 'RUN':
                this.attemptRun();
                break;
        }
    }

    // ===========================================================================
    // BATTLE FLOW
    // ===========================================================================

    private startBattleIntro(): void {
        this.state = BattleState.INTRO;

        // Enemy entrance animation
        this.enemySprite.setAlpha(0);
        this.enemySprite.y -= 30;

        this.tweens.add({
            targets: this.enemySprite,
            alpha: 1,
            y: this.enemySprite.y + 30,
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.queueText(`A wild ${this.enemy.name} appeared! 😰`);
                this.queueText(`It's overwhelming you with ${this.enemy.attackName.toLowerCase()}...`);
                this.showNextText();
            }
        });
    }

    private transitionToPlayerTurn(): void {
        this.state = BattleState.PLAYER_TURN;
        this.menuContainer.setVisible(true);
        this.showText('What will you do?');
    }

    private executePlayerMove(): void {
        const move = this.playerMemory.moves[this.currentMoveIndex];
        this.state = BattleState.PLAYER_ACTION;
        this.isAnimating = true;

        this.menuContainer.setVisible(false);
        this.moveMenuContainer.setVisible(false);

        // Calculate damage
        const damage = calculateDamage(move.power);

        // Show move text from BattleText.moves
        const moveText = getMoveDescription(move.id);
        this.queueText(`${move.emoji} ${moveText}`);

        // Animate player attack
        this.tweens.add({
            targets: this.playerSprite,
            x: this.playerSprite.x + 30,
            duration: 150,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                // Apply damage
                this.enemy.currentStress = Math.max(0, this.enemy.currentStress - damage);

                // Shake enemy
                this.cameras.main.shake(100, 0.01);
                this.tweens.add({
                    targets: this.enemySprite,
                    x: this.enemySprite.x + 5,
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                    onComplete: () => {
                        this.updateEnemyBar();

                        // Heal player slightly if it's a heal move
                        if (move.type === 'heal') {
                            const healAmount = Math.round(damage * 0.3);
                            this.playerMemory.currentVibe = Math.min(
                                this.playerMemory.maxVibe,
                                this.playerMemory.currentVibe + healAmount
                            );
                            this.updatePlayerBar();
                            this.queueText(`You feel a warm glow... (+${healAmount} Vibe) 💕`);
                        }

                        this.queueText(`${this.enemy.name}'s stress decreased by ${damage}!`);
                        this.showNextText();

                        // Check for victory
                        if (this.enemy.currentStress <= 0) {
                            this.time.delayedCall(1500, () => {
                                this.handleVictory();
                            });
                        } else {
                            this.time.delayedCall(1500, () => {
                                this.isAnimating = false;
                                this.enemyTurn();
                            });
                        }
                    }
                });
            }
        });
    }

    private enemyTurn(): void {
        this.state = BattleState.ENEMY_TURN;

        const damage = calculateDamage(this.enemy.attackPower);

        this.queueText(`${this.enemy.attackDescription}`);

        // Enemy attack animation
        this.tweens.add({
            targets: this.enemySprite,
            x: this.enemySprite.x - 30,
            duration: 200,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                // Apply damage to player
                this.playerMemory.currentVibe = Math.max(0, this.playerMemory.currentVibe - damage);

                // Flash player
                this.tweens.add({
                    targets: this.playerSprite,
                    alpha: 0.3,
                    duration: 100,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => {
                        this.updatePlayerBar();
                        this.queueText(`Your vibe dropped by ${damage}... 😢`);
                        this.showNextText();

                        // Check for defeat
                        if (this.playerMemory.currentVibe <= 0) {
                            this.time.delayedCall(1500, () => {
                                this.handleDefeat();
                            });
                        } else {
                            this.time.delayedCall(1500, () => {
                                this.transitionToPlayerTurn();
                            });
                        }
                    }
                });
            }
        });
    }

    private attemptRun(): void {
        // 70% chance to run successfully
        if (Math.random() < 0.7) {
            this.state = BattleState.RUN_AWAY;
            this.menuContainer.setVisible(false);
            this.queueText('You decided to take a breather... 🏃');
            this.queueText('Sometimes walking away is self-care! 💕');
            this.showNextText();
        } else {
            this.queueText(`${this.enemy.name} won't let you leave that easily!`);
            this.showNextText();
            this.time.delayedCall(1500, () => {
                this.enemyTurn();
            });
        }
    }

    private handleVictory(): void {
        this.state = BattleState.VICTORY;

        // Fade out enemy
        this.tweens.add({
            targets: this.enemySprite,
            alpha: 0,
            y: this.enemySprite.y - 20,
            duration: 500,
            ease: 'Power2'
        });

        // Use random victory message from BattleText
        this.queueText(getVictoryMessage());
        this.queueText(`Your vibe increased by ${this.enemy.vibeReward}! 💕`);

        // Restore some vibe
        this.playerMemory.currentVibe = Math.min(
            this.playerMemory.maxVibe,
            this.playerMemory.currentVibe + this.enemy.vibeReward
        );
        this.updatePlayerBar();

        // Try to drop a memory
        this.tryDropMemory();

        this.showNextText();
    }

    /**
     * Attempts to drop a random uncollected memory
     */
    private tryDropMemory(): void {
        // Filter memories the player hasn't collected yet
        const uncollected = AllMemories.filter(
            memory => !GameState.hasCollected(memory.id)
        );

        // If there are uncollected memories, randomly pick one
        if (uncollected.length > 0) {
            const randomIndex = Math.floor(Math.random() * uncollected.length);
            this.droppedMemory = uncollected[randomIndex];

            // Add to player inventory
            GameState.collectMemory(this.droppedMemory.id);

            // Queue the memory drop message and show popup after text
            this.queueText('Hai trovato qualcosa di speciale! ✨');

            // After text finishes, show the memory popup
            this.time.delayedCall(2500, () => {
                this.showMemoryDropPopup();
            });
        }
    }

    /**
     * Shows the memory drop popup with the collected memory details
     */
    private showMemoryDropPopup(): void {
        if (!this.droppedMemory) return;

        // CRITICAL: Clear text queue and animation states to prevent softlock
        this.textQueue = [];
        this.isTyping = false;
        this.isAnimating = false;

        // Stop any active typewriter
        if (this.typewriterEvent) {
            this.typewriterEvent.destroy();
            this.typewriterEvent = undefined;
        }

        // Update popup content
        const emojiText = this.memoryPopup.getByName('memoryEmoji') as Phaser.GameObjects.Text;
        const nameText = this.memoryPopup.getByName('memoryName') as Phaser.GameObjects.Text;
        const descText = this.memoryPopup.getByName('memoryDesc') as Phaser.GameObjects.Text;

        if (emojiText) emojiText.setText(this.droppedMemory.emoji || '💕');
        if (nameText) nameText.setText(this.droppedMemory.name);
        if (descText) descText.setText(this.droppedMemory.description);

        // Show popup
        this.memoryPopup.setVisible(true);
        this.memoryPopup.setAlpha(0);

        // Fade in animation
        this.tweens.add({
            targets: this.memoryPopup,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });

        // Change state to memory drop
        this.state = BattleState.MEMORY_DROP;

        console.log('✨ Memory popup shown, press SPACE to continue');

        // Check for endgame
        this.checkEndgame();

        console.log(`✨ Memory collected: ${this.droppedMemory.name}`);
        console.log(`📊 Total memories: ${GameState.getCollectedCount()}/${AllMemories.length}`);
    }

    /**
     * Checks if all memories have been collected
     */
    private checkEndgame(): void {
        if (GameState.getCollectedCount() === AllMemories.length) {
            GameState.setFlag('isReadyForFinale', true);
            console.log('🎉 All memories collected! Ready for finale!');
        }
    }

    private handleDefeat(): void {
        this.state = BattleState.DEFEAT;

        this.queueText('You feel overwhelmed... 😢');
        this.queueText('But remember: it\'s okay to struggle.');
        this.queueText('Take a deep breath and try again! 💕');

        // Restore player to half vibe
        this.playerMemory.currentVibe = Math.floor(this.playerMemory.maxVibe / 2);

        this.showNextText();
    }

    private endBattle(): void {
        // Transition back to world
        this.cameras.main.fadeOut(500, 0, 0, 0);

        this.time.delayedCall(500, () => {
            // Use wake() instead of start() to preserve the WorldScene state
            // This triggers the 'wake' event handler in WorldScene
            this.scene.stop('BattleScene');
            this.scene.wake('WorldScene', {
                playerPosition: this.returnPosition,
                playerVibe: this.playerMemory.currentVibe
            });
            console.log('🔄 Waking WorldScene from battle');
        });
    }

    // ===========================================================================
    // TEXT SYSTEM
    // ===========================================================================

    private queueText(text: string): void {
        this.textQueue.push(text);
    }

    private showNextText(): void {
        if (this.textQueue.length === 0) return;

        const text = this.textQueue.shift()!;
        this.showText(text);
    }

    private showText(text: string): void {
        this.textContent.setText('');
        this.isTyping = true;

        let charIndex = 0;
        const continueIndicator = this.textBox.getByName('continueIndicator') as Phaser.GameObjects.Text;
        continueIndicator?.setVisible(false);

        this.typewriterEvent = this.time.addEvent({
            delay: 30,
            repeat: text.length - 1,
            callback: () => {
                this.textContent.setText(text.substring(0, charIndex + 1));
                charIndex++;

                if (charIndex >= text.length) {
                    this.isTyping = false;
                    if (this.textQueue.length > 0 ||
                        this.state === BattleState.VICTORY ||
                        this.state === BattleState.DEFEAT ||
                        this.state === BattleState.RUN_AWAY) {
                        continueIndicator?.setVisible(true);
                    }
                }
            }
        });
    }

    private skipTypewriter(): void {
        if (this.typewriterEvent) {
            this.typewriterEvent.destroy();
        }

        // Show full text from queue
        const fullText = this.textContent.text +
            (this.textQueue.length > 0 ? '' : '');
        this.textContent.setText(fullText);
        this.isTyping = false;

        const continueIndicator = this.textBox.getByName('continueIndicator') as Phaser.GameObjects.Text;
        if (this.textQueue.length > 0 ||
            this.state === BattleState.VICTORY ||
            this.state === BattleState.DEFEAT ||
            this.state === BattleState.RUN_AWAY) {
            continueIndicator?.setVisible(true);
        }
    }
}
