import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Follower } from '../entities/Follower';
import { DialogueBox } from '../ui/DialogueBox';
import { Direction } from '../config/GameConfig';
import { getRandomDateQuestions, DateQuestion } from '../data/Dialogues';
import { QuestSystem } from '../systems/QuestSystem';

export class CafeScene extends Phaser.Scene {
    private player!: Player;
    private partner!: Follower;
    private dialogueBox!: DialogueBox;
    private background!: Phaser.GameObjects.Image;
    private barista!: Phaser.GameObjects.Sprite;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys!: any;

    private isInDialogue = false;
    private isTransitioning = false;

    // Zones
    private exitZone!: Phaser.GameObjects.Zone;
    private tableZone!: Phaser.GameObjects.Zone;

    // Date Night State
    private dateQuestions: DateQuestion[] = [];
    private currentQuestionIndex: number = 0;
    private currentScore: number = 0;

    constructor() {
        super({ key: 'CafeScene' });
    }

    create(): void {
        console.log('☕ Cafe Scene loaded');

        // Quest Trigger: Find Cafe
        QuestSystem.getInstance().completeObjective('q1_start', 1);

        // Background
        this.background = this.add.image(0, 0, 'cafe-interior');
        this.background.setOrigin(0, 0);

        // Physics logic
        this.physics.world.setBounds(0, 0, 800, 600);

        // Player & Partner (Starts at bottom, facing UP)
        this.player = new Player(this, 12, 16); // Approx bottom center in tiles
        this.partner = new Follower(this, 12, 17, 'partner');

        // Barista NPC (Behind counter - assuming counter is top left/center)
        this.barista = this.physics.add.sprite(200, 150, 'npc');
        this.barista.setTint(0x996633); // Brown tint for barista look

        // Dialogue UI
        this.dialogueBox = new DialogueBox(this);

        // Camera
        this.cameras.main.setBounds(0, 0, 800, 600);
        this.cameras.main.startFollow(this.player.sprite, true, 0.05, 0.05);
        this.cameras.main.setZoom(1.5);

        // Inputs
        this.setupInput();

        // Zones
        // Exit at bottom
        this.exitZone = this.add.zone(400, 580, 200, 50);
        this.physics.add.existing(this.exitZone, true);

        // Table for date (Center)
        this.tableZone = this.add.zone(400, 300, 100, 100);
        this.physics.add.existing(this.tableZone, true);

        // Add "Barista" label
        this.add.text(200, 110, 'Barista', {
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor: '#000000'
        }).setOrigin(0.5);
    }

    update(time: number, delta: number): void {
        if (!this.isInDialogue && !this.isTransitioning) {
            this.handleInput();
            this.checkZones();
        }
        this.partner.update(time, delta);
    }

    private setupInput(): void {
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.wasdKeys = {
            W: this.input.keyboard!.addKey('W'),
            A: this.input.keyboard!.addKey('A'),
            S: this.input.keyboard!.addKey('S'),
            D: this.input.keyboard!.addKey('D')
        };
        this.input.keyboard!.on('keydown-SPACE', () => this.handleInteraction());
        this.input.keyboard!.on('keydown-M', () => this.openMemoryAlbum());
        this.input.keyboard!.on('keydown-J', () => this.openJournal());
        this.input.keyboard!.on('keydown-I', () => this.openBag());
    }

    private handleInput(): void {
        if (this.player.isMoving) return;

        let direction: Direction | null = null;

        if (this.cursors.left.isDown || this.wasdKeys.A.isDown) direction = Direction.LEFT;
        else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) direction = Direction.RIGHT;
        else if (this.cursors.up.isDown || this.wasdKeys.W.isDown) direction = Direction.UP;
        else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) direction = Direction.DOWN;

        if (direction !== null) {
            this.movePlayer(direction);
        }
    }

    private movePlayer(direction: Direction): void {
        // Simple movement for now, refine collisions later if needed
        this.partner.recordPlayerPosition(this.player.tileX, this.player.tileY, direction);
        this.player.move(direction, () => { });
    }

    private checkZones(): void {
        const playerBounds = this.player.sprite.getBounds();

        // Check Exit
        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, this.exitZone.getBounds())) {
            this.exitCafe();
        }
    }

    private handleInteraction(): void {
        if (this.dialogueBox.isActive()) {
            this.dialogueBox.advance();
            return;
        }

        const playerBounds = this.player.sprite.getBounds();

        // Talk to Barista
        if (Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.barista.x, this.barista.y) < 60) {
            this.isInDialogue = true;
            this.dialogueBox.show('Barista', [
                "Welcome to Pixel Brew!",
                "We serve the finest digital beans.",
                "Take a seat with your partner to relax! ☕"
            ], () => this.isInDialogue = false);
            return;
        }

        // Sit at Table
        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, this.tableZone.getBounds())) {
            this.startDateEvent();
        }
    }

    private exitCafe(): void {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
            this.scene.start('CityScene');
        });
    }

    // ========================================================================
    // DATE NIGHT MINI-GAME LOGIC
    // ========================================================================

    private startDateEvent(): void {
        if (this.isInDialogue) return;
        this.isInDialogue = true;

        // Quest Trigger: Date Started
        QuestSystem.getInstance().completeObjective('q2_date', 0);

        // Reset state
        this.currentScore = 0;
        this.currentQuestionIndex = 0;
        this.dateQuestions = getRandomDateQuestions(3); // 3 Rounds

        this.dialogueBox.show('Date Time', [
            "Benvenuti al vostro appuntamento!",
            "Rispondi col cuore per far felice la tua partner."
        ], () => {
            this.showNextQuestion();
        });
    }

    private showNextQuestion(): void {
        if (this.currentQuestionIndex >= this.dateQuestions.length) {
            this.concludeDate();
            return;
        }

        const q = this.dateQuestions[this.currentQuestionIndex];

        // Extract option texts for the UI
        const optionsText = q.options.map(o => o.text);

        this.dialogueBox.showOptions(q.question, optionsText, (selectedIndex) => {
            this.handleDateChoice(q, selectedIndex);
        });
    }

    private handleDateChoice(question: DateQuestion, index: number): void {
        const choice = question.options[index];
        this.currentScore += choice.score;

        // Show partner's reaction
        this.dialogueBox.show('Partner', choice.response, () => {
            this.currentQuestionIndex++;
            this.showNextQuestion();
        });
    }

    private concludeDate(): void {
        let finalMessage: string[] = [];
        let effectColor = 0xffffff;

        if (this.currentScore >= 5) {
            // Perfect (5-6 points)
            finalMessage = [
                "È stato un appuntamento PERFETTO!",
                "Siete più uniti che mai! ❤️"
            ];
            effectColor = 0xff69b4; // Hot Pink
        } else if (this.currentScore >= 3) {
            // Good (3-4 points)
            finalMessage = [
                "È stato un bel appuntamento.",
                "Ci siamo divertiti."
            ];
            effectColor = 0xffa07a; // Light Salmon
            QuestSystem.getInstance().completeObjective('q2_date', 1); // Win heart
        } else {
            // Bad (0-2 points)
            finalMessage = [
                "Beh... potevamo fare meglio.",
                "Forse la prossima volta andrà meglio..."
            ];
            effectColor = 0x808080; // Gray
        }

        this.dialogueBox.show('Risultato', finalMessage, () => {
            // Visual Flair
            this.cameras.main.flash(1000,
                (effectColor >> 16) & 0xFF,
                (effectColor >> 8) & 0xFF,
                effectColor & 0xFF
            );

            // Reset everything
            this.isInDialogue = false;

            // Move player slightly away so they don't instantly re-trigger
            this.player.sprite.y += 20;
        });
    }

    private openMemoryAlbum(): void {
        if (this.isTransitioning || this.isInDialogue) return;
        this.scene.pause();
        this.scene.pause('HudOverlay');
        this.scene.launch('MemoryAlbumScene');
    }

    private openJournal(): void {
        if (this.isTransitioning || this.isInDialogue) return;
        this.scene.pause();
        this.scene.pause('HudOverlay');
        this.scene.launch('JournalScene');
    }

    private openBag(): void {
        if (this.isTransitioning || this.isInDialogue) return;
        this.scene.pause();
        this.scene.pause('HudOverlay');
        this.scene.launch('BagScene');
    }
}
