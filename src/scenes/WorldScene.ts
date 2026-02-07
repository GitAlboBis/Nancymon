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
import { getRandomEnemy, DEFAULT_PLAYER_MEMORY, BattleData, Memory } from '../data/Memories';
import { getPartnerDialogue } from '../data/Dialogues';
import { GameState } from '../state/GameState';
import { ReactionBubble, ReactionType } from '../ui/ReactionBubble';
import { WeatherSystem, WeatherType } from '../systems/WeatherSystem';


/**
 * Interface for storing exit zone data with connection properties
 */
interface ExitZoneData {
    zone: Phaser.GameObjects.Zone;
    targetMap?: string;
    targetConnID?: string;
}

/**
 * WorldScene
 * Main exploration scene with image-based map and collision objects from Tiled JSON
 */
export class WorldScene extends Phaser.Scene {
    private player!: Player;
    private partner!: Follower;
    private dialogueBox!: DialogueBox;
    private background!: Phaser.GameObjects.Image;
    private dayNightOverlay!: Phaser.GameObjects.Rectangle;
    private timeSystem!: TimeSystem;
    private weatherSystem!: WeatherSystem;
    private encounterZones: Phaser.GameObjects.Zone[] = [];

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };

    // Collision zones
    private collisionBodies: Phaser.Physics.Arcade.StaticGroup | null = null;
    private exitZones: ExitZoneData[] = [];
    private interactableObjects: Map<string, Phaser.GameObjects.Zone> = new Map();

    // Player memory (persistent across battles)
    private playerMemory: Memory = { ...DEFAULT_PLAYER_MEMORY };

    // Map dimensions (set from background image)
    private mapWidth = 800;
    private mapHeight = 600;

    // Encounter settings
    // private readonly ENCOUNTER_CHANCE = 0.12; // Replaced by zone logic
    private isTransitioning = false;
    private isInDialogue = false;

    // Exit zone trigger control - prevents immediate re-triggering on spawn
    private canTriggerExit = false;

    // Debug UI
    private debugText!: Phaser.GameObjects.Text;

    // Map settings
    private currentMapKey: string = 'map';
    private currentBackgroundKey: string = 'background';

    // Touch controls for mobile
    private _touchControls!: TouchControls;
    private touchDirection: TouchDirection = null;

    constructor() {
        super({ key: 'WorldScene' });
    }

    init(data?: { playerPosition?: { x: number; y: number }; playerVibe?: number; mapKey?: string; backgroundKey?: string; targetConnID?: string }): void {
        if (data?.playerVibe !== undefined) {
            this.playerMemory.currentVibe = data.playerVibe;
        }

        // Set map keys from data or default
        this.currentMapKey = data?.mapKey || 'map';
        this.currentBackgroundKey = data?.backgroundKey || 'background';

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

        this.timeSystem = TimeSystem.getInstance();
        this.weatherSystem = new WeatherSystem(this);
        // Start with some nice atmosphere
        this.weatherSystem.setWeather(WeatherType.CHERRY_BLOSSOM);

        // Unlock starter memory for the demo/surprise
        GameState.collectMemory('paris_trip');

        // Launch HUD if not active
        if (!this.scene.isActive('HudOverlay')) {
            this.scene.launch('HudOverlay');
        }

        // ====================================================================
        // A. FORCE LOAD THE IMAGE DIRECTLY (NOT through tilemap)
        // ====================================================================
        // ====================================================================
        // A. FORCE LOAD THE IMAGE DIRECTLY (NOT through tilemap)
        // ====================================================================
        this.background = this.add.image(0, 0, this.currentBackgroundKey);
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
        this.canTriggerExit = false; // Disable exit triggers until player leaves spawn zone
        this.exitZones = [];
        this.encounterZones = [];
        this.interactableObjects.clear();

        // ====================================================================
        // D. LOAD COLLISIONS FROM JSON
        // ====================================================================
        this.parseCollisionObjects();

        // ====================================================================
        // E. CREATE PLAYER AND ENTITIES
        // ====================================================================

        // Get starting position from data or use center
        const initData = this.scene.settings.data as { playerPosition?: { x: number; y: number }; targetConnID?: string } | undefined;

        let startX: number;
        let startY: number;

        // Priority 1: Use targetConnID to find entrance (connection system)
        if (initData?.targetConnID) {
            const map = this.make.tilemap({ key: this.currentMapKey });
            const entrance = this.findEntranceByConnID(map, initData.targetConnID);
            if (entrance) {
                startX = entrance.x;
                startY = entrance.y;
                console.log(`🔗 Spawning at connection ID "${initData.targetConnID}" (${startX}, ${startY})`);
            } else {
                console.warn(`⚠️ Connection ID "${initData.targetConnID}" not found, using default spawn`);
                startX = initData?.playerPosition?.x ?? this.mapWidth / 2;
                startY = initData?.playerPosition?.y ?? this.mapHeight / 2;
            }
        } else {
            // Priority 2: Use explicit player position
            // Priority 3: Default to map center
            startX = initData?.playerPosition?.x ?? this.mapWidth / 2;
            startY = initData?.playerPosition?.y ?? this.mapHeight / 2;
        }

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

        // Day/Night Overlay
        this.dayNightOverlay = this.add.rectangle(0, 0, this.mapWidth, this.mapHeight, 0x000010, 0)
            .setOrigin(0, 0)
            .setDepth(90); // Below DebugUI (100)

        // Setup touch controls for mobile
        this.setupTouchControls();

        // Listen for player movement
        this.events.on('playerMoveComplete', this.onPlayerMoveComplete, this);

        // ====================================================================
        // G. HANDLE SCENE WAKE (returning from battle)
        // ====================================================================
        this.events.on('wake', (_sys: Phaser.Scenes.Systems, data: any) => {
            console.log('🔄 WorldScene waking from sleep');

            // Update player memory from battle data
            if (data?.playerMemory) {
                this.playerMemory = data.playerMemory;
                console.log(`📊 Updated Player Memory: Lv.${this.playerMemory.level} | XP: ${this.playerMemory.xp}/${this.playerMemory.xpToNextLevel}`);
            }

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

            // Wake HUD
            this.scene.wake('HudOverlay');
        });
    }

    update(time: number, delta: number): void {
        // Update weather
        this.weatherSystem.update();

        if (!this.isTransitioning && !this.isInDialogue) {
            this.handleInput();
        }

        // Update Day/Night Cycle
        const alpha = this.timeSystem.getLightIntensity();
        this.dayNightOverlay.setAlpha(alpha);

        // Update partner
        this.partner.update(time, delta);

        // Update debug text
        this.updateDebugUI();

        // Check for exit zone overlap
        this.checkExitZones();
    }



    /**
     * Parse collision objects from Tiled JSON map using Phaser tilemap API
     */
    private parseCollisionObjects(): void {
        // Create static group for collision bodies
        this.collisionBodies = this.physics.add.staticGroup();

        // Load the tilemap using Phaser API
        // Load the tilemap using Phaser API
        const map = this.make.tilemap({ key: this.currentMapKey });

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
                // Read custom properties for connection system
                const properties = obj.properties as Array<{ name: string; value: any }> | undefined;
                const targetMap = properties?.find(p => p.name === 'targetMap')?.value;
                const targetConnID = properties?.find(p => p.name === 'targetConnID')?.value;

                // Create exit zone with connection data
                this.createExitZone(x, y, width, height, targetMap, targetConnID);
            } else if (name === 'PC') {
                // Create interactable PC object
                this.createInteractableObject('PC', x, y, width, height);
            } else {
                // Create wall collision body
                this.createCollisionBody(x, y, width, height);
            }
        });

        // ====================================================================
        // Parse 'Encounters' layer (Tall Grass)
        // ====================================================================
        const encounterLayer = map.getObjectLayer('Encounters');

        if (encounterLayer && encounterLayer.objects) {
            console.log(`🌿 Found "Encounters" layer with ${encounterLayer.objects.length} zones`);

            encounterLayer.objects.forEach((obj: any) => {
                const zone = this.add.zone(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width, obj.height);
                this.encounterZones.push(zone); // Store for overlap checks

                // Debug visualization: Semi-transparent red rectangle
                if (this.physics.config.debug) {
                    const graphics = this.add.graphics();
                    graphics.fillStyle(0xff0000, 0.3); // Red, 30% opacity
                    graphics.fillRect(obj.x, obj.y, obj.width, obj.height);
                }
            });
        }
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
    private createExitZone(x: number, y: number, width: number, height: number, targetMap?: string, targetConnID?: string): void {
        const zone = this.add.zone(x + width / 2, y + height / 2, width, height);
        const exitData: ExitZoneData = {
            zone: zone,
            targetMap: targetMap,
            targetConnID: targetConnID
        };
        this.exitZones.push(exitData);
        console.log(`🚪 Created exit zone at (${x}, ${y})${targetMap ? ` -> ${targetMap}` : ''}${targetConnID ? ` (${targetConnID})` : ''}`);
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
     * Implements overlap-exit detection for safe bidirectional transitions
     */
    private checkExitZones(): void {
        if (this.isTransitioning) return;

        const playerSprite = this.player.sprite;
        const playerBounds = playerSprite.getBounds();

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
            this.changeScene(overlappedZone.targetMap, overlappedZone.targetConnID);
        }
    }

    /**
     * Handle scene transition when player enters exit zone
     */
    private changeScene(targetMap?: string, targetConnID?: string): void {
        if (this.isTransitioning) return;

        this.isTransitioning = true;

        // Determine which scene to load
        const nextScene = targetMap || 'CityScene';
        console.log(`🚪 Transitioning to ${nextScene}${targetConnID ? ` (connection: ${targetConnID})` : ''}...`);

        // Pause input
        this.input.keyboard!.enabled = false;

        // Fade to black
        this.cameras.main.fadeOut(1000, 0, 0, 0);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.input.keyboard!.enabled = true;

            // If targetMap is provided, it's a WorldScene-to-WorldScene transition
            if (targetMap) {
                // Derive background key (convention: mapKey + '_bg')
                const backgroundKey = targetMap + '_bg';
                this.scene.start('WorldScene', {
                    mapKey: targetMap,
                    backgroundKey: backgroundKey,
                    targetConnID: targetConnID
                });
            } else {
                // Fallback to hardcoded CityScene transition (backward compatibility)
                this.scene.start('CityScene');
            }
        });
    }

    /**
     * Find an entrance in the map by its connection ID
     * @param map The tilemap to search
     * @param connID The connection ID to find
     * @returns Pixel coordinates { x, y } or null if not found
     */
    private findEntranceByConnID(map: Phaser.Tilemaps.Tilemap, connID: string): { x: number; y: number } | null {
        // Search all object layers for EnterZone with matching connID
        for (const layer of map.layers) {
            // Check if the layer is an object group layer
            const objectLayer = map.getObjectLayer(layer.name);
            if (!objectLayer) continue;

            for (const obj of objectLayer.objects) {
                if (obj.name === 'EnterZone') {
                    const properties = obj.properties as Array<{ name: string; value: any }> | undefined;
                    const entranceConnID = properties?.find(p => p.name === 'connID')?.value;

                    if (entranceConnID === connID) {
                        // Return the center position of the entrance zone
                        return {
                            x: (obj.x ?? 0) + (obj.width ?? 0) / 2,
                            y: (obj.y ?? 0) + (obj.height ?? 0) / 2
                        };
                    }
                }
            }
        }

        return null;
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
        this.input.keyboard!.on('keydown-M', () => this.openMemoryAlbum());
        this.input.keyboard!.on('keydown-J', () => this.openJournal());
        this.input.keyboard!.on('keydown-I', () => this.openBag());

        this.input.keyboard!.on('keydown-B', () => {
            if (!this.isTransitioning && !this.isInDialogue) {
                this.startBattle();
            }
        });

        // Debug: Weather controls
        this.input.keyboard!.on('keydown-ONE', () => this.weatherSystem.setWeather(WeatherType.NONE));
        this.input.keyboard!.on('keydown-TWO', () => this.weatherSystem.setWeather(WeatherType.RAIN));
        this.input.keyboard!.on('keydown-THREE', () => this.weatherSystem.setWeather(WeatherType.SNOW));
        this.input.keyboard!.on('keydown-FOUR', () => this.weatherSystem.setWeather(WeatherType.CHERRY_BLOSSOM));

        // Debug: Switch Maps
        this.input.keyboard!.on('keydown-NINE', () => {
            console.log('🔄 Switching to Route 2...');
            this.scene.restart({ mapKey: 'route2', backgroundKey: 'route2_bg' });
        });
        this.input.keyboard!.on('keydown-ZERO', () => {
            console.log('🔄 Switching to Main Map...');
            this.scene.restart({ mapKey: 'map', backgroundKey: 'background' });
        });
        this.input.keyboard!.on('keydown-EIGHT', () => {
            console.log('🔄 Switching to Secret Garden...');
            this.scene.restart({ mapKey: 'secret_garden', backgroundKey: 'forest-bg' });
        });
        this.input.keyboard!.on('keydown-SEVEN', () => {
            console.log('🔄 Switching to Mysterious Path...');
            this.scene.restart({ mapKey: 'mysterious_path', backgroundKey: 'mysterious_path_bg' });
        });

        // System Menu
        this.input.keyboard!.on('keydown-ESC', () => this.openSystemMenu());
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
        // 1. Check if player is in a danger zone
        let isInDangerZone = false;
        const playerBounds = this.player.sprite.getBounds();

        for (const zone of this.encounterZones) {
            if (Phaser.Geom.Rectangle.Overlaps(playerBounds, zone.getBounds())) {
                isInDangerZone = true;
                break;
            }
        }

        // 2. If safe, return immediately (no battle)
        if (!isInDangerZone) return;

        // 3. If in danger, roll dice (Lower chance slightly to 0.08 for better pacing)
        if (Math.random() < 0.08) {
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

        // Show reaction
        this.showReaction(this.player.sprite.x, this.player.sprite.y - 40, 'question');

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

        // Show love reaction on partner
        if (this.partner) {
            this.showReaction(this.partner.sprite.x, this.partner.sprite.y - 40, 'love');
        }

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

        // Show alert reaction!
        this.showReaction(this.player.sprite.x, this.player.sprite.y - 40, 'alert');

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
                this.scene.sleep('HudOverlay'); // Hide HUD during battle
                this.scene.launch('BattleScene', battleData);
                console.log('😴 WorldScene sleeping, launching BattleScene');
            });
        });
    }

    private openMemoryAlbum(): void {
        if (this.isTransitioning || this.isInDialogue) return;

        console.log('📖 Opening NancyDex...');
        this.scene.pause();
        this.scene.pause('HudOverlay');
        this.scene.launch('MemoryAlbumScene');
    }

    private openJournal(): void {
        if (this.isTransitioning || this.isInDialogue) return;

        console.log('📓 Opening Journal...');
        this.scene.pause();
        this.scene.pause('HudOverlay');
        this.scene.launch('JournalScene');
    }

    private openBag(): void {
        if (this.isTransitioning || this.isInDialogue) return;

        console.log('🎒 Opening Bag...');
        this.scene.pause();
        this.scene.pause('HudOverlay');
        this.scene.launch('BagScene');
    }

    private openSystemMenu(): void {
        if (this.isTransitioning || this.isInDialogue) return;

        console.log('⚙️ Opening System Menu...');
        this.scene.pause();
        this.scene.pause('HudOverlay');
        this.scene.launch('SystemMenuScene');
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
            `Tile: (${this.player.tileX}, ${this.player.tileY})`,
            `World: (${playerWorldX}, ${playerWorldY})`,
            `Dir: ${Direction[this.player.currentDirection]}${touchDir ? ` (touch: ${touchDir})` : ''}`,
            `Map: ${this.mapWidth}x${this.mapHeight} (${this.currentMapKey})`,
            `[SPACE/A] Talk | [B] Battle | [M] Dex | [J] Journal | [I] Bag`,
            `Weather: [1-4] | Map: [9]Route2 [0]Main`
        ].join('\n'));
    }
    private showReaction(x: number, y: number, type: ReactionType): void {
        new ReactionBubble(this, x, y, type);
    }
}
