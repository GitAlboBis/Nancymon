import Phaser from 'phaser';
import { GameState } from '../state/GameState';

export class TitleScene extends Phaser.Scene {
    private background!: Phaser.GameObjects.Image;
    private canContinue: boolean = false;
    private selectedOption: number = 0; // 0: New Game, 1: Continue (if avail), 2: Credits
    private options: Phaser.GameObjects.Text[] = [];

    constructor() {
        super({ key: 'TitleScene' });
    }

    create(): void {
        // Enforce focus and input
        if (this.input.keyboard) {
            this.input.keyboard.enabled = true;
        }

        const { width, height } = this.cameras.main;

        // 1. Background
        this.background = this.add.image(width / 2, height / 2, 'title-bg');
        // Scale background to cover screen while maintaining aspect ratio
        const scaleX = width / this.background.width;
        const scaleY = height / this.background.height;
        const scale = Math.max(scaleX, scaleY);
        this.background.setScale(scale);

        // Dark overlay for text readability
        this.add.rectangle(0, 0, width, height, 0x000000, 0.3).setOrigin(0, 0);

        // 2. Logo / Title
        this.add.text(width / 2, 120, 'NANCYMON', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '64px',
            color: '#FFD700', // Gold
            stroke: '#000000',
            strokeThickness: 8,
            shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 0, stroke: true, fill: true }
        }).setOrigin(0.5);

        // Add subtitle
        this.add.text(width / 2, 180, 'A Romantic RPG Adventure', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#FFFFFF',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, stroke: true, fill: true }
        }).setOrigin(0.5);

        // 3. Menu Options
        this.canContinue = GameState.hasSaveFile();

        let yPos = 350;
        const spacing = 50;

        // New Game
        const newGameBtn = this.createButton(width / 2, yPos, 'New Game');
        this.options.push(newGameBtn);
        yPos += spacing;

        // Continue
        if (this.canContinue) {
            const continueBtn = this.createButton(width / 2, yPos, 'Continue');
            this.options.push(continueBtn);
            // If continue is available, make it default? No, stick to consistent order, but maybe highlight it?
            // Actually, let's keep New Game as 0. 
            // Better: If continue exists, insert it at index 0.
            // Let's rebuilding options list logic.
        } else {
            // Create grayed out text for visual consistency or just hide it
            this.add.text(width / 2, yPos, 'Continue', {
                fontFamily: 'monospace', fontSize: '24px', color: '#666666'
            }).setOrigin(0.5);
        }
        yPos += spacing;

        // Credits
        const creditsBtn = this.createButton(width / 2, yPos, 'Credits');
        this.options.push(creditsBtn);

        // If continue was added, we need to re-sort or handle selection logic
        // Let's refine:
        this.options = [];

        // Option 0: New Game
        this.options.push(newGameBtn);

        // Option 1: Continue (Active or Null logic) - simplifying
        // Let's just have a list of interactable buttons.
        if (this.canContinue) {
            // If we have continue, let's make it the SECOND option visually, but keep track of it
            // Actually, let's just push it to options array
            const continueBtn = this.createButton(width / 2, 350 + spacing, 'Continue');
            this.options.splice(1, 0, continueBtn); // Insert at index 1

            // Move credits down
            creditsBtn.y = 350 + spacing * 2;
            this.options.push(creditsBtn);
        } else {
            this.options.push(creditsBtn);
        }

        // Initialize selection
        this.selectedOption = 0;
        this.updateSelection();

        // 4. Input Handling
        this.input.keyboard!.on('keydown-UP', () => {
            this.selectedOption--;
            if (this.selectedOption < 0) this.selectedOption = this.options.length - 1;
            this.updateSelection();
        });

        this.input.keyboard!.on('keydown-DOWN', () => {
            this.selectedOption++;
            if (this.selectedOption >= this.options.length) this.selectedOption = 0;
            this.updateSelection();
        });

        this.input.keyboard!.on('keydown-ENTER', () => this.selectOption());
        this.input.keyboard!.on('keydown-SPACE', () => this.selectOption());

        // Music placeholder (if we had it)
        // console.log("🎵 Playing Title Music");
    }

    private createButton(x: number, y: number, text: string): Phaser.GameObjects.Text {
        return this.add.text(x, y, text, {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setInteractive();
    }

    private updateSelection(): void {
        this.options.forEach((opt, index) => {
            if (index === this.selectedOption) {
                opt.setStyle({ color: '#FFD700', fontSize: '32px' }); // Gold + larger
                opt.setText(`> ${opt.text.replace('> ', '')} <`);
            } else {
                opt.setStyle({ color: '#FFFFFF', fontSize: '28px' });
                opt.setText(opt.text.replace('> ', '').replace(' <', ''));
            }
        });
    }

    private selectOption(): void {
        const selectedText = this.options[this.selectedOption].text.replace('> ', '').replace(' <', '');

        if (selectedText === 'New Game') {
            this.startNewGame();
        } else if (selectedText === 'Continue') {
            this.continueGame();
        } else if (selectedText === 'Credits') {
            this.showCredits();
        }
    }

    private startNewGame(): void {
        console.log('✨ Starting New Game');
        GameState.reset();

        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('WorldScene');
        });
    }

    private continueGame(): void {
        console.log('📂 Continuing Game');
        if (GameState.loadGame()) {
            const savedMap = GameState.getCurrentMap();
            this.cameras.main.fadeOut(1000, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('WorldScene', {
                    mapKey: savedMap,
                    backgroundKey: savedMap + '_bg'
                });
            });
        } else {
            // Error loading?
            console.error('Failed to load save file');
            this.cameras.main.shake(200);
        }
    }

    private showCredits(): void {
        const { width, height } = this.cameras.main;

        const credits = [
            'Created by Alberto',
            'For Nancy',
            '',
            '',
        ];

        // Simple overlay
        const container = this.add.container(0, 0);
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0);
        container.add(bg);

        let y = height;
        const texts: Phaser.GameObjects.Text[] = [];

        credits.forEach((line, i) => {
            const t = this.add.text(width / 2, y + (i * 40), line, {
                fontFamily: 'monospace', fontSize: '24px', color: '#ffffff'
            }).setOrigin(0.5);
            container.add(t);
            texts.push(t);
        });

        this.tweens.add({
            targets: texts,
            y: '-=600',
            duration: 5000,
            onComplete: () => {
                this.time.delayedCall(1000, () => {
                    container.destroy();
                });
            }
        });
    }
}
