import Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { EndGameLetter } from '../data/Dialogues';

/**
 * FinaleScene
 * Grand finale animation when all memories are collected
 * Features: Memory spin animation, photo reveal, and ending dialogue
 */
export class FinaleScene extends Phaser.Scene {
    private memorySprites: Phaser.GameObjects.Text[] = [];
    private finalPhoto!: Phaser.GameObjects.Image;
    private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
    private dialogueBox!: Phaser.GameObjects.Container;
    private dialogueText!: Phaser.GameObjects.Text;
    private currentDialogueIndex = 0;
    private isTyping = false;
    private typewriterEvent?: Phaser.Time.TimerEvent;
    private fullText = '';

    constructor() {
        super({ key: 'FinaleScene' });
    }

    preload(): void {
        // Check if the final photo exists, if not use a placeholder
        this.load.on('loaderror', () => {
            console.warn('Final photo not found, will use placeholder');
        });
        this.load.image('final_photo', '/assets/images/final_reveal_photo.jpg');
    }

    create(): void {
        const { width, height } = this.cameras.main;

        // Black background
        this.cameras.main.setBackgroundColor('#000000');

        // Add subtle gradient background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a0a2e, 0x1a0a2e, 0x0a0a1a, 0x0a0a1a, 1);
        bg.fillRect(0, 0, width, height);

        // Start the finale sequence
        this.startFinaleSequence();
    }

    /**
     * Main finale sequence orchestrator
     */
    private startFinaleSequence(): void {
        const { width, height } = this.cameras.main;

        // 1. Spawn memory sprites in a circle
        this.spawnMemorySprites(width / 2, height / 2);

        // 2. Wait a moment, then start the spin animation
        this.time.delayedCall(1000, () => {
            this.startMagicSpin();
        });
    }

    /**
     * Spawn memory emoji sprites arranged in a circle
     */
    private spawnMemorySprites(centerX: number, centerY: number): void {
        const collectedMemories = GameState.getCollectedMemories();
        const radius = 80;
        const count = collectedMemories.length;

        collectedMemories.forEach((memory, index) => {
            const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            const sprite = this.add.text(x, y, memory.emoji || '💕', {
                fontSize: '32px'
            }).setOrigin(0.5);

            // Fade in
            sprite.setAlpha(0);
            this.tweens.add({
                targets: sprite,
                alpha: 1,
                duration: 500,
                delay: index * 100,
                ease: 'Power2'
            });

            this.memorySprites.push(sprite);
        });

        // Add a title
        const title = this.add.text(centerX, 40, '✨ I Nostri Ricordi ✨', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffcc00',
            fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: title,
            alpha: 1,
            duration: 1000,
            ease: 'Power2'
        });
    }

    /**
     * The Magic Spin animation - memories spin into a singularity
     */
    private startMagicSpin(): void {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        // Create particle emitter at center
        this.createParticleEffect(centerX, centerY);

        // Spin, shrink, and fade all memory sprites
        this.memorySprites.forEach((sprite) => {
            // Calculate initial angle from center
            const dx = sprite.x - centerX;
            const dy = sprite.y - centerY;
            const initialAngle = Math.atan2(dy, dx);
            const initialRadius = Math.sqrt(dx * dx + dy * dy);

            // Create the spin animation
            this.tweens.add({
                targets: sprite,
                duration: 3000,
                ease: 'Power2.easeIn',
                onUpdate: (tween) => {
                    const progress = tween.progress;
                    // Spin 720 degrees (2 full rotations)
                    const angle = initialAngle + progress * Math.PI * 4;
                    // Shrink radius to 0
                    const radius = initialRadius * (1 - progress);

                    sprite.x = centerX + Math.cos(angle) * radius;
                    sprite.y = centerY + Math.sin(angle) * radius;

                    // Also spin the sprite itself
                    sprite.rotation = progress * Math.PI * 4;
                },
                onComplete: () => {
                    sprite.destroy();
                }
            });

            // Shrink and fade
            this.tweens.add({
                targets: sprite,
                scale: 0,
                alpha: 0,
                duration: 3000,
                ease: 'Power2.easeIn'
            });
        });

        // Start photo reveal after spin begins
        this.time.delayedCall(1500, () => {
            this.startPhotoReveal(centerX, centerY);
        });
    }

    /**
     * Create particle effect at center
     */
    private createParticleEffect(x: number, y: number): void {
        // Create a simple star particle using graphics
        const particleGraphics = this.make.graphics({ x: 0, y: 0 });
        particleGraphics.fillStyle(0xffff00, 1);
        particleGraphics.fillCircle(4, 4, 4);
        particleGraphics.generateTexture('star_particle', 8, 8);
        particleGraphics.destroy();

        // Create particle emitter
        this.particles = this.add.particles(x, y, 'star_particle', {
            speed: { min: 20, max: 60 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            frequency: 50,
            blendMode: 'ADD',
            tint: [0xffff00, 0xff6b9d, 0x9966ff, 0xffffff]
        });

        // Stop particles after the spin
        this.time.delayedCall(4000, () => {
            this.particles.stop();
        });
    }

    /**
     * The Photo Reveal animation
     */
    private startPhotoReveal(centerX: number, centerY: number): void {
        // Create the final photo (or placeholder)
        if (this.textures.exists('final_photo')) {
            this.finalPhoto = this.add.image(centerX, centerY, 'final_photo');
        } else {
            // Create a placeholder heart shape
            this.createPlaceholderPhoto(centerX, centerY);
            return;
        }

        // Start small and invisible
        this.finalPhoto.setScale(0);
        this.finalPhoto.setAlpha(0);
        this.finalPhoto.setDepth(10);

        // Dramatic reveal
        this.tweens.add({
            targets: this.finalPhoto,
            scale: 0.5, // Adjust based on image size
            alpha: 1,
            duration: 4000,
            ease: 'Power2.easeOut',
            onComplete: () => {
                this.showFinalDialogue();
            }
        });

        // Add a glow effect
        this.finalPhoto.setTint(0xffffff);
        this.tweens.add({
            targets: this.finalPhoto,
            tint: 0xffffff,
            duration: 2000,
            yoyo: true,
            repeat: -1
        });
    }

    /**
     * Create a placeholder if no photo exists
     */
    private createPlaceholderPhoto(centerX: number, centerY: number): void {
        const container = this.add.container(centerX, centerY);

        // Heart shape background
        const heart = this.add.text(0, 0, '💕', {
            fontSize: '120px'
        }).setOrigin(0.5);

        // Message
        const message = this.add.text(0, 80, 'Inserisci la tua foto qui!', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);

        const subMessage = this.add.text(0, 95, 'assets/images/final_reveal_photo.jpg', {
            fontSize: '10px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);

        container.add([heart, message, subMessage]);
        container.setScale(0);
        container.setAlpha(0);
        container.setDepth(10);

        // Animate in
        this.tweens.add({
            targets: container,
            scale: 1,
            alpha: 1,
            duration: 4000,
            ease: 'Power2.easeOut',
            onComplete: () => {
                this.showFinalDialogue();
            }
        });
    }

    /**
     * Show the final dialogue box with EndGameLetter text
     */
    private showFinalDialogue(): void {
        const { width, height } = this.cameras.main;

        // Create dialogue box
        this.dialogueBox = this.add.container(width / 2, height - 50);
        this.dialogueBox.setDepth(100);

        const boxWidth = width - 40;
        const boxHeight = 80;

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x1a1a2e, 0.95);
        bg.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 8);
        bg.lineStyle(3, 0xff6b9d, 1);
        bg.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 8);

        // Text
        this.dialogueText = this.add.text(-boxWidth / 2 + 15, -boxHeight / 2 + 15, '', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#ffffff',
            wordWrap: { width: boxWidth - 30 }
        });

        // Continue indicator
        const continueIndicator = this.add.text(boxWidth / 2 - 20, boxHeight / 2 - 20, '▼', {
            fontSize: '12px',
            color: '#888888'
        }).setOrigin(0.5).setName('continueIndicator');

        // Bounce animation
        this.tweens.add({
            targets: continueIndicator,
            y: continueIndicator.y + 5,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.dialogueBox.add([bg, this.dialogueText, continueIndicator]);
        this.dialogueBox.setAlpha(0);

        // Fade in
        this.tweens.add({
            targets: this.dialogueBox,
            alpha: 1,
            duration: 500,
            onComplete: () => {
                this.showNextDialogue();
            }
        });

        // Set up input
        this.input.keyboard!.on('keydown-SPACE', () => this.handleDialogueInput());
        this.input.keyboard!.on('keydown-ENTER', () => this.handleDialogueInput());
    }

    /**
     * Show next dialogue line with typewriter effect
     */
    private showNextDialogue(): void {
        if (this.currentDialogueIndex >= EndGameLetter.length) {
            this.endFinale();
            return;
        }

        this.fullText = EndGameLetter[this.currentDialogueIndex];
        this.dialogueText.setText('');
        this.isTyping = true;

        let charIndex = 0;
        this.typewriterEvent = this.time.addEvent({
            delay: 40,
            callback: () => {
                if (charIndex < this.fullText.length) {
                    this.dialogueText.setText(this.fullText.substring(0, charIndex + 1));
                    charIndex++;
                } else {
                    this.typewriterEvent?.destroy();
                    this.isTyping = false;
                }
            },
            repeat: this.fullText.length - 1
        });

        this.currentDialogueIndex++;
    }

    /**
     * Handle dialogue input (Space/Enter)
     */
    private handleDialogueInput(): void {
        if (this.isTyping) {
            // Skip typewriter
            this.typewriterEvent?.destroy();
            this.dialogueText.setText(this.fullText);
            this.isTyping = false;
        } else {
            this.showNextDialogue();
        }
    }

    /**
     * End the finale and return to title or credits
     */
    private endFinale(): void {
        // Fade out everything
        this.cameras.main.fadeOut(2000, 0, 0, 0);

        this.time.delayedCall(2000, () => {
            // Could go to credits scene or back to title
            // For now, just reset and go back to world
            GameState.reset();
            this.scene.start('WorldScene');
        });
    }
}
