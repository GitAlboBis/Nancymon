import Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { QUESTS } from '../data/Quests';

export class JournalScene extends Phaser.Scene {
    private bookContainer!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'JournalScene' });
    }

    create(): void {
        console.log('📖 Journal Scene Opened');

        // Create a semi-transparent background overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.5);
        overlay.fillRect(0, 0, this.scale.width, this.scale.height);

        // Close on clicking outside
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scale.width, this.scale.height), Phaser.Geom.Rectangle.Contains);
        overlay.on('pointerdown', () => this.handleClose());

        // Create Book Interface
        this.createBook();

        // Add Input to close
        this.input.keyboard?.on('keydown-ESC', () => this.handleClose());
        this.input.keyboard?.on('keydown-J', () => this.handleClose());
    }

    private createBook(): void {
        const width = 600;
        const height = 400;
        const x = (this.scale.width - width) / 2;
        const y = (this.scale.height - height) / 2;

        this.bookContainer = this.add.container(x, y);

        // Book Background (Open Pages)
        const book = this.add.graphics();
        // Cover border
        book.fillStyle(0x8B4513, 1); // Brown leather
        book.fillRoundedRect(-10, -10, width + 20, height + 20, 10);
        // Pages
        book.fillStyle(0xFDF5E6, 1); // Old Lace / Cream color
        book.fillRoundedRect(0, 0, width, height, 5);
        // Center spine
        book.fillStyle(0xE0D0C0, 1); // Slightly darker page shadow
        book.fillRect(width / 2 - 2, 0, 4, height);

        this.bookContainer.add(book);

        // --- LEFT PAGE: QUESTS ---
        this.createQuestPage(width);

        // --- RIGHT PAGE: SAVE ---
        this.createSavePage(width, height);
    }

    private createQuestPage(bookWidth: number): void {
        const pageX = 40;
        const pageY = 40;
        const pageWidth = (bookWidth / 2) - 60;

        // Header
        const title = this.add.text(pageX, pageY, 'Current Goal', {
            fontSize: '24px',
            fontFamily: 'serif',
            color: '#333333',
            fontStyle: 'bold'
        });
        this.bookContainer.add(title);

        const divider = this.add.graphics();
        divider.lineStyle(2, 0x333333, 0.5);
        divider.lineBetween(pageX, pageY + 35, pageX + pageWidth, pageY + 35);
        this.bookContainer.add(divider);

        // Active Quest Content
        const activeQuestId = GameState.activeQuestId;

        if (activeQuestId && QUESTS[activeQuestId]) {
            const quest = QUESTS[activeQuestId];

            // Quest Title
            const qTitle = this.add.text(pageX, pageY + 50, quest.title, {
                fontSize: '20px',
                fontFamily: 'serif',
                color: '#8B4513',
                wordWrap: { width: pageWidth }
            });
            this.bookContainer.add(qTitle);

            // Description
            const qDesc = this.add.text(pageX, pageY + 90, quest.description, {
                fontSize: '16px',
                fontFamily: 'sans-serif',
                color: '#555555',
                wordWrap: { width: pageWidth }
            });
            this.bookContainer.add(qDesc);

            // Objectives
            let currentY = pageY + 160;
            const todoHeader = this.add.text(pageX, currentY, 'To Do:', {
                fontSize: '14px',
                fontFamily: 'sans-serif',
                color: '#333333',
                fontStyle: 'bold'
            });
            this.bookContainer.add(todoHeader);
            currentY += 25;

            quest.objectives.forEach(obj => {
                const check = this.add.text(pageX, currentY, '☐ ' + obj, {
                    fontSize: '16px',
                    fontFamily: 'sans-serif',
                    color: '#333333',
                    wordWrap: { width: pageWidth }
                });
                this.bookContainer.add(check);
                currentY += 30;
            });

        } else {
            const noQuest = this.add.text(pageX, pageY + 60, 'Just relaxing...', {
                fontSize: '18px',
                fontFamily: 'serif',
                color: '#555555',
                fontStyle: 'italic'
            });
            this.bookContainer.add(noQuest);
        }
    }

    private createSavePage(bookWidth: number, bookHeight: number): void {
        const pageX = (bookWidth / 2) + 40;
        const pageY = 40;
        const pageWidth = (bookWidth / 2) - 80;

        // Header
        const title = this.add.text(pageX, pageY, 'My Diary', {
            fontSize: '24px',
            fontFamily: 'serif',
            color: '#333333',
            fontStyle: 'bold'
        });
        this.bookContainer.add(title);

        const divider = this.add.graphics();
        divider.lineStyle(2, 0x333333, 0.5);
        divider.lineBetween(pageX, pageY + 35, pageX + pageWidth, pageY + 35);
        this.bookContainer.add(divider);

        // Date
        const date = new Date().toDateString();
        const dateText = this.add.text(pageX, pageY + 50, date, {
            fontSize: '14px',
            fontFamily: 'serif',
            color: '#888888',
            fontStyle: 'italic'
        });
        this.bookContainer.add(dateText);

        // Helper Text
        const helpText = this.add.text(pageX, pageY + 90, "Dear Diary,\n\nI should write down everything that happened today so I don't forget...", {
            fontSize: '16px',
            fontFamily: 'cursive',
            color: '#333333',
            wordWrap: { width: pageWidth },
            lineSpacing: 8
        });
        this.bookContainer.add(helpText);

        // Save Button
        const btnY = bookHeight - 80;
        const btnWidth = 140;
        const btnHeight = 40;
        const btnX = pageX + (pageWidth - btnWidth) / 2;

        const btnContainer = this.add.container(btnX, btnY);
        const btnBg = this.add.graphics();

        // Normal State
        btnBg.fillStyle(0x8B4513, 1);
        btnBg.fillRoundedRect(0, 0, btnWidth, btnHeight, 8);

        const btnText = this.add.text(btnWidth / 2, btnHeight / 2, 'Write Entry (Save)', {
            fontSize: '14px',
            fontFamily: 'sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);

        btnContainer.add([btnBg, btnText]);
        btnContainer.setSize(btnWidth, btnHeight);
        btnContainer.setInteractive({ useHandCursor: true });

        // Interaction
        btnContainer.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0xA0522D, 1); // Lighter brown
            btnBg.fillRoundedRect(0, 0, btnWidth, btnHeight, 8);
            this.tweens.add({ targets: btnContainer, scale: 1.05, duration: 100 });
        });

        btnContainer.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x8B4513, 1);
            btnBg.fillRoundedRect(0, 0, btnWidth, btnHeight, 8);
            this.tweens.add({ targets: btnContainer, scale: 1, duration: 100 });
        });

        btnContainer.on('pointerdown', () => {
            // SAVE GAME
            GameState.saveGame();

            btnText.setText('Saved!');
            this.tweens.add({
                targets: btnContainer,
                y: btnY + 2,
                duration: 50,
                yoyo: true
            });

            // Reset text after a delay
            this.time.delayedCall(2000, () => {
                btnText.setText('Write Entry (Save)');
            });
        });

        this.bookContainer.add(btnContainer);
    }
    private handleClose(): void {
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
