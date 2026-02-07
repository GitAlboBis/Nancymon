import Phaser from 'phaser';

export type FloatingTextType = 'damage' | 'heal' | 'critical' | 'status' | 'info';

export class FloatingNumbers extends Phaser.GameObjects.Container {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        scene.add.existing(this);
    }

    /**
     * Spawns a floating text at the specified position
     */
    showText(value: string | number, type: FloatingTextType): void {
        let color = '#ffffff';
        let fontSize = '24px';
        let stroke = '#000000';
        let strokeThickness = 4;
        let textValue = value.toString();

        // Style configuration
        switch (type) {
            case 'damage':
                color = '#ff4444';
                fontSize = '32px';
                stroke = '#220000';
                break;
            case 'critical':
                color = '#ffdd00';
                fontSize = '48px';
                stroke = '#b35900';
                textValue = `CRIT! ${value}`;
                break;
            case 'heal':
                color = '#44ff44';
                fontSize = '32px';
                stroke = '#002200';
                textValue = `+${value}`;
                break;
            case 'status':
                color = '#cc88ff';
                fontSize = '24px';
                stroke = '#220044';
                break;
            case 'info':
                color = '#ffffff';
                fontSize = '20px';
                stroke = '#000000';
                break;
        }

        const textObj = this.scene.add.text(0, 0, textValue, {
            fontSize: fontSize,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: color,
            stroke: stroke,
            strokeThickness: strokeThickness
        }).setOrigin(0.5);

        this.add(textObj);

        // Animation based on type
        if (type === 'critical') {
            // Explosive pop
            textObj.setScale(0);
            this.scene.tweens.add({
                targets: textObj,
                scale: 1.5,
                duration: 200,
                ease: 'Back.out',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: textObj,
                        scale: 1,
                        y: textObj.y - 60,
                        alpha: 0,
                        duration: 1000,
                        delay: 300,
                        onComplete: () => textObj.destroy()
                    });
                }
            });
            // Screen shake for crit
            this.scene.cameras.main.shake(150, 0.01);

        } else if (type === 'damage') {
            // Bounce/arc
            this.scene.tweens.add({
                targets: textObj,
                y: textObj.y - 50,
                duration: 600,
                ease: 'Back.out',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: textObj,
                        y: textObj.y + 20,
                        alpha: 0,
                        duration: 400,
                        onComplete: () => textObj.destroy()
                    });
                }
            });
            // Slight randomized x movement
            this.scene.tweens.add({
                targets: textObj,
                x: (Math.random() - 0.5) * 40,
                duration: 1000,
            });

        } else if (type === 'heal') {
            // Gentle float up
            this.scene.tweens.add({
                targets: textObj,
                y: textObj.y - 60,
                alpha: 0,
                duration: 1200,
                ease: 'Sine.out',
                onComplete: () => textObj.destroy()
            });

        } else {
            // Standard float (status/info)
            this.scene.tweens.add({
                targets: textObj,
                y: textObj.y - 40,
                alpha: 0,
                duration: 1000,
                delay: 500,
                onComplete: () => textObj.destroy()
            });
        }
    }
}
