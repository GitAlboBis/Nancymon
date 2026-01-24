import Phaser from 'phaser';

export type ReactionType = 'love' | 'kiss' | 'alert' | 'question' | 'sweat' | 'happy' | 'sad';

export class ReactionBubble extends Phaser.GameObjects.Container {
    private bubble: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
    private background?: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number, type: ReactionType) {
        super(scene, x, y);

        // Create a small white bubble background for better visibility
        this.background = scene.add.graphics();
        this.background.fillStyle(0xffffff, 0.9);
        this.background.fillCircle(0, 0, 16);
        this.background.lineStyle(2, 0x000000, 0.5);
        this.background.strokeCircle(0, 0, 16);
        this.add(this.background);

        this.bubble = this.createContent(scene, type);
        this.add(this.bubble);

        this.setScale(0);
        this.setDepth(2000); // Ensure it's above most things

        scene.add.existing(this);

        this.playAnimation();
    }

    private createContent(scene: Phaser.Scene, type: ReactionType): Phaser.GameObjects.Sprite | Phaser.GameObjects.Text {
        switch (type) {
            case 'love':
                // Use the existing heart asset if loaded, otherwise fallback to text
                if (scene.textures.exists('heart')) {
                    const sprite = scene.add.sprite(0, 0, 'heart');
                    sprite.setDisplaySize(20, 20); // Adjust size to fit in bubble
                    return sprite;
                }
                return this.createText(scene, '❤️', '#ff0000');

            case 'kiss':
                if (scene.textures.exists('kiss')) {
                    const sprite = scene.add.sprite(0, 0, 'kiss');
                    sprite.setDisplaySize(20, 20);
                    return sprite;
                }
                return this.createText(scene, '💋', '#ff69b4');

            case 'alert':
                return this.createText(scene, '!', '#ff0000', 'bold 24px Arial');

            case 'question':
                return this.createText(scene, '?', '#0000ff', 'bold 24px Arial');

            case 'sweat':
                return this.createText(scene, '💦', '#0099ff');

            case 'happy':
                return this.createText(scene, '😄', '#ffcc00');

            case 'sad':
                return this.createText(scene, '😢', '#0099ff');

            default:
                return this.createText(scene, '...', '#000000');
        }
    }

    private createText(scene: Phaser.Scene, text: string, color: string, font: string = '20px Arial'): Phaser.GameObjects.Text {
        return scene.add.text(0, 0, text, {
            font: font,
            color: color
        }).setOrigin(0.5);
    }

    private playAnimation() {
        if (!this.scene) return;

        // Pop in
        this.scene.tweens.add({
            targets: this,
            scaleX: 1,
            scaleY: 1,
            y: this.y - 40, // Float up
            duration: 400,
            ease: 'Back.out',
            onComplete: () => {
                // Hold briefly then fade out
                if (this.scene) {
                    this.scene.tweens.add({
                        targets: this,
                        alpha: 0,
                        y: this.y - 20, // Float up a bit more
                        duration: 300,
                        delay: 600,
                        onComplete: () => {
                            this.destroy(); // Clean up
                        }
                    });
                }
            }
        });
    }
}
