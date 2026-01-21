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
import { getRandomEnemy, DEFAULT_PLAYER_MEMORY, BattleData, Memory } from '../data/Memories';
import { getPartnerDialogue } from '../data/Dialogues';
import { GameState } from '../state/GameState';

/**
 * WorldScene
 * Main exploration scene with image-based map and collision objects from Tiled JSON
 */
export class WorldScene extends Phaser.Scene {
    private player!: Player;
    private partner!: Follower;
    private dialogueBox!: DialogueBox;
    private background!: Phaser.GameObjects.Image;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };

    // Collision zones
    private collisionBodies: Phaser.Physics.Arcade.StaticGroup | null = null;
    private exitZones: Phaser.GameObjects.Zone[] = [];
    private interactableObjects: Map<string, Phaser.GameObjects.Zone> = new Map();

    // Player memory (persistent across battles)
    private playerMemory: Memory = { ...DEFAULT_PLAYER_MEMORY };

    // Map dimensions (set from background image)
    private mapWidth = 800;
    private mapHeight = 600;

    // Encounter settings
    private readonly ENCOUNTER_CHANCE = 0.12;
    private isTransitioning = false;
    private isInDialogue = false;

    // Debug UI
    private debugText!: Phaser.GameObjects.Text;

    // Touch controls for mobile
    private _touchControls!: TouchControls;
    private touchDirection: TouchDirection = null;

    constructor() {
        super({ key: 'WorldScene' });
    }

    init(data?: { playerPosition?: { x: number; y: number }; playerVibe?: number }): void {
        if (data?.playerVibe !== undefined) {
            this.playerMemory.currentVibe = data.playerVibe;
        }

        // Check if finale should trigger (all memories collected)
        if (GameState.hasFlag('isReadyForFinale')) {
            console.log('🎉 All memories collected! Starting finale...');
            this.time.delayedCall(100, () => {
                this.scene.start('FinaleScene');
            });
        }
    }

    create(): void {
        console.log('🗺️ Map loaded');
        console.log('🎮 Player loaded');

        // ====================================================================
        // A. FORCE LOAD THE IMAGE DIRECTLY (NOT through tilemap)
        // ====================================================================
        this.background = this.add.image(0, 0, 'background');
        this.background.setOrigin(0, 0);
        this.background.setDepth(-1); // Ensure it is BEHIND everything

        // Store dimensions
        this.mapWidth = this.background.width;
        this.mapHeight = this.background.height;
        console.log(`✅ BACKGROUND FORCED: ${this.mapWidth}x${this.mapHeight}`);

        // ====================================================================
        // B. SETUP PHYSICS BOUNDS
        // ====================================================================
        this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

        // ====================================================================
        // C. INITIALIZE FLAGS AND CONTAINERS
        // ====================================================================
        this.isTransitioning = false;
        this.isInDialogue = false;
        this.exitZones = [];
        this.interactableObjects.clear();

        // ====================================================================
        // D. LOAD COLLISIONS FROM JSON
        // ====================================================================
        this.parseCollisionObjects();

        // ====================================================================
        // E. CREATE PLAYER AND ENTITIES
        // ====================================================================

        // Get starting position from data or use center
        const initData = this.scene.settings.data as { playerPosition?: { x: number; y: number } } | undefined;
        const startX = initData?.playerPosition?.x ?? this.mapWidth / 2;
        const startY = initData?.playerPosition?.y ?? this.mapHeight / 2;

        // Convert pixel position to tile position
        const startTileX = Math.floor(startX / TILE_SIZE);
        const startTileY = Math.floor(startY / TILE_SIZE);

        // Create player
        this.player = new Player(this, startTileX, startTileY);

        // Create partner (Boyfriend) behind the player
        this.partner = new Follower(this, startTileX, startTileY + 1, 'partner');

        // Create dialogue box UI
        this.dialogueBox = new DialogueBox(this);

        // ====================================================================
        // F. SETUP CAMERA with ZOOM
        // ====================================================================
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.cameras.main.startFollow(this.player.sprite, true, 0.05, 0.05);
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setZoom(1.5); // Zoom in for better pixel art visibility

        // Set up input
        this.setupInput();

        // Debug UI
        this.createDebugUI();

        // Setup touch controls for mobile
        this.setupTouchControls();

        // Listen for player movement
        this.events.on('playerMoveComplete', this.onPlayerMoveComplete, this);

        // ====================================================================
        // G. HANDLE SCENE WAKE (returning from battle)
        // ====================================================================
        this.events.on('wake', () => {
            console.log('🔄 WorldScene waking from sleep');

            // 1. Force Camera Reset
            this.cameras.main.fadeIn(1000, 0, 0, 0); // Fade back in from black
            this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
            this.cameras.main.startFollow(this.player.sprite, true, 0.05, 0.05);
            this.cameras.main.setZoom(1.5);

            // 2. Ensure Background is Visible
            if (this.background) {
                this.background.setVisible(true);
                this.background.setDepth(-1);
                console.log('✅ Background restored on wake');
            }

            // 3. Reset flags
            this.isTransitioning = false;
            this.isInDialogue = false;
        });
    }

    update(time: number, delta: number): void {
        if (!this.isTransitioning && !this.isInDialogue) {
            this.handleInput();
        }

        // Update partner
        this.partner.update(time, delta);

        // Update debug text
        this.updateDebugUI();

        // Check for exit zone overlap
        this.checkExitZones();
    }

    /**
     * Creates the world from background image and Tiled JSON collision data
     */
    private createWorld(): void {
        // Add background image
        if (this.textures.exists('background')) {
            this.background = this.add.image(0, 0, 'background');
            this.background.setOrigin(0, 0);
            this.mapWidth = this.background.width;
            this.mapHeight = this.background.height;
        } else {
            // Fallback: create a placeholder background
            console.warn('Background image not found, using placeholder');
            this.mapWidth = 800;
            this.mapHeight = 600;
            const graphics = this.add.graphics();
            graphics.fillStyle(0x3d6e3d, 1);
            graphics.fillRect(0, 0, this.mapWidth, this.mapHeight);
        }

        // Set world bounds
        this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

        // Parse collision objects from Tiled JSON
        this.parseCollisionObjects();
    }

    /**
     * Parse collision objects from Tiled JSON map using Phaser tilemap API
     */
    private parseCollisionObjects(): void {
        // Create static group for collision bodies
        this.collisionBodies = this.physics.add.staticGroup();

        // Load the tilemap using Phaser API
        const map = this.make.tilemap({ key: 'map' });

        if (!map) {
            console.error('❌ Failed to create tilemap from key "map"');
            return;
        }

        // Get the Collisions object layer (case-sensitive!)
        const objectLayer = map.getObjectLayer('Collisions');

        if (!objectLayer) {
            console.error('❌ Layer "Collisions" not found! Check Tiled layer name (case-sensitive)');
            console.log('Available layers:', map.layers.map(l => l.name));
            return;
        }

        console.log(`✅ Found "Collisions" layer with ${objectLayer.objects.length} objects`);

        // Process each object in the layer
        objectLayer.objects.forEach((obj: any) => {
            const name = obj.name || '';
            const x = obj.x;
            const y = obj.y;
            const width = obj.width;
            const height = obj.height;

            if (name === 'ExitZone') {
                // Create exit zone (sensor)
                this.createExitZone(x, y, width, height);
            } else if (name === 'PC') {
                // Create interactable PC object
                this.createInteractableObject('PC', x, y, width, height);
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

        // Create an invisible rectangle
        const body = this.add.rectangle(x + width / 2, y + height / 2, width, height);
        this.physics.add.existing(body, true); // true = static
        this.collisionBodies.add(body);

        // DEBUG: Draw green outline to visualize collision boxes
        body.setStrokeStyle(2, 0x00ff00, 1);
    }

    /**
     * Create an exit zone (sensor for scene transitions)
     */
    private createExitZone(x: number, y: number, width: number, height: number): void {
        const zone = this.add.zone(x + width / 2, y + height / 2, width, height);
        this.exitZones.push(zone);
        console.log(`🚪 Created exit zone at (${x}, ${y})`);
    }

    /**
     * Create an interactable object
     */
    private createInteractableObject(name: string, x: number, y: number, width: number, height: number): void {
        const zone = this.add.zone(x + width / 2, y + height / 2, width, height);
        this.interactableObjects.set(name, zone);
        console.log(`💻 Created interactable object: ${name} at (${x}, ${y})`);
    }

    /**
     * Check if player overlaps with exit zones
     */
    private checkExitZones(): void {
        if (this.isTransitioning) return;

        const playerSprite = this.player.sprite;
        const playerBounds = playerSprite.getBounds();

        for (const zone of this.exitZones) {
            const zoneBounds = zone.getBounds();
            if (Phaser.Geom.Rectangle.Overlaps(playerBounds, zoneBounds)) {
                this.changeScene();
                break;
            }
        }
    }

    /**
     * Handle scene transition when player enters exit zone
     */
    private changeScene(): void {
        if (this.isTransitioning) return;

        this.isTransitioning = true;
        console.log('🚪 Switching to City (next map)...');

        // Pause input
        this.input.keyboard!.enabled = false;

        // Fade to black
        this.cameras.main.fadeOut(1000, 0, 0, 0);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            // For now, restart the scene (until we have the second map)
            console.log('🏙️ City map not yet implemented, restarting...');
            this.input.keyboard!.enabled = true;
            this.scene.restart();
        });
    }

    /**
     * Check if a tile is walkable using collision bodies
     */
    public isWalkable(tileX: number, tileY: number): boolean {
        // Convert tile to world position
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

    private setupCamera(): void {
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setRoundPixels(true);
    }

    private setupInput(): void {
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.wasdKeys = {
            W: this.input.keyboard!.addKey('W'),
            A: this.input.keyboard!.addKey('A'),
            S: this.input.keyboard!.addKey('S'),
            D: this.input.keyboard!.addKey('D')
        };

        // Interaction key
        this.input.keyboard!.on('keydown-SPACE', () => this.handleInteraction());
        this.input.keyboard!.on('keydown-ENTER', () => this.handleInteraction());

        // Debug: Force battle
        this.input.keyboard!.on('keydown-B', () => {
            if (!this.isTransitioning && !this.isInDialogue) {
                this.startBattle();
            }
        });
    }

    /**
     * Setup touch controls for mobile devices
     */
    private setupTouchControls(): void {
        this._touchControls = new TouchControls({
            onDirectionChange: (direction) => {
                this.touchDirection = direction;
            },
            onActionPress: () => {
                // Trigger interaction on action button press
                this.handleInteraction();
            }
        });
    }

    private handleInput(): void {
        if (this.player.isMoving) return;

        let direction: Direction | null = null;

        // Check keyboard input
        if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
            direction = Direction.LEFT;
        } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
            direction = Direction.RIGHT;
        } else if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
            direction = Direction.UP;
        } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
            direction = Direction.DOWN;
        }

        // Check touch input (D-pad)
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
            // Update partner path
            this.partner.recordPlayerPosition(this.player.tileX, this.player.tileY, direction);

            // Move player
            this.player.move(direction, () => {
                this.events.emit('playerMoveComplete');
            });
        } else {
            this.player.face(direction);
        }
    }

    private onPlayerMoveComplete(): void {
        // Small chance for random encounter
        if (Math.random() < this.ENCOUNTER_CHANCE) {
            this.startBattle();
        }
    }

    /**
     * Handles interaction key (Space/Enter)
     */
    private handleInteraction(): void {
        // If dialogue is open, advance it
        if (this.dialogueBox.isActive()) {
            this.dialogueBox.advance();
            return;
        }

        // Get the tile the player is facing
        const facingTile = this.getTileInFrontOfPlayer();
        const facingWorldX = facingTile.x * TILE_SIZE + TILE_SIZE / 2;
        const facingWorldY = facingTile.y * TILE_SIZE + TILE_SIZE / 2;

        // Check for partner in front of player
        if (this.partner && this.partner.isAtTile(facingTile.x, facingTile.y)) {
            this.startPartnerDialogue();
            return;
        }

        // Check for interactable objects (like PC)
        for (const [name, zone] of this.interactableObjects) {
            const bounds = zone.getBounds();
            if (facingWorldX >= bounds.left && facingWorldX <= bounds.right &&
                facingWorldY >= bounds.top && facingWorldY <= bounds.bottom) {
                this.handleObjectInteraction(name);
                return;
            }
        }
    }

    /**
     * Handle interaction with named objects
     */
    private handleObjectInteraction(objectName: string): void {
        this.isInDialogue = true;

        let dialogue: string[] = [];

        switch (objectName) {
            case 'PC':
                dialogue = ["È qui che hai programmato questo gioco per me? Che meta-narrativa!"];
                break;
            default:
                dialogue = ["Hmm, interessante..."];
        }

        this.dialogueBox.show('', dialogue, () => {
            this.isInDialogue = false;
        });
    }

    /**
     * Starts dialogue with the partner
     */
    private startPartnerDialogue(): void {
        this.isInDialogue = true;

        const dialogue = getPartnerDialogue();

        this.dialogueBox.show('💕', dialogue, () => {
            this.isInDialogue = false;
        });
    }

    /**
     * Gets the tile position the player is facing
     */
    private getTileInFrontOfPlayer(): { x: number; y: number } {
        const vec = DIRECTION_VECTORS[this.player.currentDirection];
        return {
            x: this.player.tileX + vec.x,
            y: this.player.tileY + vec.y
        };
    }

    /**
     * Starts a battle encounter
     */
    private startBattle(): void {
        if (this.isTransitioning) return;

        this.isTransitioning = true;

        // Battle flash effect
        this.cameras.main.flash(500, 255, 255, 255);

        this.time.delayedCall(500, () => {
            const enemy = getRandomEnemy();
            const battleData: BattleData = {
                playerMemory: this.playerMemory,
                enemy: enemy,
                returnPosition: {
                    x: this.player.tileX,
                    y: this.player.tileY
                }
            };

            this.cameras.main.fadeOut(300, 0, 0, 0);

            this.time.delayedCall(300, () => {
                // Use sleep() so WorldScene can be woken up properly when battle ends
                this.scene.sleep('WorldScene');
                this.scene.launch('BattleScene', battleData);
                console.log('😴 WorldScene sleeping, launching BattleScene');
            });
        });
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
        const playerWorldX = this.player.tileX * TILE_SIZE;
        const playerWorldY = this.player.tileY * TILE_SIZE;

        // Reference touch controls to satisfy noUnusedLocals
        const touchDir = this._touchControls.getDirection();

        this.debugText.setText([
            `Tile: (${this.player.tileX}, ${this.player.tileY})`,
            `World: (${playerWorldX}, ${playerWorldY})`,
            `Dir: ${Direction[this.player.currentDirection]}${touchDir ? ` (touch: ${touchDir})` : ''}`,
            `Map: ${this.mapWidth}x${this.mapHeight}`,
            `[SPACE/A] Talk | [B] Battle`
        ].join('\n'));
    }
}
