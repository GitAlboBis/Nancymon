import Phaser from 'phaser';

export type RhythmResult = 'PERFECT' | 'GOOD' | 'MISS';

export class BattleRhythmUI extends Phaser.GameObjects.Container {
    private bgBar!: Phaser.GameObjects.Graphics;
    private cursor!: Phaser.GameObjects.Graphics;
    private sweetSpot!: Phaser.GameObjects.Graphics;
    private instructionText!: Phaser.GameObjects.Text;

    private isRunning = false;
    private callback?: (result: RhythmResult) => void;

    private readonly BAR_WIDTH = 300;
    private readonly BAR_HEIGHT = 20;
    private timeElapsed = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        this.createUI();
        this.setVisible(false);
        scene.add.existing(this);
    }

    private createUI(): void {
        // Background Bar
        this.bgBar = this.scene.add.graphics();
        this.bgBar.fillStyle(0x000000, 0.7);
        this.bgBar.fillRoundedRect(-this.BAR_WIDTH / 2, -this.BAR_HEIGHT / 2, this.BAR_WIDTH, this.BAR_HEIGHT, 10);
        this.bgBar.lineStyle(2, 0xffffff, 1);
        this.bgBar.strokeRoundedRect(-this.BAR_WIDTH / 2, -this.BAR_HEIGHT / 2, this.BAR_WIDTH, this.BAR_HEIGHT, 10);

        // Sweet Spot (Center)
        this.sweetSpot = this.scene.add.graphics();
        this.sweetSpot.fillStyle(0xff6b9d, 0.8); // Pink
        const sweetSpotWidth = 40;
        this.sweetSpot.fillRect(-sweetSpotWidth / 2, -this.BAR_HEIGHT / 2 + 2, sweetSpotWidth, this.BAR_HEIGHT - 4);

        // Cursor
        this.cursor = this.scene.add.graphics();
        this.cursor.fillStyle(0xffffff, 1);
        this.cursor.fillTriangle(0, -15, -8, -25, 8, -25); // Top pointer
        this.cursor.fillTriangle(0, 15, -8, 25, 8, 25); // Bottom pointer

        // Instructions
        this.instructionText = this.scene.add.text(0, -40, 'PRESS SPACE!', {
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add([this.bgBar, this.sweetSpot, this.cursor, this.instructionText]);
    }

    start(callback: (result: RhythmResult) => void): void {
        this.callback = callback;
        this.isRunning = true;
        this.setVisible(true);
        this.timeElapsed = 0;

        // Randomize start direction/phase slightly ? No, consistent is better for learning
        // this.cursorPosition = 0; // Removed as unused property

        // Input listener is handled by the Scene calling this, 
        // OR we can add a one-time listener here.
        // It's cleaner if we handle the input check *here* and the scene just delegates or we attach strictly to the keyboard here.

        const spaceKey = this.scene.input.keyboard!.addKey('SPACE');
        const enterKey = this.scene.input.keyboard!.addKey('ENTER');

        const checkInput = () => {
            if (!this.isRunning) return;
            this.stopAndEvaluate();
        };

        spaceKey.once('down', checkInput);
        enterKey.once('down', checkInput);

        // Safety cleanup of keys is hard with 'once' if we stop externally, 
        // but for now we assume the user WILL press or we time out.
        // Actually, let's auto-fail if they wait too long (e.g. 3 seconds).
        this.scene.time.delayedCall(3000, () => {
            if (this.isRunning) {
                this.stopAndEvaluate(true); // Auto-fail
            }
        });
    }

    update(_time: number, delta: number): void {
        if (!this.isRunning) return;

        this.timeElapsed += delta / 1000;

        // Ping-pong movement: -1 to 1
        // Math.sin(time) goes -1 to 1.
        const speed = 3; // Speed factor
        const rawPos = Math.sin(this.timeElapsed * speed);

        // Map to x coordinates
        // Width range: -BAR_WIDTH/2 to BAR_WIDTH/2
        const xPos = rawPos * (this.BAR_WIDTH / 2 - 10);

        this.cursor.x = xPos;
    }

    private stopAndEvaluate(autoFail = false): void {
        this.isRunning = false;

        // Calculate result
        // Sweet spot is width 40, so +/- 20 from center (0)
        // Cursor X is current position.

        let result: RhythmResult = 'MISS';

        if (!autoFail) {
            const absX = Math.abs(this.cursor.x);
            if (absX < 20) {
                result = 'PERFECT';
            } else if (absX < 60) {
                result = 'GOOD';
            } else {
                result = 'MISS';
            }
        }

        // Show result visual
        this.showResultAnim(result);

        // Slight delay before hiding and calling back, so player sees where they stopped
        this.scene.time.delayedCall(500, () => {
            this.setVisible(false);
            if (this.callback) {
                this.callback(result);
            }
        });
    }

    private showResultAnim(result: RhythmResult): void {
        const color = result === 'PERFECT' ? '#ffff00' : result === 'GOOD' ? '#00ff00' : '#ff0000';
        const text = this.scene.add.text(this.x, this.y - 20, result, {
            fontSize: '24px',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: text,
            y: text.y - 30,
            alpha: 0,
            duration: 800,
            onComplete: () => text.destroy()
        });
    }
}
