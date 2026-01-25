import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Follower } from '../entities/Follower';
import { DialogueBox } from '../ui/DialogueBox';
import { TouchControls, TouchDirection } from '../ui/TouchControls';
import {
    TILE_SIZE,
    Direction,
    DIRECTION_VECTORS
} from '../config/GameConfig';
import { TimeSystem } from '../systems/TimeSystem';
import { QuestSystem } from '../systems/QuestSystem';

export class CityScene extends Phaser.Scene {
    private player!: Player;
    private partner!: Follower;
    private dialogueBox!: DialogueBox;
    private background!: Phaser.GameObjects.Image;
    private dayNightOverlay!: Phaser.GameObjects.Rectangle;
    private timeSystem!: TimeSystem;

    private debugText!: Phaser.GameObjects.Text;

    // City has different dimensions
    private mapWidth = 800;
    private mapHeight = 600;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys!: any;

    private isInDialogue = false;
    private isTransitioning = false;

    private _touchControls!: TouchControls;
    private touchDirection: TouchDirection = null;

    // Zones
    private cafeZone!: Phaser.GameObjects.Zone;

    constructor() {
        super({ key: 'CityScene' });
    }

    create(): void {
        console.log('🏙️ City Scene loaded');
        this.timeSystem = TimeSystem.getInstance();

        // Launch HUD if not active
        if (!this.scene.isActive('HudOverlay')) {
            this.scene.launch('HudOverlay');
        }

        // Quest Trigger: Explore City
        QuestSystem.getInstance().completeObjective('q1_start', 0);

        // Use city background
        this.background = this.add.image(0, 0, 'city-background');
        this.background.setOrigin(0, 0);
        this.background.setDepth(-1);

        this.mapWidth = this.background.width;
        this.mapHeight = this.background.height;

        this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

        // Player start position
        this.player = new Player(this, 25, 55); // Start at bottom of road
        this.partner = new Follower(this, 25, 56, 'partner');

        this.dialogueBox = new DialogueBox(this);

        // Camera setup
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.cameras.main.startFollow(this.player.sprite, true, 0.05, 0.05);
        this.cameras.main.setZoom(1.5);

        this.setupInput();
        this.setupTouchControls();
        this.createDebugUI();

        // Add "CAFE" Sign/Marker
        // Putting it at x:180, y:350 based on guess, can be adjusted
        this.add.text(180, 270, '☕ CAFE', {
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#553311',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);

        // Cafe Zone
        this.cafeZone = this.add.zone(180, 300, 80, 60);
        this.physics.add.existing(this.cafeZone, true);

        // Debug graphic for zone if needed (physics debug handles it usually)

        // Day/Night Overlay (Last thing added to be on top of world, but below Debug UI)
        this.dayNightOverlay = this.add.rectangle(0, 0, this.mapWidth, this.mapHeight, 0x000010, 0)
            .setOrigin(0, 0)
            .setDepth(90); // Below DebugUI (100) but above everything else

        // Community Garden Entrance (e.g., top right)
        this.add.text(600, 100, '🌻 GARDEN', {
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#228822',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);

        const gardenZone = this.add.zone(600, 130, 80, 60);
        this.physics.add.existing(gardenZone, true);
        this.physics.add.overlap(this.player.sprite, gardenZone, () => {
            this.scene.start('GardenScene');
        });
    }

    update(time: number, delta: number): void {
        if (!this.isInDialogue && !this.isTransitioning) {
            this.handleInput();
            this.checkZones();
        }

        // Update Day/Night Cycle
        const alpha = this.timeSystem.getLightIntensity();
        this.dayNightOverlay.setAlpha(alpha);

        this.partner.update(time, delta);
        this.updateDebugUI();
    }

    private checkZones(): void {
        const playerBounds = this.player.sprite.getBounds();

        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, this.cafeZone.getBounds())) {
            this.enterCafe();
        }
    }

    private enterCafe(): void {
        if (this.isTransitioning) return;

        this.isTransitioning = true;
        this.cameras.main.fadeOut(500, 0, 0, 0);

        this.time.delayedCall(500, () => {
            this.scene.start('CafeScene');
        });
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

    private setupTouchControls(): void {
        this._touchControls = new TouchControls({
            onDirectionChange: (dir) => this.touchDirection = dir,
            onActionPress: () => this.handleInteraction()
        });
    }

    private handleInput(): void {
        if (this.player.isMoving) return;

        let direction: Direction | null = null;

        if (this.cursors.left.isDown || this.wasdKeys.A.isDown) direction = Direction.LEFT;
        else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) direction = Direction.RIGHT;
        else if (this.cursors.up.isDown || this.wasdKeys.W.isDown) direction = Direction.UP;
        else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) direction = Direction.DOWN;

        if (direction === null && this.touchDirection) {
            switch (this.touchDirection) {
                case 'left': direction = Direction.LEFT; break;
                case 'right': direction = Direction.RIGHT; break;
                case 'up': direction = Direction.UP; break;
                case 'down': direction = Direction.DOWN; break;
            }
        }

        if (direction !== null) {
            this.movePlayer(direction);
        }
    }

    private movePlayer(direction: Direction): void {
        const vec = DIRECTION_VECTORS[direction];
        const targetX = this.player.tileX + vec.x;
        const targetY = this.player.tileY + vec.y;

        // Simple bound check
        if (targetX >= 0 && targetX < this.mapWidth / TILE_SIZE &&
            targetY >= 0 && targetY < this.mapHeight / TILE_SIZE) {

            this.partner.recordPlayerPosition(this.player.tileX, this.player.tileY, direction);
            this.player.move(direction, () => { });
        } else {
            this.player.face(direction);
        }
    }

    private handleInteraction(): void {
        if (this.dialogueBox.isActive()) {
            this.dialogueBox.advance();
            return;
        }
        // Specific interactions can be added here
    }

    private createDebugUI(): void {
        this.debugText = this.add.text(10, 10, '', {
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#00000088',
            padding: { x: 5, y: 5 }
        }).setScrollFactor(0).setDepth(100);
    }

    private updateDebugUI(): void {
        const touchDir = this._touchControls.getDirection();
        this.debugText.setText([
            `City Mode`,
            `Tile: (${this.player.tileX}, ${this.player.tileY})`,
            `Touch: ${touchDir || 'None'}`
        ].join('\n'));
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
