import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Follower } from '../entities/Follower';
import { DialogueBox } from '../ui/DialogueBox';
import { Direction, TILE_SIZE, DIRECTION_VECTORS } from '../config/GameConfig';
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

    // Exit zone trigger control - prevents immediate re-triggering on spawn
    private canTriggerExit = false;

    // Map dimensions (set from background image)
    private mapWidth = 1024;
    private mapHeight = 1024;

    // Collision system
    private collisionBodies: Phaser.Physics.Arcade.StaticGroup | null = null;

    // Zones
    private exitZone!: Phaser.GameObjects.Zone | null;
    private tableZone!: Phaser.GameObjects.Zone | null;

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

        // Reset state
        this.isTransitioning = false;
        this.isInDialogue = false;
        this.canTriggerExit = false; // Disable exit triggers until player leaves spawn zone
        this.exitZone = null;
        this.tableZone = null;

        // Background
        this.background = this.add.image(0, 0, 'cafe_interior_bg');
        this.background.setOrigin(0, 0);
        this.background.setDepth(-1);

        this.mapWidth = this.background.width;
        this.mapHeight = this.background.height;

        // Physics bounds
        this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

        // Parse collision objects from tilemap
        this.parseCollisionObjects();

        // Player & Partner (Starts near entrance)
        const startTileX = Math.floor(505 / TILE_SIZE);
        const startTileY = Math.floor(850 / TILE_SIZE);
        this.player = new Player(this, startTileX, startTileY);
        this.partner = new Follower(this, startTileX, startTileY + 1, 'partner');

        // Barista NPC (positioned based on map layout)
        this.barista = this.physics.add.sprite(200, 400, 'npc');
        this.barista.setTint(0x996633); // Brown tint for barista look

        // Dialogue UI
        this.dialogueBox = new DialogueBox(this);

        // Camera
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.cameras.main.startFollow(this.player.sprite, true, 0.05, 0.05);
        this.cameras.main.setZoom(1.5);

        // Inputs
        this.setupInput();

        // Add "Barista" label
        this.add.text(200, 360, 'Barista', {
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor: '#000000'
        }).setOrigin(0.5);
    }

    /**
     * Parse collision objects from Tiled JSON map
     */
    private parseCollisionObjects(): void {
        this.collisionBodies = this.physics.add.staticGroup();

        const map = this.make.tilemap({ key: 'cafe_interior_map' });

        if (!map) {
            console.error('❌ Failed to create tilemap from key "cafe_interior_map"');
            return;
        }

        const objectLayer = map.getObjectLayer('Collisions');

        if (!objectLayer) {
            console.error('❌ Layer "Collisions" not found in cafe_interior_map');
            return;
        }

        console.log(`✅ Found "Collisions" layer with ${objectLayer.objects.length} objects`);

        objectLayer.objects.forEach((obj: any) => {
            const name = obj.name || '';
            const x = obj.x;
            const y = obj.y;
            const width = obj.width;
            const height = obj.height;

            if (name === 'date_table') {
                // Date table zone for mini-game
                this.tableZone = this.add.zone(x + width / 2, y + height / 2, width, height);
                console.log(`🍽️ Created date_table zone at (${x}, ${y})`);
            } else if (name === 'EnterZone') {
                // Exit zone (back to city)
                this.exitZone = this.add.zone(x + width / 2, y + height / 2, width, height);
                console.log(`🚪 Created exit zone at (${x}, ${y})`);
            } else if (name !== '') {
                // Other named objects
                console.log(`📦 Found named object: ${name} at (${x}, ${y})`);
            } else {
                // Create wall collision body
                this.createCollisionBody(x, y, width, height);
            }
        });
    }

    /**
     * Create a static collision body (wall)
     */
    private createCollisionBody(x: number, y: number, width: number, height: number): void {
        if (!this.collisionBodies) return;

        const body = this.add.rectangle(x + width / 2, y + height / 2, width, height);
        this.physics.add.existing(body, true);
        this.collisionBodies.add(body);
    }

    /**
     * Check if a tile is walkable using collision bodies
     */
    public isWalkable(tileX: number, tileY: number): boolean {
        const worldX = tileX * TILE_SIZE + TILE_SIZE / 2;
        const worldY = tileY * TILE_SIZE + TILE_SIZE / 2;

        // Check world bounds
        if (worldX < 0 || worldX >= this.mapWidth ||
            worldY < 0 || worldY >= this.mapHeight) {
            return false;
        }

        // Check collision bodies
        if (this.collisionBodies) {
            const bodies = this.collisionBodies.getChildren() as Phaser.GameObjects.Rectangle[];
            for (const body of bodies) {
                const bounds = body.getBounds();
                if (worldX >= bounds.left && worldX <= bounds.right &&
                    worldY >= bounds.top && worldY <= bounds.bottom) {
                    return false;
                }
            }
        }

        // Check partner position
        if (this.partner && this.partner.isAtTile(tileX, tileY)) {
            return false;
        }

        return true;
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
        const vec = DIRECTION_VECTORS[direction];
        const targetX = this.player.tileX + vec.x;
        const targetY = this.player.tileY + vec.y;

        if (this.isWalkable(targetX, targetY)) {
            this.partner.recordPlayerPosition(this.player.tileX, this.player.tileY, direction);
            this.player.move(direction, () => { });
        } else {
            this.player.face(direction);
        }
    }

    /**
     * Check zones with overlap-exit detection for safe bidirectional transitions
     */
    private checkZones(): void {
        const playerBounds = this.player.sprite.getBounds();

        // Check if player is overlapping exit zone
        const isOverlappingExit = this.exitZone && Phaser.Geom.Rectangle.Overlaps(playerBounds, this.exitZone.getBounds());

        // If player is NOT overlapping exit zone, enable exit triggers
        if (!isOverlappingExit) {
            if (!this.canTriggerExit) {
                this.canTriggerExit = true;
                console.log('✅ Exit trigger enabled - player left spawn zone');
            }
            return;
        }

        // Player IS overlapping exit zone - only trigger if allowed
        if (this.canTriggerExit && isOverlappingExit) {
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
        if (this.tableZone && Phaser.Geom.Rectangle.Overlaps(playerBounds, this.tableZone.getBounds())) {
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
