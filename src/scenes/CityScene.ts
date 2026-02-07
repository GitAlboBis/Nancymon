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

/**
 * Interface for storing exit zone data with connection properties
 */
interface ExitZoneData {
    zone: Phaser.GameObjects.Zone;
    targetMap?: string;
    targetConnID?: string;
    targetScene?: string;
}

export class CityScene extends Phaser.Scene {
    private player!: Player;
    private partner!: Follower;
    private dialogueBox!: DialogueBox;
    private background!: Phaser.GameObjects.Image;
    private dayNightOverlay!: Phaser.GameObjects.Rectangle;
    private timeSystem!: TimeSystem;

    private debugText!: Phaser.GameObjects.Text;

    // Map dimensions (set from background image)
    private mapWidth = 1024;
    private mapHeight = 1024;

    // Collision system
    private collisionBodies: Phaser.Physics.Arcade.StaticGroup | null = null;
    private exitZones: ExitZoneData[] = [];

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys!: any;

    private isInDialogue = false;
    private isTransitioning = false;

    // Exit zone trigger control - prevents immediate re-triggering on spawn
    private canTriggerExit = false;

    private _touchControls!: TouchControls;
    private touchDirection: TouchDirection = null;

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

        // Reset state
        this.isTransitioning = false;
        this.isInDialogue = false;
        this.canTriggerExit = false; // Disable exit triggers until player leaves spawn zone
        this.exitZones = [];

        // Use city background
        this.background = this.add.image(0, 0, 'cafecity_bg');
        this.background.setOrigin(0, 0);
        this.background.setDepth(-1);

        this.mapWidth = this.background.width;
        this.mapHeight = this.background.height;

        this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

        // Parse collision objects from tilemap
        this.parseCollisionObjects();

        // Player start position (center of walkable area)
        const startTileX = Math.floor(500 / TILE_SIZE);
        const startTileY = Math.floor(700 / TILE_SIZE);
        this.player = new Player(this, startTileX, startTileY);
        this.partner = new Follower(this, startTileX, startTileY + 1, 'partner');

        this.dialogueBox = new DialogueBox(this);

        // Camera setup
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.cameras.main.startFollow(this.player.sprite, true, 0.05, 0.05);
        this.cameras.main.setZoom(1.5);

        this.setupInput();
        this.setupTouchControls();
        this.createDebugUI();

        // Day/Night Overlay (Last thing added to be on top of world, but below Debug UI)
        this.dayNightOverlay = this.add.rectangle(0, 0, this.mapWidth, this.mapHeight, 0x000010, 0)
            .setOrigin(0, 0)
            .setDepth(90); // Below DebugUI (100) but above everything else
    }

    update(time: number, delta: number): void {
        if (!this.isInDialogue && !this.isTransitioning) {
            this.handleInput();
            this.checkExitZones();
        }

        // Update Day/Night Cycle
        const alpha = this.timeSystem.getLightIntensity();
        this.dayNightOverlay.setAlpha(alpha);

        this.partner.update(time, delta);
        this.updateDebugUI();
    }

    /**
     * Parse collision objects from Tiled JSON map
     */
    private parseCollisionObjects(): void {
        this.collisionBodies = this.physics.add.staticGroup();

        const map = this.make.tilemap({ key: 'cafecity_map' });

        if (!map) {
            console.error('❌ Failed to create tilemap from key "cafecity_map"');
            return;
        }

        const objectLayer = map.getObjectLayer('Collisions');

        if (!objectLayer) {
            console.error('❌ Layer "Collisions" not found in cafecity_map');
            return;
        }

        console.log(`✅ Found "Collisions" layer with ${objectLayer.objects.length} objects`);

        objectLayer.objects.forEach((obj: any) => {
            const name = obj.name || '';
            const x = obj.x;
            const y = obj.y;
            const width = obj.width;
            const height = obj.height;

            if (name === 'ExitZone') {
                const properties = obj.properties as Array<{ name: string; value: any }> | undefined;
                const targetMap = properties?.find(p => p.name === 'targetMap')?.value;
                const targetConnID = properties?.find(p => p.name === 'targetConnID')?.value;

                // Check if this is the cafe entrance (no targetMap means it goes to CafeScene)
                if (targetMap === 'cafe-interior') {
                    this.createExitZone(x, y, width, height, undefined, targetConnID, 'CafeScene');
                } else if (targetMap) {
                    this.createExitZone(x, y, width, height, targetMap, targetConnID);
                } else {
                    // Legacy exit zone without target
                    this.createExitZone(x, y, width, height);
                }
            } else if (name !== '') {
                // Named object but not ExitZone - could be interactable
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
     * Create an exit zone (sensor for scene transitions)
     */
    private createExitZone(x: number, y: number, width: number, height: number, targetMap?: string, targetConnID?: string, targetScene?: string): void {
        const zone = this.add.zone(x + width / 2, y + height / 2, width, height);
        const exitData: ExitZoneData = {
            zone: zone,
            targetMap: targetMap,
            targetConnID: targetConnID,
            targetScene: targetScene
        };
        this.exitZones.push(exitData);
        console.log(`🚪 Created exit zone at (${x}, ${y})${targetMap ? ` -> ${targetMap}` : ''}${targetScene ? ` -> ${targetScene}` : ''}${targetConnID ? ` (${targetConnID})` : ''}`);
    }

    /**
     * Check if player overlaps with exit zones
     * Implements overlap-exit detection for safe bidirectional transitions
     */
    private checkExitZones(): void {
        if (this.isTransitioning) return;

        const playerBounds = this.player.sprite.getBounds();

        // Check if player is currently overlapping any exit zone
        let isOverlappingAnyZone = false;
        let overlappedZone: ExitZoneData | null = null;

        for (const exitData of this.exitZones) {
            const zoneBounds = exitData.zone.getBounds();
            if (Phaser.Geom.Rectangle.Overlaps(playerBounds, zoneBounds)) {
                isOverlappingAnyZone = true;
                overlappedZone = exitData;
                break;
            }
        }

        // If player is NOT overlapping any zone, enable exit triggers
        if (!isOverlappingAnyZone) {
            if (!this.canTriggerExit) {
                this.canTriggerExit = true;
                console.log('✅ Exit trigger enabled - player left spawn zone');
            }
            return;
        }

        // Player IS overlapping a zone - only trigger if allowed
        if (this.canTriggerExit && overlappedZone) {
            this.changeScene(overlappedZone.targetMap, overlappedZone.targetConnID, overlappedZone.targetScene);
        }
    }

    /**
     * Handle scene transition when player enters exit zone
     */
    private changeScene(targetMap?: string, targetConnID?: string, targetScene?: string): void {
        if (this.isTransitioning) return;

        this.isTransitioning = true;

        // Pause input
        this.input.keyboard!.enabled = false;

        // Fade to black
        this.cameras.main.fadeOut(500, 0, 0, 0);

        this.time.delayedCall(500, () => {
            this.input.keyboard!.enabled = true;

            if (targetScene) {
                // Direct scene transition (e.g., to CafeScene)
                console.log(`🚪 Transitioning to ${targetScene}...`);
                this.scene.start(targetScene);
            } else if (targetMap) {
                // WorldScene-to-WorldScene transition
                console.log(`🚪 Transitioning to WorldScene with map: ${targetMap}...`);
                const backgroundKey = targetMap + '_bg';
                this.scene.start('WorldScene', {
                    mapKey: targetMap,
                    backgroundKey: backgroundKey,
                    targetConnID: targetConnID
                });
            } else {
                // Fallback
                this.scene.start('WorldScene');
            }
        });
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

        if (this.isWalkable(targetX, targetY)) {
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
