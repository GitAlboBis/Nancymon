import Phaser from 'phaser';

/**
 * DialogueBox
 * Reusable UI component for NPC conversations
 * Features typewriter effect, multi-page support, and speaker name
 */
export class DialogueBox {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private background: Phaser.GameObjects.Graphics;
    private nameText: Phaser.GameObjects.Text;
    private contentText: Phaser.GameObjects.Text;
    private continueIndicator: Phaser.GameObjects.Text;

    private dialogueQueue: string[] = [];
    private currentText: string = '';
    private isTyping: boolean = false;
    private typewriterEvent?: Phaser.Time.TimerEvent;
    private onComplete?: () => void;

    // Configuration
    private readonly BOX_HEIGHT = 80;
    private readonly TYPE_SPEED = 30; // ms per character

    public isVisible: boolean = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        const { width, height } = scene.cameras.main;
        const boxY = height - this.BOX_HEIGHT - 10;

        // Create container
        this.container = scene.add.container(0, boxY);
        this.container.setScrollFactor(0);
        this.container.setDepth(2000);

        // Background
        this.background = scene.add.graphics();
        this.background.fillStyle(0x1a1a2e, 0.95);
        this.background.fillRoundedRect(10, 0, width - 20, this.BOX_HEIGHT, 8);
        this.background.lineStyle(3, 0xff6b9d, 1);
        this.background.strokeRoundedRect(10, 0, width - 20, this.BOX_HEIGHT, 8);

        // Speaker name
        this.nameText = scene.add.text(25, 8, '', {
            fontSize: '14px',
            color: '#ff6b9d',
            fontStyle: 'bold'
        });

        // Content text
        this.contentText = scene.add.text(25, 28, '', {
            fontSize: '13px',
            color: '#ffffff',
            wordWrap: { width: width - 60 },
            lineSpacing: 3
        });

        // Continue indicator
        this.continueIndicator = scene.add.text(width - 40, this.BOX_HEIGHT - 20, '▼', {
            fontSize: '14px',
            color: '#888888'
        });
        this.continueIndicator.setVisible(false);

        // Bounce animation for continue indicator
        scene.tweens.add({
            targets: this.continueIndicator,
            y: this.continueIndicator.y + 5,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Add all to container
        this.container.add([
            this.background,
            this.nameText,
            this.contentText,
            this.continueIndicator
        ]);

        // Initially hidden
        this.container.setVisible(false);
    }

    /**
     * Shows the dialogue box with the given dialogue lines
     */
    public show(speakerName: string, dialogue: string[], onComplete?: () => void): void {
        this.dialogueQueue = [...dialogue];
        this.onComplete = onComplete;
        this.isVisible = true;

        this.nameText.setText(speakerName);
        this.container.setVisible(true);

        this.showNextLine();
    }

    /**
     * Shows the next line of dialogue
     */
    private showNextLine(): void {
        if (this.dialogueQueue.length === 0) {
            this.hide();
            return;
        }

        this.currentText = this.dialogueQueue.shift()!;
        this.startTypewriter();
    }

    /**
     * Starts the typewriter effect for current text
     */
    private startTypewriter(): void {
        this.contentText.setText('');
        this.isTyping = true;
        this.continueIndicator.setVisible(false);

        let charIndex = 0;

        this.typewriterEvent = this.scene.time.addEvent({
            delay: this.TYPE_SPEED,
            repeat: this.currentText.length - 1,
            callback: () => {
                charIndex++;
                this.contentText.setText(this.currentText.substring(0, charIndex));

                if (charIndex >= this.currentText.length) {
                    this.isTyping = false;
                    this.continueIndicator.setVisible(true);
                }
            }
        });
    }

    /**
     * Skips the typewriter effect and shows full text
     */
    private skipTypewriter(): void {
        if (this.typewriterEvent) {
            this.typewriterEvent.destroy();
        }

        this.contentText.setText(this.currentText);
        this.isTyping = false;
        this.continueIndicator.setVisible(true);
    }

    /**
     * Advances to next dialogue or closes if done
     * Returns true if there was something to advance
     */
    public advance(): boolean {
        if (!this.isVisible) {
            return false;
        }

        if (this.isTyping) {
            this.skipTypewriter();
            return true;
        }

        if (this.dialogueQueue.length > 0) {
            this.showNextLine();
            return true;
        }

        // No more dialogue
        this.hide();
        return true;
    }

    /**
     * Hides the dialogue box
     */
    public hide(): void {
        this.container.setVisible(false);
        this.isVisible = false;

        if (this.typewriterEvent) {
            this.typewriterEvent.destroy();
        }

        if (this.onComplete) {
            this.onComplete();
            this.onComplete = undefined;
        }
    }

    /**
     * Checks if dialogue is currently active
     */
    public isActive(): boolean {
        return this.isVisible;
    }

    /**
     * Destroys the dialogue box
     */
    public destroy(): void {
        if (this.typewriterEvent) {
            this.typewriterEvent.destroy();
        }
        this.container.destroy();
    }
}
