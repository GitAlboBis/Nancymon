import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GameState } from '../state/GameState';
import { GardenSystem } from '../systems/GardenSystem';
import { PLANT_DEFINITIONS, GardenPlot } from '../data/GardenData';
import { ITEMS } from '../data/Items';
import { DialogueBox } from '../ui/DialogueBox';
import { TouchControls } from '../ui/TouchControls';
import { TILE_SIZE, Direction, DIRECTION_VECTORS } from '../config/GameConfig';

// ============================================================================
// GARDEN SCENE — Community Garden Active Minigame
// Players must actively nurture plants by pressing SPACE to grow them.
// ============================================================================

const GARDEN_COLS = 25; // 400px
const GARDEN_ROWS = 20; // 320px
const GARDEN_WIDTH = GARDEN_COLS * TILE_SIZE;
const GARDEN_HEIGHT = GARDEN_ROWS * TILE_SIZE;

// Plot grid config (4x3)
const PLOT_COLS = 4;
const PLOT_ROWS = 3;
const PLOT_TILE_SIZE = 3; // Each plot is 3x3 tiles
const PLOT_PIXEL_SIZE = PLOT_TILE_SIZE * TILE_SIZE;

// Colors
const COLORS = {
    GRASS_DARK: 0x3a7d34,
    GRASS_LIGHT: 0x4aa844,
    DIRT: 0x6b4226,
    DIRT_TILLED: 0x5a3520,
    DIRT_WET: 0x3d2515,
    FENCE: 0x8B6914,
    FENCE_DARK: 0x6B4F12,
    PATH: 0xC4A87C,
    PATH_DARK: 0xAA9060,
    HIGHLIGHT: 0xFFFFFF,
};

export class GardenScene extends Phaser.Scene {
    private player!: Player;
    private dialogueBox!: DialogueBox;
    private gardenSystem: GardenSystem;

    // Visuals
    private plotContainers: Phaser.GameObjects.Container[] = [];
    private plotPositions: { x: number; y: number }[] = [];
    private selectionBox!: Phaser.GameObjects.Graphics;

    // Input
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    private touchDirection: 'up' | 'down' | 'left' | 'right' | null = null;

    // State
    private isInDialogue = false;
    private canTriggerExit = false;
    private exitZone!: Phaser.GameObjects.Zone;

    constructor() {
        super({ key: 'GardenScene' });
        this.gardenSystem = GardenSystem.getInstance();
    }

    create(): void {
        console.log('🌻 Active Garden Scene loaded');

        // Reset state
        this.isInDialogue = false;
        this.canTriggerExit = false;
        this.plotContainers = [];
        this.plotPositions = [];
        this.touchDirection = null;

        // 1. World Layer
        this.drawBackground();
        this.drawFences();
        this.drawPath();
        this.createPlots();

        // 2. Player Layer
        const startTileX = Math.floor(GARDEN_COLS / 2);
        const startTileY = GARDEN_ROWS - 3;
        this.player = new Player(this, startTileX, startTileY);
        this.player.face(Direction.UP);

        // 3. UI Layer
        this.selectionBox = this.add.graphics().setDepth(10);
        this.dialogueBox = new DialogueBox(this);

        // 4. Setup
        this.setupInput();
        this.setupTouchControls();
        this.setupCamera();
        this.setupPhysics();

        // 5. Exit Zone
        const exitX = GARDEN_WIDTH / 2;
        const exitY = GARDEN_HEIGHT - TILE_SIZE / 2;
        this.exitZone = this.add.zone(exitX, exitY, TILE_SIZE * 4, TILE_SIZE);

        // Intro message
        this.time.delayedCall(500, () => {
            this.isInDialogue = true;
            this.dialogueBox.show('👩‍🌾 Nonna Rosa', [
                'Benvenuta! Qui devi rimboccarti le maniche! 💪',
                'Premi SPAZIO ripetutamente per far crescere le piante.',
                'Più amore ci metti, più in fretta cresceranno!'
            ], () => this.isInDialogue = false);
        });
    }

    update(time: number, delta: number): void {
        if (!this.isInDialogue) {
            this.handleInput();
            this.updateSelectionBox();
            this.checkExitZone();
        }
    }

    // ========================================================================
    // LOGIC & INTERACTION
    // ========================================================================

    private handleInput(): void {
        if (this.player.isMoving) return;

        // Movement
        let direction: Direction | null = null;
        if (this.cursors.left.isDown || this.wasdKeys.A.isDown) direction = Direction.LEFT;
        else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) direction = Direction.RIGHT;
        else if (this.cursors.up.isDown || this.wasdKeys.W.isDown) direction = Direction.UP;
        else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) direction = Direction.DOWN;

        // Touch Override
        if (this.touchDirection) {
            switch (this.touchDirection) {
                case 'left': direction = Direction.LEFT; break;
                case 'right': direction = Direction.RIGHT; break;
                case 'up': direction = Direction.UP; break;
                case 'down': direction = Direction.DOWN; break;
            }
        }

        if (direction !== null) {
            this.movePlayer(direction);
        }

        // Action (JustDown to prevent hold-spamming too easily, or allow hold depending on design)
        // For "mashing", JustDown is better tactile feel and prevents turbo-growth.
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.handleAction();
        }
    }

    private handleAction(): void {
        const plotIndex = this.getNearestPlotIndex();
        if (plotIndex === -1) return;

        const plot = GameState.getPlot(plotIndex);
        if (!plot) return;

        // CASE A: Empty -> Plant
        if (!plot.plantId) {
            this.tryPlantSeed(plotIndex);
            return;
        }

        // CASE B: Growing -> Nurture
        if (!this.gardenSystem.isRipe(plotIndex)) {
            this.nurturePlant(plotIndex);
            return;
        }

        // CASE C: Ripe -> Harvest
        this.harvestPlant(plotIndex);
    }

    private tryPlantSeed(index: number): void {
        const seeds = [
            'seed_love_berry',
            'seed_rose',
            'seed_sunflower',
            'seed_coffee'
        ];

        // Find first available seed in inventory
        // In a real game, this would open a menu. For this minigame/prototype, we auto-pick first available.
        const seedId = seeds.find(id => GameState.getItemCount(id) > 0);

        if (seedId) {
            // Check plant def
            const item = ITEMS[seedId];
            if (item && item.plantId) {
                // Consume seed
                GameState.useItem(seedId, 1);
                // Plant it
                this.gardenSystem.plantSeed(index, item.plantId);
                // Refresh visual
                this.refreshPlotVisual(index);
                // FX
                this.spawnFloatingText(index, '🌱 Planted!');
            }
        } else {
            this.spawnFloatingText(index, 'No Seeds!', '#ff0000');
        }
    }

    private nurturePlant(index: number): void {
        const leveledUp = this.gardenSystem.nurturePlant(index);

        // Visual Feedback (Juice)
        const container = this.plotContainers[index];
        // The plant sprite is added to the container. We need to find it.
        // Based on refreshPlotVisual, order is: soil(0), plant(1), bars(2,3) etc.
        // Wait, soil adds a rectangle, then maybe duplicate soil lines?
        // Let's just blindly grab the text object that is the plant.

        const plantSprite = container.list.find(obj => obj instanceof Phaser.GameObjects.Text && (obj as Phaser.GameObjects.Text).text !== '') as Phaser.GameObjects.Text;

        if (plantSprite) {
            // Squash and stretch
            this.tweens.add({
                targets: plantSprite,
                scaleX: plantSprite.scaleX * 1.2,
                scaleY: plantSprite.scaleY * 0.8,
                duration: 50,
                yoyo: true,
                ease: 'Quad.easeInOut'
            });
        }

        // Particles
        this.spawnParticles(index, '💧');

        if (leveledUp) {
            this.refreshPlotVisual(index);
            this.spawnFloatingText(index, 'Grew!', '#ffff00');
            // Flash effect
            this.tweens.add({
                targets: container,
                alpha: 0.5,
                duration: 100,
                yoyo: true,
                repeat: 1
            });
        }
    }

    private harvestPlant(index: number): void {
        const itemId = this.gardenSystem.harvestPlant(index);
        if (itemId) {
            const item = ITEMS[itemId];
            if (item) {
                GameState.addItem(itemId, 1);
                this.refreshPlotVisual(index);
                this.spawnFloatingText(index, `+1 ${item.emoji} ${item.name}`, '#ffff00');
            }
        }
    }

    private getNearestPlotIndex(): number {
        const playerX = this.player.sprite.x;
        const playerY = this.player.sprite.y;

        // Search slightly in front of player? Or just nearest?
        // Let's do nearest within small range
        let nearest = -1;
        let minDist = TILE_SIZE * 1.5; // Must be close

        this.plotPositions.forEach((pos, index) => {
            const dist = Phaser.Math.Distance.Between(playerX, playerY, pos.x, pos.y);
            if (dist < minDist) {
                nearest = index;
                minDist = dist;
            }
        });

        return nearest;
    }

    // ========================================================================
    // VISUALS
    // ========================================================================

    private createPlots(): void {
        // Calculate centered start position
        const layoutW = PLOT_COLS * PLOT_PIXEL_SIZE + (PLOT_COLS - 1) * TILE_SIZE;
        // const layoutH = PLOT_ROWS * PLOT_PIXEL_SIZE + (PLOT_ROWS - 1) * TILE_SIZE;

        const startX = (GARDEN_WIDTH - layoutW) / 2 + PLOT_PIXEL_SIZE / 2;
        const startY = TILE_SIZE * 5;
        const gap = TILE_SIZE; // 1 tile gap between plots

        for (let i = 0; i < 12; i++) {
            const col = i % PLOT_COLS;
            const row = Math.floor(i / PLOT_COLS);

            const x = startX + col * (PLOT_PIXEL_SIZE + gap);
            const y = startY + row * (PLOT_PIXEL_SIZE + gap);

            this.plotPositions[i] = { x, y };

            const container = this.add.container(x, y).setDepth(2);
            this.plotContainers[i] = container;

            this.refreshPlotVisual(i);
        }
    }

    private refreshPlotVisual(index: number): void {
        const container = this.plotContainers[index];
        container.removeAll(true);

        const plot = GameState.getPlot(index);
        if (!plot) return;

        // 1. Soil
        const soilColor = plot.plantId ? COLORS.DIRT_WET : COLORS.DIRT_TILLED;
        const soil = this.add.rectangle(0, 0, PLOT_PIXEL_SIZE, PLOT_PIXEL_SIZE, soilColor);
        soil.setStrokeStyle(1, 0x3d2515);
        container.add(soil);

        // 2. Plant
        if (plot.plantId) {
            const def = PLANT_DEFINITIONS[plot.plantId];
            if (def) {
                // Determine visuals based on stage
                // 0 = Seed, (Stages-1) = Ripe
                let emoji = '🌱';
                let scale = 0.5 + (plot.currentStage * 0.2);

                if (plot.currentStage === 0) emoji = '🌰'; // Seed
                else if (plot.currentStage === def.stages - 1) emoji = def.emoji; // Ripe
                else if (plot.currentStage >= Math.floor(def.stages / 2)) emoji = '🌿'; // Big Sprout

                const plantSprite = this.add.text(0, -5, emoji, { fontSize: '16px' })
                    .setOrigin(0.5);
                plantSprite.setScale(scale);
                container.add(plantSprite);

                // Growth Bar (if not ripe)
                if (plot.currentStage < def.stages - 1) {
                    const barWidth = 20;
                    // Show total progress to harvest
                    const totalProgress = plot.currentGrowthPoints / def.maxGrowthPoints;

                    const barBg = this.add.rectangle(0, 15, barWidth, 4, 0x000000).setAlpha(0.5);
                    const clampedProgress = Phaser.Math.Clamp(totalProgress, 0, 1);
                    const barFill = this.add.rectangle(-barWidth / 2 + (barWidth * clampedProgress) / 2, 15, barWidth * clampedProgress, 2, 0x00ff00);
                    container.add([barBg, barFill]);
                }
            }
        } else {
            // Empty plot hint
            // this.add.text(0, 0, '🕳️', { fontSize: '10px' }).setOrigin(0.5).setAlpha(0.3);
        }
    }

    private updateSelectionBox(): void {
        this.selectionBox.clear();
        const index = this.getNearestPlotIndex();
        if (index !== -1) {
            const pos = this.plotPositions[index];
            this.selectionBox.lineStyle(2, COLORS.HIGHLIGHT, 0.8);
            this.selectionBox.strokeRect(
                pos.x - PLOT_PIXEL_SIZE / 2 - 2,
                pos.y - PLOT_PIXEL_SIZE / 2 - 2,
                PLOT_PIXEL_SIZE + 4,
                PLOT_PIXEL_SIZE + 4
            );
        }
    }

    private spawnFloatingText(index: number, message: string, color: string = '#ffffff'): void {
        const pos = this.plotPositions[index];
        const text = this.add.text(pos.x, pos.y - 10, message, {
            fontSize: '10px',
            color: color,
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: text,
            y: pos.y - 30,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }

    private spawnParticles(index: number, char: string): void {
        const pos = this.plotPositions[index];
        const p = this.add.text(pos.x, pos.y, char, { fontSize: '12px' }).setDepth(15);
        this.tweens.add({
            targets: p,
            x: pos.x + Phaser.Math.Between(-10, 10),
            y: pos.y - 20,
            alpha: 0,
            duration: 500,
            onComplete: () => p.destroy()
        });
    }

    private drawBackground(): void {
        for (let y = 0; y < GARDEN_ROWS; y++) {
            for (let x = 0; x < GARDEN_COLS; x++) {
                const color = (x + y) % 2 === 0 ? COLORS.GRASS_LIGHT : COLORS.GRASS_DARK;
                this.add.rectangle(
                    x * TILE_SIZE + TILE_SIZE / 2,
                    y * TILE_SIZE + TILE_SIZE / 2,
                    TILE_SIZE, TILE_SIZE, color
                ).setDepth(0);
            }
        }
    }

    private drawFences(): void {
        // Simple border
        this.add.rectangle(GARDEN_WIDTH / 2, TILE_SIZE / 2, GARDEN_WIDTH, TILE_SIZE, COLORS.FENCE_DARK).setDepth(1); // Top
        this.add.rectangle(TILE_SIZE / 2, GARDEN_HEIGHT / 2, TILE_SIZE, GARDEN_HEIGHT, COLORS.FENCE_DARK).setDepth(1); // Left
        this.add.rectangle(GARDEN_WIDTH - TILE_SIZE / 2, GARDEN_HEIGHT / 2, TILE_SIZE, GARDEN_HEIGHT, COLORS.FENCE_DARK).setDepth(1); // Right
        // Bottom split with gap
        this.add.rectangle(GARDEN_WIDTH / 4, GARDEN_HEIGHT - TILE_SIZE / 2, GARDEN_WIDTH / 2 - TILE_SIZE * 2, TILE_SIZE, COLORS.FENCE_DARK).setDepth(1);
        this.add.rectangle(GARDEN_WIDTH * 0.75, GARDEN_HEIGHT - TILE_SIZE / 2, GARDEN_WIDTH / 2 - TILE_SIZE * 2, TILE_SIZE, COLORS.FENCE_DARK).setDepth(1);
    }

    private drawPath(): void {
        // Path from exit to center
        this.add.rectangle(GARDEN_WIDTH / 2, GARDEN_HEIGHT - TILE_SIZE * 2, TILE_SIZE * 2, TILE_SIZE * 4, COLORS.PATH).setDepth(0.5);
    }

    private setupInput(): void {
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.wasdKeys = {
            W: this.input.keyboard!.addKey('W'),
            A: this.input.keyboard!.addKey('A'),
            S: this.input.keyboard!.addKey('S'),
            D: this.input.keyboard!.addKey('D')
        };
        this.input.keyboard!.on('keydown-ESC', () => this.handleExit());
    }

    private setupTouchControls(): void {
        new TouchControls({
            onDirectionChange: (d) => this.touchDirection = d,
            onActionPress: () => this.handleAction()
        });
    }

    private setupCamera(): void {
        this.cameras.main.setBounds(0, 0, GARDEN_WIDTH, GARDEN_HEIGHT);
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        this.cameras.main.setZoom(2);
    }

    private setupPhysics(): void {
        this.physics.world.setBounds(0, 0, GARDEN_WIDTH, GARDEN_HEIGHT);
    }

    private movePlayer(direction: Direction): void {
        const vec = DIRECTION_VECTORS[direction];
        const targetX = this.player.tileX + vec.x;
        const targetY = this.player.tileY + vec.y;

        // Simple collision check against boundaries
        if (targetX < 1 || targetX >= GARDEN_COLS - 1 || targetY < 1 || targetY >= GARDEN_ROWS - 1) {
            this.player.face(direction);
            return;
        }

        // Allow walking over plots.
        this.player.move(direction, () => { });
    }

    private checkExitZone(): void {
        if (this.canTriggerExit && this.player.sprite.y > GARDEN_HEIGHT - TILE_SIZE * 1.5) {
            this.handleExit();
        }

        if (this.player.sprite.y < GARDEN_HEIGHT - TILE_SIZE * 2) {
            this.canTriggerExit = true;
        }
    }

    private handleExit(): void {
        this.scene.start('WorldScene', { map: 'house', targetSpawn: 'garden_exit' });
    }
}
