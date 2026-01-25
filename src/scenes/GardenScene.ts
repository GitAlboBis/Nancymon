import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GameState } from '../state/GameState';
import { GardenSystem } from '../systems/GardenSystem';
import { PLANTS } from '../data/GardenData';
import { ITEMS } from '../data/Items';
import { DialogueBox } from '../ui/DialogueBox';

export class GardenScene extends Phaser.Scene {
    private player!: Player;
    private dialogueBox!: DialogueBox;
    private gardenSystem!: GardenSystem;
    private plots: Phaser.GameObjects.Sprite[] = [];
    private selectionCursor!: Phaser.GameObjects.Rectangle;
    private selectedPlotIndex: number = -1;

    // UI
    private uiContainer!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'GardenScene' });
    }

    create(): void {
        console.log('🌻 Garden Scene loaded');
        this.gardenSystem = GardenSystem.getInstance();

        // Background (Simple grass for now)
        this.add.rectangle(0, 0, 800, 600, 0x44aa44).setOrigin(0);

        // Add a "Shed" or exit area
        const shed = this.add.rectangle(400, 50, 100, 80, 0x885522).setOrigin(0.5);
        this.add.text(400, 50, 'EXIT', { fontSize: '16px', color: '#fff' }).setOrigin(0.5);

        // Create plots
        this.createPlots();

        // Player
        this.player = new Player(this, 12, 10); // Start near bottom

        // Dialogue
        this.dialogueBox = new DialogueBox(this);

        // UI Container for context menu
        this.uiContainer = this.add.container(0, 0).setDepth(100);
        this.uiContainer.setVisible(false);

        // Input
        this.input.keyboard!.on('keydown-ESC', () => this.handleExit());
        this.input.keyboard!.on('keydown-SPACE', () => this.handleInteraction());

        // Check for exit
        this.physics.add.existing(shed);
        this.physics.add.overlap(this.player.sprite, shed, () => this.handleExit());

        // Initial instructions
        this.time.delayedCall(500, () => {
            this.dialogueBox.show('👩‍🌾', ['Welcome to the Community Garden!', 'Walk up to a plot and press SPACE to interact.']);
        });
    }

    update(time: number, delta: number): void {
        // this.player.update(time, delta); // Player doesn't need update, uses internal tweens/scene
        this.gardenSystem.update(time, delta);
        this.refreshPlots(); // Update visuals
    }

    private createPlots(): void {
        const startX = 200;
        const startY = 200;
        const gap = 100;

        // 2 rows of 3
        for (let i = 0; i < 6; i++) {
            const x = startX + (i % 3) * gap;
            const y = startY + Math.floor(i / 3) * gap;

            const plot = this.add.sprite(x, y, 'dirt_patch'); // Fallback texture needed?
            // Use a rectangle if sprite missing
            if (!this.textures.exists('dirt_patch')) {
                const rect = this.add.rectangle(x, y, 64, 64, 0x654321);
                rect.setData('index', i);
                this.physics.add.existing(rect, true);
                this.physics.add.overlap(this.player.sprite, rect, () => {
                    this.selectedPlotIndex = i;
                });
                // Reset selection if not overlapping? 
                // Need a better way. Interaction radius.
            }

            // Visual representation
            const plotBg = this.add.rectangle(x, y, 80, 80, 0x5c4033);
            plotBg.setStrokeStyle(2, 0x3e2b22);

            // Plant Sprite
            const plantSprite = this.add.sprite(x, y - 10, 'plant_sprout').setVisible(false);

            // Store ref
            this.plots.push(plantSprite);
        }
    }

    private refreshPlots(): void {
        const gardenData = GameState.getGardenPlots();
        const startX = 200;
        const startY = 200;
        const gap = 100;

        gardenData.forEach((data, i) => {
            const x = startX + (i % 3) * gap;
            const y = startY + Math.floor(i / 3) * gap;

            // Re-draw context? Efficiency warning. 
            // Better: update valid sprite.

            // We'll just draw simple shapes/text for now to ensure it works without assets
            // Debug text over plot
            // this.add.text(x, y, `${data.growthStage}\n${Math.floor(data.growthProgress*100)}%`, { fontSize: '10px' }).setOrigin(0.5);

            // Update actual sprite if we had one
            // if (data.growthStage === 'mature') setTexture(...)
        });
    }

    private handleInteraction(): void {
        if (this.dialogueBox.isActive()) {
            this.dialogueBox.advance();
            return;
        }

        // Find nearest plot
        const playerPos = new Phaser.Math.Vector2(this.player.sprite.x, this.player.sprite.y);
        let nearestIndex = -1;
        let minDist = 60; // Interaction range

        const startX = 200;
        const startY = 200;
        const gap = 100;

        for (let i = 0; i < 6; i++) {
            const x = startX + (i % 3) * gap;
            const y = startY + Math.floor(i / 3) * gap;
            const dist = playerPos.distance({ x, y });
            if (dist < minDist) {
                minDist = dist;
                nearestIndex = i;
            }
        }

        if (nearestIndex !== -1) {
            this.openPlotMenu(nearestIndex);
        }
    }

    private openPlotMenu(index: number): void {
        const plot = GameState.getPlot(index);
        if (!plot) return;

        if (plot.growthStage === 'empty') {
            // Offer to plant
            this.showPlantingMenu(index);
        } else if (plot.growthStage === 'mature') {
            // Harvest
            this.harvestPlot(index);
        } else {
            // Water check
            this.showWaterMenu(index);
        }
    }

    private showPlantingMenu(index: number): void {
        // Filter inventory for seeds
        const inventory = GameState.getInventoryItems();
        const seeds = inventory.filter(item => {
            const def = ITEMS[item.id];
            return def && def.type === 'seed';
        });

        if (seeds.length === 0) {
            this.dialogueBox.show('System', ['You don\'t have any seeds!']);
            return;
        }

        // Simple selection: Just prompt for the first seed found for MVP
        // In full version, use a proper menu
        const seedItem = seeds[0]; // Take first seed
        const seedDef = ITEMS[seedItem.id];

        // Hacky "Yes/No" via dialogue for now
        // "Plant [Name]? "
        // Auto-plant for now to keep it simple
        GameState.useItem(seedItem.id, 1);
        GameState.updatePlot(index, {
            plantId: seedDef.plantId,
            growthStage: 'seed',
            growthProgress: 0,
            waterLevel: 0.5,
            isWithered: false
        });

        this.dialogueBox.show('System', [`Planted ${seedDef.name}!`]);
    }

    private showWaterMenu(index: number): void {
        const plot = GameState.getPlot(index);
        if (plot?.waterLevel && plot.waterLevel < 1.0) {
            GameState.updatePlot(index, { waterLevel: 1.0 });
            this.dialogueBox.show('System', ['You watered the plant. 💧']);
        } else {
            this.dialogueBox.show('System', ['It looked well watered already.']);
        }
    }

    private harvestPlot(index: number): void {
        const plot = GameState.getPlot(index);
        if (!plot || !plot.plantId) return;

        const plantDef = PLANTS[plot.plantId];
        if (plantDef) {
            GameState.addItem(plantDef.produceId, plantDef.yield);
            this.dialogueBox.show('System', [`Harvested ${plantDef.yield}x ${plantDef.name}! 🌻`]);
        }

        // Reset plot
        GameState.updatePlot(index, {
            plantId: null,
            growthStage: 'empty',
            growthProgress: 0,
            waterLevel: 0,
            isWithered: false
        });
    }

    private handleExit(): void {
        this.scene.start('CityScene');
    }
}
