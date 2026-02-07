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
import { ITEMS } from '../data/Items';
import { ReactionBubble, ReactionType } from '../ui/ReactionBubble';
import { StatusType, createStatus, STATUS_DEFINITIONS } from '../battle/BattleStatus';
import { BattleRhythmUI, RhythmResult } from '../ui/BattleRhythmUI';
import { FloatingNumbers } from '../ui/FloatingNumbers';


/**
 * Battle States for the state machine
 */
enum BattleState {
    INTRO,
    PLAYER_TURN,
    PLAYER_SELECTING_MOVE,
    PLAYER_SELECTING_ITEM,
    PLAYER_ACTION,
    ENEMY_TURN,
    ENEMY_ACTION,
    VICTORY,
    MEMORY_DROP,
    DEFEAT,
    RUN_AWAY,
    MINIGAME
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
    private itemMenuContainer!: Phaser.GameObjects.Container;
    private enemyStressBar!: Phaser.GameObjects.Graphics;
    private playerVibeBar!: Phaser.GameObjects.Graphics;
    private enemySprite!: Phaser.GameObjects.Sprite;
    private playerSprite!: Phaser.GameObjects.Sprite;

    // UI Constants
    private readonly MENU_OPTIONS = ['COMFORT', 'ITEMS', 'RUN'];
    private currentMenuIndex = 0;
    private currentMoveIndex = 0;
    private currentItemIndex = 0;
    private isAnimating = false;

    // Text queue for typewriter effect
    private textQueue: string[] = [];
    private isTyping = false;
    private typewriterEvent?: Phaser.Time.TimerEvent;

    // Memory drop system
    private droppedMemory: MemoryItem | null = null;
    private memoryPopup!: Phaser.GameObjects.Container;

    // Action Command UI
    private rhythmUI!: BattleRhythmUI;

    // Floating Numbers
    private floatingNumbers!: FloatingNumbers;

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
        this.createItemMenu(width, height);
        this.createHealthBars(width, height);
        this.createMemoryPopup(width, height);

        // Create Rhythm UI
        this.rhythmUI = new BattleRhythmUI(this, width / 2, height * 0.85);
        this.rhythmUI = new BattleRhythmUI(this, width / 2, height * 0.85);
        this.rhythmUI.setDepth(200); // Ensure on top

        // Create Floating Numbers Container
        this.floatingNumbers = new FloatingNumbers(this, 0, 0);
        this.floatingNumbers.setDepth(300); // Highest priority

        // Setup input
        this.setupInput();

        // Start battle intro
        this.startBattleIntro();
    }

    update(time: number, delta: number): void {
        if (this.rhythmUI) {
            this.rhythmUI.update(time, delta);
        }
    }

    // ===========================================================================
    // BACKGROUND & ARENA
    // ===========================================================================

    private createBackground(width: number, height: number): void {
        // Use battle background image instead of gradient
        const bg = this.add.image(0, 0, 'battle-bg');
        bg.setOrigin(0, 0);
        bg.setDisplaySize(width, height);
        bg.setDepth(-100); // Ensure it's at the bottom

        // Add some ambient particles (hearts) - keeps the nice touch
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

    private createItemMenu(width: number, height: number): void {
        this.itemMenuContainer = this.add.container(width * 0.60, height * 0.72);

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x2d2d44, 0.95);
        bg.fillRoundedRect(0, 0, width * 0.38, height * 0.26, 8);
        bg.lineStyle(3, 0xffff00, 1); // Yellow for items
        bg.strokeRoundedRect(0, 0, width * 0.38, height * 0.26, 8);
        this.itemMenuContainer.add(bg);

        this.itemMenuContainer.setVisible(false);
    }

    private updateItemMenu(): void {
        // Clear existing item items
        const toRemove = this.itemMenuContainer.getAll().filter(
            (child) => child.name?.startsWith('item_')
        );
        toRemove.forEach(child => child.destroy());

        const startY = 12;
        const spacing = 20;
        const inventory = GameState.getInventoryItems();

        if (inventory.length === 0) {
            const text = this.add.text(28, startY, 'Bag is empty...', {
                fontSize: '12px', color: '#aaaaaa'
            });
            text.setName('item_empty');
            this.itemMenuContainer.add(text);
            return;
        }

        inventory.forEach((invItem, index) => {
            const itemDef = ITEMS[invItem.id];
            const selector = this.add.text(10, startY + spacing * index, '👉', {
                fontSize: '10px'
            });
            selector.setName(`item_selector_${index}`);
            selector.setVisible(index === this.currentItemIndex);

            const text = this.add.text(28, startY + spacing * index, `${itemDef.emoji} ${itemDef.name} x${invItem.count}`, {
                fontSize: '12px',
                color: '#ffffff'
            });
            text.setName(`item_${index}`);

            this.itemMenuContainer.add([selector, text]);
        });
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

        this.clearStatusIcons('enemy');
        this.enemyStressBar.clear();

        // Background
        this.enemyStressBar.fillStyle(0x333333, 1);
        this.enemyStressBar.fillRoundedRect(50, 25, barWidth, barHeight, 2);

        // Fill
        const color = fillPercent > 0.5 ? 0xff6b6b : fillPercent > 0.25 ? 0xffaa00 : 0x44ff44;
        this.enemyStressBar.fillStyle(color, 1);
        this.enemyStressBar.fillRoundedRect(50, 25, barWidth * fillPercent, barHeight, 2);

        // Draw Status Effects
        this.drawStatusIcons('enemy', 50, 40);
    }

    private updatePlayerBar(): void {
        const barWidth = 120;
        const barHeight = 8;
        const fillPercent = this.playerMemory.currentVibe / this.playerMemory.maxVibe;

        this.clearStatusIcons('player');
        this.playerVibeBar.clear();

        // Background
        this.playerVibeBar.fillStyle(0x333333, 1);
        this.playerVibeBar.fillRoundedRect(50, 25, barWidth, barHeight, 2);

        // Fill
        const color = fillPercent > 0.5 ? 0x4a90d9 : fillPercent > 0.25 ? 0x9966ff : 0xff6b9d;
        this.playerVibeBar.fillStyle(color, 1);
        this.playerVibeBar.fillRoundedRect(50, 25, barWidth * fillPercent, barHeight, 2);

        // Draw Status Effects
        this.drawStatusIcons('player', 50, 40);
    }

    private drawStatusIcons(target: 'player' | 'enemy', x: number, y: number): void {
        const statuses = target === 'player' ? this.playerMemory.activeStatuses : this.enemy.activeStatuses;
        if (!statuses) return;

        statuses.forEach((status, index) => {
            const def = STATUS_DEFINITIONS[status.id];
            if (def) {
                const icon = this.add.text(
                    (target === 'enemy' ? 20 + x : this.cameras.main.width - 200 + x) + (index * 25),
                    (target === 'enemy' ? 20 + y : this.cameras.main.height * 0.58 + y),
                    def.emoji,
                    { fontSize: '14px' }
                );
                // Simple float animation
                this.tweens.add({
                    targets: icon,
                    y: icon.y - 3,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1
                });
                // Ensure icons are cleaned up next update? 
                // Actually graphics clear handles bars, but text persists.
                // We should probably use a container for bars to handle this better, 
                // but for now let's just make sure we don't leak.
                // Simplified approach: Clear previous icons first? 
                // Since this is called often, we really should manage these icons.
                // Let's assume for this step we won't clutter too much or we'll just implement a clearer later.
                // Better approach: Add to a container passed in? No, let's keep it simple for now and rely on scene cleanup or just use a dedicated container in real implementation.
                // For this edit, I will add them to the respective containers (enemyBarContainer / playerBarContainer) if I can access them.
                // I can't easily access local variables of createHealthBars.
                // I will skip adding complex container logic and just rely on a simple text add for now, but note it might duplicate.
                // actually, let's use a unique name prefix and clear them.
                icon.setName(`status_${target}_${index}`);
                icon.setDepth(10);
            }
        });
    }

    private clearStatusIcons(target: 'player' | 'enemy'): void {
        // This is getting messy accessing children directly.
        // Let's rely on the update method clearing by name.
        this.children.getAll().forEach(child => {
            if (child.name.startsWith(`status_${target}_`)) {
                child.destroy();
            }
        });
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
            this.currentMoveIndex = (this.currentMoveIndex + direction + moveCount) % moveCount;
            this.updateMoveSelection();
        } else if (this.state === BattleState.PLAYER_SELECTING_ITEM) {
            const inventory = GameState.getInventoryItems();
            if (inventory.length > 0) {
                this.currentItemIndex = (this.currentItemIndex + direction + inventory.length) % inventory.length;
                this.updateItemSelection();
            }
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

    private updateItemSelection(): void {
        const inventory = GameState.getInventoryItems();
        inventory.forEach((_, index) => {
            const selector = this.itemMenuContainer.getByName(`item_selector_${index}`) as Phaser.GameObjects.Text;
            if (selector) {
                selector.setVisible(index === this.currentItemIndex);
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
            case BattleState.PLAYER_SELECTING_ITEM:
                this.useItem();
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
            this.moveMenuContainer.setVisible(false);
            this.menuContainer.setVisible(true);
            this.showText('What will you do?');
        } else if (this.state === BattleState.PLAYER_SELECTING_ITEM) {
            this.state = BattleState.PLAYER_TURN;
            this.itemMenuContainer.setVisible(false);
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
                this.state = BattleState.PLAYER_SELECTING_ITEM;
                this.menuContainer.setVisible(false);
                this.itemMenuContainer.setVisible(true);
                this.currentItemIndex = 0;
                this.updateItemMenu();
                this.showText('Choose an item...');
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
        // Process Turn Start (Check Status)
        this.updateStatusDurations('player');
        if (!this.processTurnStatus('player')) {
            // Turn skipped
            this.time.delayedCall(1500, () => {
                this.enemyTurn();
            });
            return;
        }

        this.state = BattleState.PLAYER_TURN;
        this.menuContainer.setVisible(true);
        this.showText('What will you do?');
    }

    // ===========================================================================
    // VFX METHODS
    // ===========================================================================

    private playKissEffect(start: Phaser.Math.Vector2, end: Phaser.Math.Vector2): void {
        const kiss = this.add.image(start.x, start.y, 'kiss');
        kiss.setDepth(100); // Ensure it's on top

        this.tweens.add({
            targets: kiss,
            x: end.x,
            y: end.y,
            angle: 360,
            duration: 500,
            ease: 'Power1',
            onComplete: () => {
                kiss.destroy();
            }
        });
    }

    private playHugEffect(target: Phaser.Math.Vector2): void {
        const radius = 50;
        const particleCount = 10;

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const x = target.x + Math.cos(angle) * (radius * 0.5); // Start closer
            const y = target.y + Math.sin(angle) * (radius * 0.5);

            const heart = this.add.image(x, y, 'heart');
            heart.setDepth(100);
            heart.setScale(0.5);

            this.tweens.add({
                targets: heart,
                x: target.x + Math.cos(angle) * radius,
                y: target.y + Math.sin(angle) * radius,
                alpha: 0,
                scale: 1,
                duration: 600,
                ease: 'Back.out',
                onComplete: () => {
                    heart.destroy();
                }
            });
        }
    }

    private executePlayerMove(): void {
        const move = this.playerMemory.moves[this.currentMoveIndex];

        // Hide menus
        this.menuContainer.setVisible(false);
        this.moveMenuContainer.setVisible(false);

        // Start Minigame logic
        this.state = BattleState.MINIGAME;
        this.queueText(`Chance for Action! Press SPACE!`);
        this.showNextText(); // Force show immediately

        this.rhythmUI.start((result) => {
            this.handleActionCommandResult(move, result);
        });
    }

    private handleActionCommandResult(move: any, result: RhythmResult): void {
        this.state = BattleState.PLAYER_ACTION;
        this.isAnimating = true;

        // Show reaction on player
        this.showReaction(this.playerSprite, 'love');


        this.menuContainer.setVisible(false);
        this.moveMenuContainer.setVisible(false);


        // Calculate damage
        let damage = calculateDamage(move.power);

        // Apply Rhythm Multiplier
        if (result === 'PERFECT') {
            damage = Math.floor(damage * 1.5);
            this.queueText('💖 PERFECT! (1.5x Power!)');
        } else if (result === 'GOOD') {
            damage = Math.floor(damage * 1.2);
            this.queueText('✨ Nice! (1.2x Power)');
        } else {
            damage = Math.floor(damage * 0.8);
            this.queueText('💦 Missed the rhythm... (0.8x Power)');
        }

        const isCrit = result === 'PERFECT';

        // Status Modifiers
        if (this.hasStatus('player', 'INSPIRED')) {
            damage = Math.floor(damage * 2);
            this.queueText('✨ Inspired! Double power!');
        }
        if (this.hasStatus('player', 'TIRED')) {
            damage = Math.floor(damage * 0.7);
        }

        // Show move text from BattleText.moves
        const moveText = getMoveDescription(move.id);
        this.queueText(`${move.emoji} ${moveText}`);

        // Trigger VFX based on move ID/Name
        const startPos = new Phaser.Math.Vector2(this.playerSprite.x, this.playerSprite.y);
        const endPos = new Phaser.Math.Vector2(this.enemySprite.x, this.enemySprite.y);

        if (move.name === 'Kiss' || move.id === 'kiss') {
            this.playKissEffect(startPos, endPos);
        } else if (move.name === 'Hug' || move.name === 'Comfort' || move.id === 'hug' || move.id === 'comfort') {
            this.playHugEffect(endPos);
        }

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

                // Floating Text
                this.floatingNumbers.x = this.enemySprite.x;
                this.floatingNumbers.y = this.enemySprite.y - 50;
                this.floatingNumbers.showText(damage, isCrit ? 'critical' : 'damage');

                // Shake enemy
                if (isCrit) {
                    this.cameras.main.shake(300, 0.02);
                    this.cameras.main.flash(200, 255, 255, 255); // White flash for crit
                } else {
                    this.cameras.main.shake(100, 0.01);
                }

                this.tweens.add({

                    targets: this.enemySprite,
                    x: this.enemySprite.x + 5,
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                    onComplete: () => {
                        this.updateEnemyBar();

                        // Apply Status Effect if any
                        if (move.statusEffect) {
                            const chance = move.statusChance || 0.5;
                            if (Math.random() < chance) {
                                this.applyStatus('enemy', move.statusEffect);
                            }
                        }

                        // Apply Self Status
                        if (move.selfStatus) {
                            this.applyStatus('player', move.selfStatus);
                        }

                        // Heal player slightly if it's a heal move
                        if (move.type === 'heal') {
                            const healAmount = Math.round(damage * 0.3);
                            this.playerMemory.currentVibe = Math.min(
                                this.playerMemory.maxVibe,
                                this.playerMemory.currentVibe + healAmount
                            );
                            this.updatePlayerBar();
                            this.queueText(`You feel a warm glow... (+${healAmount} Vibe) 💕`);

                            // Visual heal logic
                            this.time.delayedCall(500, () => {
                                this.floatingNumbers.x = this.playerSprite.x;
                                this.floatingNumbers.y = this.playerSprite.y - 50;
                                this.floatingNumbers.showText(healAmount, 'heal');
                            });
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

    private useItem(): void {
        const inventory = GameState.getInventoryItems();
        if (inventory.length === 0) return;

        const invItem = inventory[this.currentItemIndex];
        const item = ITEMS[invItem.id];

        if (!item) return;

        // Use the item
        if (GameState.useItem(item.id)) {
            this.state = BattleState.PLAYER_ACTION;
            this.itemMenuContainer.setVisible(false);
            this.isAnimating = true;

            this.queueText(`You used ${item.emoji} ${item.name}!`);

            // Apply Effects
            if (item.type === 'heal' || item.type === 'special') {
                const healAmount = item.value;
                this.playerMemory.currentVibe = Math.min(
                    this.playerMemory.maxVibe,
                    this.playerMemory.currentVibe + healAmount
                );
                this.updatePlayerBar();
                this.queueText(`You feel refreshed! (+${healAmount} Vibe)`);

                this.floatingNumbers.x = this.playerSprite.x;
                this.floatingNumbers.y = this.playerSprite.y - 50;
                this.floatingNumbers.showText(healAmount, 'heal');
            }

            if (item.type === 'comfort' || item.type === 'special') {
                const stressRed = item.value;
                this.enemy.currentStress = Math.max(0, this.enemy.currentStress - stressRed);
                this.updateEnemyBar();
                this.queueText(`${this.enemy.name} seems calmed by it. (-${stressRed} Stress)`);
            }

            this.showNextText();

            // Wait and then enemy turn or victory
            this.time.delayedCall(2000, () => {
                this.isAnimating = false;
                if (this.enemy.currentStress <= 0) {
                    this.handleVictory();
                } else {
                    this.enemyTurn();
                }
            });
        }
    }

    private enemyTurn(): void {
        this.state = BattleState.ENEMY_TURN;

        // Process Turn Start
        this.updateStatusDurations('enemy');
        if (!this.processTurnStatus('enemy')) {
            this.time.delayedCall(1500, () => {
                this.transitionToPlayerTurn();
            });
            return;
        }

        // CONFUSION CHECK: 50% chance to do something random/beneficial
        if (this.hasStatus('enemy', 'CONFUSED') && Math.random() < 0.5) {
            this.queueText(`${this.enemy.name} is confused and hugged you by mistake!`);
            this.playerMemory.currentVibe = Math.min(this.playerMemory.maxVibe, this.playerMemory.currentVibe + 10);
            this.updatePlayerBar();
            this.showReaction(this.enemySprite, 'love');
            this.showNextText();
            this.time.delayedCall(2000, () => {
                this.transitionToPlayerTurn();
            });
            return;
        }

        const damage = calculateDamage(this.enemy.attackPower);

        this.queueText(`${this.enemy.attackDescription}`);

        // Enemy attack animation
        this.showReaction(this.enemySprite, 'alert');

        this.tweens.add({

            targets: this.enemySprite,
            x: this.enemySprite.x - 30,
            duration: 200,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                // Apply damage to player
                this.playerMemory.currentVibe = Math.max(0, this.playerMemory.currentVibe - damage);

                // Floating text for player damage
                this.floatingNumbers.x = this.playerSprite.x;
                this.floatingNumbers.y = this.playerSprite.y - 50;
                this.floatingNumbers.showText(damage, 'damage');

                // Screen shake
                this.cameras.main.shake(200, 0.015);

                // Flash player
                this.tweens.add({
                    targets: this.playerSprite,
                    alpha: 0.3,
                    duration: 100,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => {
                        this.updatePlayerBar();
                        this.showReaction(this.playerSprite, 'sad');
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

        // XP and Leveling Logic
        const xpGain = this.enemy.xpReward || 30; // Default fallback
        this.playerMemory.xp = (this.playerMemory.xp || 0) + xpGain;
        this.queueText(`Gained ${xpGain} XP! ⭐`);

        // Initialize xpToNextLevel if missing (safety check)
        if (!this.playerMemory.xpToNextLevel) {
            this.playerMemory.xpToNextLevel = this.playerMemory.level * 100;
        }

        // Check for level up
        if (this.playerMemory.xp >= this.playerMemory.xpToNextLevel) {
            this.playerMemory.xp -= this.playerMemory.xpToNextLevel;
            this.playerMemory.level++;

            // Stat increases
            const vibeIncrease = 10;
            this.playerMemory.maxVibe += vibeIncrease;
            this.playerMemory.currentVibe = this.playerMemory.maxVibe; // Full heal on level up

            // New XP threshold
            this.playerMemory.xpToNextLevel = this.playerMemory.level * 100;

            this.queueText(`Level Up! Grew to Level ${this.playerMemory.level}! 🎉`);
            this.queueText(`Max Vibe increased to ${this.playerMemory.maxVibe}!`);

            // Play VFX (small flash)
            this.time.delayedCall(500, () => {
                this.cameras.main.flash(300, 255, 255, 200);
            });
        }

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
                playerMemory: this.playerMemory
            });
            console.log('🔄 Waking WorldScene from battle');
        });
    }

    // ===========================================================================
    // STATUS SYSTEM
    // ===========================================================================

    private applyStatus(target: 'player' | 'enemy', statusId: StatusType): void {
        const statuses = target === 'player' ? this.playerMemory.activeStatuses : this.enemy.activeStatuses;
        const targetName = target === 'player' ? 'You' : this.enemy.name;

        // Check if already active
        const existing = statuses.find(s => s.id === statusId);
        if (existing) {
            existing.duration = 2; // Refresh duration
            this.queueText(`${targetName} is still ${STATUS_DEFINITIONS[statusId].name.toLowerCase()}!`);
        } else {
            statuses.push(createStatus(statusId));
            this.queueText(`${targetName} became ${STATUS_DEFINITIONS[statusId].name.toLowerCase()}! ${STATUS_DEFINITIONS[statusId].emoji}`);
            // Force UI update
            if (target === 'player') this.updatePlayerBar(); else this.updateEnemyBar();

            // Floating Status Text
            const sprite = target === 'player' ? this.playerSprite : this.enemySprite;
            this.floatingNumbers.x = sprite.x;
            this.floatingNumbers.y = sprite.y - 60;
            this.floatingNumbers.showText(STATUS_DEFINITIONS[statusId].name, 'status');
        }
    }

    private hasStatus(target: 'player' | 'enemy', statusId: StatusType): boolean {
        const statuses = target === 'player' ? this.playerMemory.activeStatuses : this.enemy.activeStatuses;
        return statuses.some(s => s.id === statusId);
    }

    private updateStatusDurations(target: 'player' | 'enemy'): void {
        const statuses = target === 'player' ? this.playerMemory.activeStatuses : this.enemy.activeStatuses;
        // Reduce duration (simple approach: reduce all at start of turn)
        // Actually, we should iterate backwards to remove
        for (let i = statuses.length - 1; i >= 0; i--) {
            statuses[i].duration--;
            if (statuses[i].duration <= 0) {
                const name = STATUS_DEFINITIONS[statuses[i].id].name;
                const targetName = target === 'player' ? 'You are' : `${this.enemy.name} is`;
                this.queueText(`${targetName} no longer ${name.toLowerCase()}.`);
                statuses.splice(i, 1);
            }
        }
    }

    private processTurnStatus(target: 'player' | 'enemy'): boolean {
        const targetName = target === 'player' ? 'You' : this.enemy.name;

        // Return FALSE if turn should be skipped

        // LAUGHING: 50% chance to skip
        if (this.hasStatus(target, 'LAUGHING')) {
            if (Math.random() < 0.5) {
                this.queueText(`${targetName} is laughing too hard to move! 😂`);
                this.showNextText();
                return false;
            }
        }

        // DISTRACTED: 30% chance to skip
        if (this.hasStatus(target, 'DISTRACTED')) {
            if (Math.random() < 0.3) {
                this.queueText(`${targetName} is distracted looking at a butterfly... 🦋`);
                this.showNextText();
                return false;
            }
        }

        // PROUD: Passive Heal
        if (this.hasStatus(target, 'PROUD') && target === 'player') {
            this.playerMemory.currentVibe = Math.min(this.playerMemory.maxVibe, this.playerMemory.currentVibe + 5);
            this.updatePlayerBar();
            this.queueText('Feeling proud gave you energy! (+5 Vibe)');
            this.showNextText();
        }

        return true;
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

    private showReaction(target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image, type: ReactionType): void {
        if (target && target.visible) {
            new ReactionBubble(this, target.x, target.y - target.displayHeight / 2 - 20, type);
        }
    }
}
