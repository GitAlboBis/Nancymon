import Phaser from 'phaser';
import { Direction, TILE_SIZE } from '../config/GameConfig';
import { SPRITE_CONFIG } from '../config/AssetConfig';

/**
 * Configuration for creating an NPC
 */
export interface NPCConfig {
    id: string;
    name: string;
    tileX: number;
    tileY: number;
    sprite: string;
    dialogue: string[];
    direction?: Direction | keyof typeof Direction;
    behavior?: 'stationary' | 'patrol' | 'random';
}

/**
 * NPC Entity
 * Non-player character with dialogue capability
 */
export class NPC {
    public sprite: Phaser.GameObjects.Sprite;
    public tileX: number;
    public tileY: number;
    public currentDirection: Direction;
    public readonly id: string;
    public readonly name: string;
    public readonly dialogue: string[];

    protected scene: Phaser.Scene;
    private behavior: 'stationary' | 'patrol' | 'random';

    constructor(scene: Phaser.Scene, config: NPCConfig) {
        this.scene = scene;
        this.id = config.id;
        this.name = config.name;
        this.tileX = config.tileX;
        this.tileY = config.tileY;
        this.dialogue = config.dialogue;
        this.behavior = config.behavior || 'stationary';

        // Parse direction
        if (typeof config.direction === 'string') {
            this.currentDirection = Direction[config.direction as keyof typeof Direction] ?? Direction.DOWN;
        } else {
            this.currentDirection = config.direction ?? Direction.DOWN;
        }

        // Calculate pixel position
        const pixelX = this.tileToPixelX(this.tileX);
        const pixelY = this.tileToPixelY(this.tileY);

        // Create sprite
        this.sprite = scene.add.sprite(pixelX, pixelY, config.sprite);
        this.sprite.setOrigin(0.5, 1);
        this.sprite.setDepth(pixelY);

        // Create animations if they don't exist
        this.createAnimations(config.sprite);

        // Play idle animation
        this.playIdleAnimation();
    }

    /**
     * Creates idle animations for the NPC
     */
    private createAnimations(spriteKey: string): void {
        const directions = ['down', 'left', 'right', 'up'];

        directions.forEach((dir, index) => {
            const baseFrame = index * SPRITE_CONFIG.FRAMES_PER_DIRECTION;
            const animKey = `${spriteKey}-idle-${dir}`;

            if (!this.scene.anims.exists(animKey)) {
                this.scene.anims.create({
                    key: animKey,
                    frames: [{ key: spriteKey, frame: baseFrame }],
                    frameRate: 1,
                    repeat: 0
                });
            }
        });
    }

    /**
     * Converts tile X to pixel X
     */
    private tileToPixelX(tileX: number): number {
        return tileX * TILE_SIZE + TILE_SIZE / 2;
    }

    /**
     * Converts tile Y to pixel Y
     */
    private tileToPixelY(tileY: number): number {
        return tileY * TILE_SIZE + TILE_SIZE;
    }

    /**
     * Gets direction name for animations
     */
    private getDirectionName(): string {
        const names = ['down', 'left', 'right', 'up'];
        return names[this.currentDirection];
    }

    /**
     * Plays the idle animation for current direction
     */
    private playIdleAnimation(): void {
        const spriteKey = this.sprite.texture.key;
        const dirName = this.getDirectionName();
        const animKey = `${spriteKey}-idle-${dirName}`;

        if (this.scene.anims.exists(animKey)) {
            this.sprite.play(animKey, true);
        }
    }

    /**
     * Turns to face a specific direction
     */
    public face(direction: Direction): void {
        this.currentDirection = direction;
        this.playIdleAnimation();
    }

    /**
     * Turns to face the player
     */
    public facePlayer(playerTileX: number, playerTileY: number): void {
        const dx = playerTileX - this.tileX;
        const dy = playerTileY - this.tileY;

        if (Math.abs(dx) > Math.abs(dy)) {
            this.face(dx > 0 ? Direction.RIGHT : Direction.LEFT);
        } else {
            this.face(dy > 0 ? Direction.DOWN : Direction.UP);
        }
    }

    /**
     * Checks if this NPC is at a specific tile position
     */
    public isAtTile(tileX: number, tileY: number): boolean {
        return this.tileX === tileX && this.tileY === tileY;
    }

    /**
     * Gets the tile position in front of this NPC based on their facing direction
     */
    public getTileInFront(): { x: number; y: number } {
        const vectors = {
            [Direction.DOWN]: { x: 0, y: 1 },
            [Direction.UP]: { x: 0, y: -1 },
            [Direction.LEFT]: { x: -1, y: 0 },
            [Direction.RIGHT]: { x: 1, y: 0 }
        };
        const vec = vectors[this.currentDirection];
        return {
            x: this.tileX + vec.x,
            y: this.tileY + vec.y
        };
    }

    /**
     * Updates NPC (for behaviors like patrol/random movement)
     */
    public update(_time: number, _delta: number): void {
        // Future: implement patrol and random movement behaviors
        if (this.behavior === 'patrol') {
            // Patrol logic
        } else if (this.behavior === 'random') {
            // Random movement logic
        }
    }

    /**
     * Destroys the NPC sprite
     */
    public destroy(): void {
        this.sprite.destroy();
    }
}
