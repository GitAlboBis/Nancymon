import Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { getAllMemories, MemoryItem } from '../data/MemoriesData';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';

/**
 * MemoryAlbumScene (NancyDex)
 * Displays collected memories in a grid
 */
export class MemoryAlbumScene extends Phaser.Scene {
    private memories: MemoryItem[] = [];
    private selectionIndex: number = 0;
    private gridCols: number = 3;

    // UI Containers
    private gridContainer!: Phaser.GameObjects.Container;
    private detailsContainer!: Phaser.GameObjects.Container;

    // UI Constants
    private readonly ITEM_WIDTH = 100;
    private readonly ITEM_HEIGHT = 100;
    private readonly SPACING = 20;

    constructor() {
        super({ key: 'MemoryAlbumScene' });
    }

    create(): void {
        // load memories
        this.memories = getAllMemories();

        // Dark overlay background
        const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e, 0.95);
        bg.setOrigin(0);

        // Title
        this.add.text(GAME_WIDTH / 2, 40, '✨ NancyDex ✨', {
            fontSize: '32px',
            color: '#ff6b9d',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH / 2, 75, 'Collection of Beautiful Memories', {
            fontSize: '16px',
            color: '#aaaaff'
        }).setOrigin(0.5);

        // Grid Container
        this.gridContainer = this.add.container(0, 0);
        this.createGrid();

        // Footer instructions
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '[ ARROWS ] Move • [ ESC / M ] Close', {
            fontSize: '14px',
            color: '#888888'
        }).setOrigin(0.5);

        // Input handling
        this.setupInput();

        // Initial highlight
        this.updateSelection();
    }

    private createGrid(): void {
        const startX = (GAME_WIDTH - (this.gridCols * (this.ITEM_WIDTH + this.SPACING))) / 2 + this.ITEM_WIDTH / 2;
        const startY = 150;

        this.memories.forEach((memory, index) => {
            const col = index % this.gridCols;
            const row = Math.floor(index / this.gridCols);

            const x = startX + col * (this.ITEM_WIDTH + this.SPACING);
            const y = startY + row * (this.ITEM_HEIGHT + this.SPACING);

            const isUnlocked = GameState.hasCollected(memory.id);
            this.createMemoryItem(x, y, memory, index, isUnlocked);
        });
    }

    private createMemoryItem(x: number, y: number, memory: MemoryItem, index: number, isUnlocked: boolean): void {
        const container = this.add.container(x, y);
        container.setName(`memory_${index}`);

        // Card Background
        const bg = this.add.graphics();
        const color = isUnlocked ? 0x2a2a4a : 0x111122;
        const stroke = isUnlocked ? 0xff6b9d : 0x444455;

        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-this.ITEM_WIDTH / 2, -this.ITEM_HEIGHT / 2, this.ITEM_WIDTH, this.ITEM_HEIGHT, 12);
        bg.lineStyle(2, stroke, 1);
        bg.strokeRoundedRect(-this.ITEM_WIDTH / 2, -this.ITEM_HEIGHT / 2, this.ITEM_WIDTH, this.ITEM_HEIGHT, 12);

        container.add(bg);

        if (isUnlocked) {
            // Memory Icon/Emoji
            const emoji = this.add.text(0, -10, memory.emoji || '💕', {
                fontSize: '48px'
            }).setOrigin(0.5);

            // Name
            const name = this.add.text(0, 30, memory.name, {
                fontSize: '12px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: this.ITEM_WIDTH - 10 }
            }).setOrigin(0.5);

            container.add([emoji, name]);
        } else {
            // Locked State
            const lock = this.add.text(0, -10, '🔒', {
                fontSize: '32px',
                color: '#555555'
            }).setOrigin(0.5);

            const question = this.add.text(0, 30, '???', {
                fontSize: '14px',
                color: '#555555'
            }).setOrigin(0.5);

            container.add([lock, question]);
        }

        // Selection Border (hidden by default)
        const border = this.add.graphics();
        border.lineStyle(3, 0xffff00, 1);
        border.strokeRoundedRect(-this.ITEM_WIDTH / 2 - 2, -this.ITEM_HEIGHT / 2 - 2, this.ITEM_WIDTH + 4, this.ITEM_HEIGHT + 4, 14);
        border.setName('frame');
        border.setVisible(false);
        container.add(border);

        // Detail Description (Hidden for now, could become a popup)
        // For now, let's just show details when selected in a reserved area at the bottom

        this.gridContainer.add(container);
    }

    private setupInput(): void {
        this.input.keyboard!.on('keydown-ESC', () => this.close());
        this.input.keyboard!.on('keydown-M', () => this.close());

        this.input.keyboard!.on('keydown-RIGHT', () => this.moveSelection(1));
        this.input.keyboard!.on('keydown-LEFT', () => this.moveSelection(-1));
        this.input.keyboard!.on('keydown-DOWN', () => this.moveSelection(this.gridCols));
        this.input.keyboard!.on('keydown-UP', () => this.moveSelection(-this.gridCols));
    }

    private moveSelection(delta: number): void {
        const newIndex = this.selectionIndex + delta;
        if (newIndex >= 0 && newIndex < this.memories.length) {
            this.selectionIndex = newIndex;
            this.updateSelection();
        }
    }

    private updateSelection(): void {
        // Update frames
        this.memories.forEach((_, index) => {
            const container = this.gridContainer.getByName(`memory_${index}`) as Phaser.GameObjects.Container;
            const frame = container.getByName('frame') as Phaser.GameObjects.Graphics;
            if (frame) {
                frame.setVisible(index === this.selectionIndex);
            }
        });

        // Show Details for selected item
        this.showDetails(this.selectionIndex);
    }

    private showDetails(index: number): void {
        if (this.detailsContainer) this.detailsContainer.destroy();
        this.detailsContainer = this.add.container(GAME_WIDTH / 2, 450);

        const memory = this.memories[index];
        const isUnlocked = GameState.hasCollected(memory.id);

        if (isUnlocked) {
            const bg = this.add.graphics();
            bg.fillStyle(0x000000, 0.5);
            bg.fillRoundedRect(-300, 0, 600, 80, 8);

            const desc = this.add.text(0, 40, memory.description, {
                fontSize: '14px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 500 }
            }).setOrigin(0.5);

            this.detailsContainer.add([bg, desc]);
        } else {
            const bg = this.add.graphics();
            bg.fillStyle(0x000000, 0.5);
            bg.fillRoundedRect(-300, 0, 600, 80, 8);

            const text = this.add.text(0, 40, 'This memory is still waiting to be made...', {
                fontSize: '14px',
                color: '#888888',
                fontStyle: 'italic'
            }).setOrigin(0.5);

            this.detailsContainer.add([bg, text]);
        }
    }

    private close(): void {
        this.scene.stop();
        ['WorldScene', 'CityScene', 'CafeScene'].forEach(key => {
            const sceneKey = this.scene.get(key);
            if (sceneKey && (sceneKey.sys.isPaused() || sceneKey.sys.isSleeping())) {
                this.scene.resume(key);
            }
        });
        this.scene.resume('HudOverlay');
    }
}
