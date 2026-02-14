import Phaser from 'phaser';

/**
 * DialogueBox
 * Reusable UI component for NPC conversations
 * Features typewriter effect, multi-page support, and speaker name
 * Now supports interactive choices
 */
export class DialogueBox {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private background: Phaser.GameObjects.Graphics;
    private nameText: Phaser.GameObjects.Text;
    private contentText: Phaser.GameObjects.Text;
    private continueIndicator: Phaser.GameObjects.Text;

    // Options UI
    private optionsContainer: Phaser.GameObjects.Container;
    private optionTexts: Phaser.GameObjects.Text[] = [];
    private selectedOptionIndex: number = 0;
    private onOptionSelected?: (index: number) => void;
    private isChoosing: boolean = false;

    private dialogueQueue: string[] = [];
    private currentText: string = '';
    private isTyping: boolean = false;
    private typewriterEvent?: Phaser.Time.TimerEvent;
    private onComplete?: () => void;

    // Configuration
    private readonly BOX_HEIGHT = 80;
    private readonly TYPE_SPEED = 30; // ms per character

    public isVisible: boolean = false;

    // Input listeners
    private keyUp?: Phaser.Input.Keyboard.Key;
    private keyDown?: Phaser.Input.Keyboard.Key;
    private keyEnter?: Phaser.Input.Keyboard.Key;
    private keySpace?: Phaser.Input.Keyboard.Key;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        // Get current camera zoom
        const zoom = scene.cameras.main.zoom;
        const inverseZoom = 1 / zoom;

        // Calculate effective viewport size
        const width = scene.cameras.main.width * inverseZoom;
        const height = scene.cameras.main.height * inverseZoom;

        const boxY = height - this.BOX_HEIGHT - 10;

        // Create container
        this.container = scene.add.container(0, boxY);
        this.container.setScrollFactor(0);
        this.container.setDepth(2000);
        this.container.setScale(inverseZoom); // Counter-scale to keep UI constant size

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

        // Options Container (Above the dialogue box)
        this.optionsContainer = scene.add.container(0, boxY - 10); // Start slightly above
        this.optionsContainer.setScrollFactor(0);
        this.optionsContainer.setDepth(2001);
        this.optionsContainer.setScale(inverseZoom); // Counter-scale options too
        this.optionsContainer.setVisible(false);

        // Initially hidden
        this.container.setVisible(false);

        // Bind input for options using Key objects for easier cleanup
        if (this.scene.input.keyboard) {
            this.keyUp = this.scene.input.keyboard.addKey('UP');
            this.keyDown = this.scene.input.keyboard.addKey('DOWN');
            this.keyEnter = this.scene.input.keyboard.addKey('ENTER');
            this.keySpace = this.scene.input.keyboard.addKey('SPACE');

            this.keyUp.on('down', () => this.navigateOptions(-1));
            this.keyDown.on('down', () => this.navigateOptions(1));
            this.keyEnter.on('down', () => this.selectOption());
            this.keySpace.on('down', () => this.selectOption());
        }
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

        console.log(`💬 DialogueBox Show: Speaker="${speakerName}", Lines=${dialogue.length}`);
        this.showNextLine();
    }

    /**
     * Shows a list of options for the player to choose from
     */
    public showOptions(prompt: string, options: string[], onSelect: (index: number) => void): void {
        this.isVisible = true;
        this.container.setVisible(true);
        this.nameText.setText('Player'); // Or whoever asks
        this.contentText.setText(prompt);
        this.continueIndicator.setVisible(false);

        this.onOptionSelected = onSelect;
        this.isChoosing = true;
        this.createOptionUI(options);
        console.log(`🤔 DialogueBox Options: ${JSON.stringify(options)}`);
    }

    private createOptionUI(options: string[]): void {
        this.optionsContainer.removeAll(true);
        this.optionTexts = [];
        this.selectedOptionIndex = 0;

        const { width } = this.scene.cameras.main;
        const optionHeight = 30;
        const startY = - (options.length * optionHeight) - 10; // Stack upwards

        options.forEach((opt, index) => {
            const y = startY + (index * optionHeight);

            // Backing
            const bg = this.scene.add.graphics();
            bg.fillStyle(0x000000, 0.8);
            bg.fillRoundedRect(width / 2 - 100, y, 200, 25, 4);

            // Text
            const text = this.scene.add.text(width / 2, y + 12, opt, {
                fontSize: '12px',
                color: '#ffffff'
            }).setOrigin(0.5);

            this.optionsContainer.add([bg, text]);
            this.optionTexts.push(text);
        });

        this.optionsContainer.setVisible(true);
        this.highlightOption(0);
    }

    private navigateOptions(delta: number): void {
        if (!this.isChoosing) return;

        this.selectedOptionIndex += delta;
        if (this.selectedOptionIndex < 0) this.selectedOptionIndex = this.optionTexts.length - 1;
        if (this.selectedOptionIndex >= this.optionTexts.length) this.selectedOptionIndex = 0;

        this.highlightOption(this.selectedOptionIndex);
    }

    private highlightOption(index: number): void {
        this.optionTexts.forEach((text, i) => {
            text.setColor(i === index ? '#ffff00' : '#ffffff');
            text.setScale(i === index ? 1.1 : 1.0);
        });
    }

    private selectOption(): void {
        if (!this.isChoosing) return;

        console.log(`✅ Option Selected: Index ${this.selectedOptionIndex}`);

        this.isChoosing = false;
        this.optionsContainer.setVisible(false);

        if (this.onOptionSelected) {
            this.onOptionSelected(this.selectedOptionIndex);
        }
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
        console.log('⏩ Typewriter Skipped');
    }

    /**
     * Advances to next dialogue or closes if done
     * Returns true if there was something to advance
     */
    public advance(): boolean {
        // If choosing, don't advance dialogue
        if (this.isChoosing) return false;

        if (!this.isVisible) {
            return false;
        }

        if (this.isTyping) {
            this.skipTypewriter();
            return true;
        }

        if (this.dialogueQueue.length > 0) {
            console.log('➡ DialogueBox Advance: Next Line');
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
        this.optionsContainer.setVisible(false);
        this.isVisible = false;
        this.isChoosing = false;

        console.log('❌ DialogueBox Hiding');

        if (this.typewriterEvent) {
            this.typewriterEvent.destroy();
        }

        if (this.onComplete) {
            console.log('🏁 DialogueBox Complete Callback Triggered');
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
        if (this.keyUp) this.keyUp.removeAllListeners();
        if (this.keyDown) this.keyDown.removeAllListeners();
        if (this.keyEnter) this.keyEnter.removeAllListeners();
        if (this.keySpace) this.keySpace.removeAllListeners();

        if (this.typewriterEvent) {
            this.typewriterEvent.destroy();
        }
        this.container.destroy();
        this.optionsContainer.destroy();
        console.log('🗑️ DialogueBox Destroyed');
    }
}
