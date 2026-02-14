
import Phaser from 'phaser';
import { GameState } from '../state/GameState';

export class SystemMenuScene extends Phaser.Scene {
    private selectedOption: number = 0;
    private options: Phaser.GameObjects.Text[] = [];
    private container!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'SystemMenuScene' });
    }

    create(): void {
        console.log('⚙️ System Menu Opened');

        // Check window focus
        if (!document.hasFocus()) {
            console.warn('⚠️ Game window does not have focus - click to interact');
            window.focus();
        }

        // Use actual camera dimensions for reliable centering
        const { width, height } = this.cameras.main;

        // Force enable input
        if (this.input.keyboard) {
            this.input.keyboard.enabled = true;
        }

        // semi-transparent background
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

        // Container for menu items
        this.container = this.add.container(width / 2, height / 2);

        // Title
        const title = this.add.text(0, -100, 'PAUSED', {
            fontFamily: 'monospace',
            fontSize: '40px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.container.add(title);

        // Options
        const texts = ['Resume', 'Save Game', 'Quit to Title'];
        let y = 0;

        texts.forEach((text) => {
            const btn = this.add.text(0, y, text, {
                fontFamily: 'monospace',
                fontSize: '24px',
                color: '#FFFFFF'
            }).setOrigin(0.5).setInteractive();

            this.container.add(btn);
            this.options.push(btn);
            y += 50;
        });

        // Current status msg
        this.add.text(width / 2, height - 50, 'Press ENTER/SPACE to select', {
            fontFamily: 'monospace', fontSize: '16px', color: '#888888'
        }).setOrigin(0.5);

        // Input
        this.input.keyboard!.on('keydown-UP', () => this.changeSelection(-1));
        this.input.keyboard!.on('keydown-DOWN', () => this.changeSelection(1));
        this.input.keyboard!.on('keydown-ENTER', () => this.selectOption());
        this.input.keyboard!.on('keydown-SPACE', () => this.selectOption());
        this.input.keyboard!.on('keydown-ESC', () => this.resumeGame());

        this.updateSelection();
    }

    private changeSelection(delta: number): void {
        this.selectedOption += delta;
        if (this.selectedOption < 0) this.selectedOption = this.options.length - 1;
        if (this.selectedOption >= this.options.length) this.selectedOption = 0;
        this.updateSelection();
    }

    private updateSelection(): void {
        this.options.forEach((opt, index) => {
            if (index === this.selectedOption) {
                opt.setStyle({ color: '#FFD700', fontSize: '28px' });
                opt.setText(`> ${opt.text.replace('> ', '').replace(' <', '')} <`);
            } else {
                opt.setStyle({ color: '#FFFFFF', fontSize: '24px' });
                opt.setText(opt.text.replace('> ', '').replace(' <', ''));
            }
        });
    }

    private selectOption(): void {
        const selectedText = this.options[this.selectedOption].text.replace('> ', '').replace(' <', '');

        switch (selectedText) {
            case 'Resume':
                this.resumeGame();
                break;
            case 'Save Game':
                this.saveGame();
                break;
            case 'Quit to Title':
                this.quitToTitle();
                break;
        }
    }

    private resumeGame(): void {
        this.scene.stop();
        this.scene.resume('WorldScene');
        this.scene.resume('HudOverlay');
    }

    private saveGame(): void {
        GameState.saveGame();

        const { width, height } = this.cameras.main;

        // Show feedback
        const msg = this.add.text(width / 2, height - 100, 'GAME SAVED!', {
            fontFamily: 'monospace', fontSize: '20px', color: '#00FF00', backgroundColor: '#000000'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: msg,
            alpha: 0,
            duration: 2000,
            onComplete: () => msg.destroy()
        });
    }

    private quitToTitle(): void {
        this.scene.stop('WorldScene');
        this.scene.stop('HudOverlay');
        this.scene.start('TitleScene');
    }
}
