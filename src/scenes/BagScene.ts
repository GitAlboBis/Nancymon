import Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { getItemById } from '../data/Items';

export class BagScene extends Phaser.Scene {
    private container!: Phaser.GameObjects.Container;
    private itemListContainer!: Phaser.GameObjects.Container;
    private detailsContainer!: Phaser.GameObjects.Container;
    private selectedItemId: string | null = null;

    // UI Constants
    private readonly WIDTH = 700;
    private readonly HEIGHT = 500;
    private readonly LIST_WIDTH = 300;

    constructor() {
        super({ key: 'BagScene' });
    }

    create(): void {
        console.log('🎒 Bag Scene Opened');

        // Dark overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, this.scale.width, this.scale.height);

        // Close on click outside
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scale.width, this.scale.height), Phaser.Geom.Rectangle.Contains);
        overlay.on('pointerdown', () => this.close());

        this.createMainUI();
        this.refreshItemList();

        // Input
        this.input.keyboard?.on('keydown-ESC', () => this.close());
        this.input.keyboard?.on('keydown-I', () => this.close());
    }

    private close(): void {
        this.scene.stop();
        // Resume active exploration scene
        ['WorldScene', 'CityScene', 'CafeScene'].forEach(key => {
            const sceneKey = this.scene.get(key);
            if (sceneKey && (sceneKey.sys.isPaused() || sceneKey.sys.isSleeping())) {
                this.scene.resume(key);
            }
        });
        this.scene.resume('HudOverlay');
    }

    private createMainUI(): void {
        const x = (this.scale.width - this.WIDTH) / 2;
        const y = (this.scale.height - this.HEIGHT) / 2;

        this.container = this.add.container(x, y);

        // Background Board
        const bg = this.add.graphics();
        bg.fillStyle(0x2c3e50, 1); // Dark Blue/Grey
        bg.fillRoundedRect(0, 0, this.WIDTH, this.HEIGHT, 16);
        bg.lineStyle(4, 0xecf0f1, 1);
        bg.strokeRoundedRect(0, 0, this.WIDTH, this.HEIGHT, 16);
        this.container.add(bg);

        // Header
        const header = this.add.text(40, 30, '🎒 Backpack', {
            fontSize: '32px',
            fontFamily: '"Segoe UI", sans-serif',
            color: '#ecf0f1',
            fontStyle: 'bold'
        });
        this.container.add(header);

        // Separator
        const line = this.add.graphics();
        line.lineStyle(2, 0xbdc3c7, 0.3);
        line.lineBetween(this.LIST_WIDTH + 40, 80, this.LIST_WIDTH + 40, this.HEIGHT - 40);
        this.container.add(line);

        // Containers for dynamic content
        this.itemListContainer = this.add.container(40, 100);
        this.detailsContainer = this.add.container(this.LIST_WIDTH + 60, 100);

        this.container.add(this.itemListContainer);
        this.container.add(this.detailsContainer);

        // Initial empty state for details
        this.showEmptyDetails();
    }

    private refreshItemList(): void {
        this.itemListContainer.removeAll(true);

        const items = GameState.getInventoryItems();
        let yPos = 0;

        if (items.length === 0) {
            const emptyText = this.add.text(0, 0, 'Your bag is empty.', {
                fontSize: '18px',
                color: '#bdc3c7',
                fontStyle: 'italic'
            });
            this.itemListContainer.add(emptyText);
            return;
        }

        items.forEach((invItem) => {
            const itemDef = getItemById(invItem.id);
            if (!itemDef) return;

            const itemBg = this.add.graphics();
            const isSelected = this.selectedItemId === invItem.id;

            // Item Background
            const bgHeight = 60;
            const bgWidth = this.LIST_WIDTH - 20;

            itemBg.fillStyle(isSelected ? 0x34495e : 0x34495e, isSelected ? 1 : 0.5);
            if (isSelected) itemBg.lineStyle(2, 0x3498db, 1);
            itemBg.fillRoundedRect(0, 0, bgWidth, bgHeight, 8);
            if (isSelected) itemBg.strokeRoundedRect(0, 0, bgWidth, bgHeight, 8);

            // Text
            const emoji = this.add.text(15, 15, itemDef.emoji, { fontSize: '24px' });
            const name = this.add.text(55, 10, itemDef.name, {
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold'
            });
            const count = this.add.text(bgWidth - 15, 30, `x${invItem.count}`, {
                fontSize: '16px',
                color: '#bdc3c7'
            }).setOrigin(1, 0.5);

            // Container for this row
            const rowContainer = this.add.container(0, yPos, [itemBg, emoji, name, count]);

            // Interaction
            rowContainer.setSize(bgWidth, bgHeight);
            rowContainer.setInteractive({ useHandCursor: true });

            rowContainer.on('pointerdown', () => {
                this.selectedItemId = invItem.id;
                this.refreshItemList(); // Re-render to update selection style
                this.showItemDetails(itemDef, invItem.count);
            });

            this.itemListContainer.add(rowContainer);
            yPos += bgHeight + 10;
        });
    }

    private showEmptyDetails(): void {
        this.detailsContainer.removeAll(true);
        const text = this.add.text(0, 100, 'Select an item to view details.', {
            fontSize: '16px',
            color: '#7f8c8d'
        });
        this.detailsContainer.add(text);
    }

    private showItemDetails(item: any, count: number): void {
        this.detailsContainer.removeAll(true);

        const maxWidth = this.WIDTH - this.LIST_WIDTH - 100;

        // Large Emoji
        const emoji = this.add.text(maxWidth / 2, 40, item.emoji, { fontSize: '64px' }).setOrigin(0.5);

        // Owned Count
        const countText = this.add.text(maxWidth / 2, 70, `Owned: ${count}`, {
            fontSize: '14px',
            color: '#bdc3c7'
        }).setOrigin(0.5);

        // Name
        const name = this.add.text(maxWidth / 2, 100, item.name, {
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Type Badge
        const typeColor = item.type === 'heal' ? 0x2ecc71 : 0xe67e22; // Green for heal, Orange for comfort
        const typeBg = this.add.graphics();
        typeBg.fillStyle(typeColor, 0.8);
        typeBg.fillRoundedRect(maxWidth / 2 - 40, 130, 80, 24, 12);

        const typeText = this.add.text(maxWidth / 2, 142, item.type.toUpperCase(), {
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Description
        const desc = this.add.text(0, 180, item.description, {
            fontSize: '18px',
            color: '#bdc3c7',
            wordWrap: { width: maxWidth },
            align: 'center'
        });

        // Use Button
        if (item.type !== 'special') {
            const btnY = 300;
            const btnWidth = 160;
            const btnHeight = 44;

            const btnContainer = this.add.container(maxWidth / 2 - btnWidth / 2, btnY);
            const btnBg = this.add.graphics();

            // Button Style
            btnBg.fillStyle(0x3498db, 1);
            btnBg.fillRoundedRect(0, 0, btnWidth, btnHeight, 8);

            const btnLabel = this.add.text(btnWidth / 2, btnHeight / 2, 'USE ITEM', {
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#ffffff'
            }).setOrigin(0.5);

            btnContainer.add([btnBg, btnLabel]);
            btnContainer.setSize(btnWidth, btnHeight);
            btnContainer.setInteractive({ useHandCursor: true });

            btnContainer.on('pointerover', () => {
                btnBg.clear();
                btnBg.fillStyle(0x5dade2, 1);
                btnBg.fillRoundedRect(0, 0, btnWidth, btnHeight, 8);
            });

            btnContainer.on('pointerout', () => {
                btnBg.clear();
                btnBg.fillStyle(0x3498db, 1);
                btnBg.fillRoundedRect(0, 0, btnWidth, btnHeight, 8);
            });

            btnContainer.on('pointerdown', () => {
                this.useItem(item);
            });

            this.detailsContainer.add(btnContainer);
        }

        this.detailsContainer.add([emoji, countText, name, typeBg, typeText, desc]);
    }

    private useItem(item: any): void {
        const success = GameState.useItem(item.id);
        if (success) {
            // Effect Logic
            if (item.type === 'heal' || item.type === 'comfort') {
                const oldVibe = GameState.playerVibe;
                GameState.playerVibe = Math.min(GameState.maxPlayerVibe, GameState.playerVibe + item.value);
                console.log(`💖 Vibe restored: ${oldVibe} -> ${GameState.playerVibe}`);
            }

            // Visual Feedback
            this.cameras.main.flash(200, 46, 204, 113); // Flash Green

            // Refresh
            if (GameState.getItemCount(item.id) <= 0) {
                this.selectedItemId = null;
                this.showEmptyDetails();
            } else {
                this.showItemDetails(item, GameState.getItemCount(item.id));
            }
            this.refreshItemList();
        }
    }
}
