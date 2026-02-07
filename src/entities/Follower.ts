import Phaser from 'phaser';
import { Direction, TILE_SIZE, PLAYER_MOVE_DURATION } from '../config/GameConfig';
import { SPRITE_CONFIG } from '../config/AssetConfig';

/**
 * Position record for the follower's path queue
 */
interface PositionRecord {
    tileX: number;
    tileY: number;
    direction: Direction;
}

/**
 * Follower Entity
 * A character that follows the player with a delay (like Pikachu in Pokémon Yellow)
 */
export class Follower {
    public sprite: Phaser.GameObjects.Sprite;
    public tileX: number;
    public tileY: number;
    public currentDirection: Direction = Direction.DOWN;
    public isMoving: boolean = false;

    private scene: Phaser.Scene;
    private spriteKey: string;
    private moveTween: Phaser.Tweens.Tween | null = null;

    // Path following
    private positionQueue: PositionRecord[] = [];
    private readonly FOLLOW_DISTANCE = 3; // Tiles behind player

    constructor(scene: Phaser.Scene, tileX: number, tileY: number, spriteKey: string = 'partner') {
        this.scene = scene;
        this.tileX = tileX;
        this.tileY = tileY;
        this.spriteKey = spriteKey;

        // Calculate pixel position
        const pixelX = this.tileToPixelX(tileX);
        const pixelY = this.tileToPixelY(tileY);

        // Create sprite
        this.sprite = scene.add.sprite(pixelX, pixelY, spriteKey);
        this.sprite.setOrigin(0.5, 1);
        this.sprite.setDepth(pixelY);

        // Create animations
        this.createAnimations();

        // Start idle
        this.playIdleAnimation();
    }

    /**
     * Creates all follower animations from the spritesheet
     * For 'partner' sprite, animations are created in PreloaderScene
     */
    private createAnimations(): void {
        // Skip animation creation for partner - they're created in PreloaderScene
        if (this.spriteKey === 'partner') {
            return;
        }

        const directions = ['down', 'left', 'right', 'up'];

        directions.forEach((dir, index) => {
            const baseFrame = index * SPRITE_CONFIG.FRAMES_PER_DIRECTION;

            // Walking animation
            const walkKey = `${this.spriteKey}-walk-${dir}`;
            if (!this.scene.anims.exists(walkKey)) {
                this.scene.anims.create({
                    key: walkKey,
                    frames: this.scene.anims.generateFrameNumbers(this.spriteKey, {
                        start: baseFrame,
                        end: baseFrame + 3
                    }),
                    frameRate: 10,
                    repeat: -1
                });
            }

            // Idle animation
            const idleKey = `${this.spriteKey}-idle-${dir}`;
            if (!this.scene.anims.exists(idleKey)) {
                this.scene.anims.create({
                    key: idleKey,
                    frames: [{ key: this.spriteKey, frame: baseFrame }],
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
     * Plays walking animation
     */
    private playWalkAnimation(): void {
        const dirName = this.getDirectionName();
        // Partner uses simpler animation keys (created in PreloaderScene)
        const animKey = this.spriteKey === 'partner'
            ? `${this.spriteKey}-${dirName}`
            : `${this.spriteKey}-walk-${dirName}`;
        this.sprite.play(animKey, true);
    }

    /**
     * Plays idle animation
     */
    private playIdleAnimation(): void {
        const dirName = this.getDirectionName();
        if (this.spriteKey === 'partner') {
            // Partner doesn't have separate idle animations, just show first frame
            const frameMap = { down: 0, left: 4, right: 8, up: 12 };
            this.sprite.stop();
            this.sprite.setFrame(frameMap[dirName as keyof typeof frameMap]);
        } else {
            this.sprite.play(`${this.spriteKey}-idle-${dirName}`, true);
        }
    }

    /**
     * Records a new position from the player's movement
     * Called by WorldScene whenever the player moves
     */
    public recordPlayerPosition(tileX: number, tileY: number, direction: Direction): void {
        this.positionQueue.push({ tileX, tileY, direction });

        // Start following if we have enough positions queued
        if (this.positionQueue.length > this.FOLLOW_DISTANCE && !this.isMoving) {
            this.followNext();
        }
    }

    /**
     * Moves to the next position in the queue
     */
    private followNext(): void {
        if (this.positionQueue.length === 0 || this.isMoving) {
            return;
        }

        // Only move if queue is long enough (maintain distance)
        if (this.positionQueue.length <= this.FOLLOW_DISTANCE) {
            return;
        }

        const target = this.positionQueue.shift()!;
        this.moveToTile(target.tileX, target.tileY, target.direction);
    }

    /**
     * Moves the follower to a specific tile
     */
    private moveToTile(targetX: number, targetY: number, direction: Direction): void {
        // Skip if already there
        if (targetX === this.tileX && targetY === this.tileY) {
            this.currentDirection = direction;
            this.playIdleAnimation();
            this.followNext();
            return;
        }

        this.isMoving = true;
        this.currentDirection = direction;

        const targetPixelX = this.tileToPixelX(targetX);
        const targetPixelY = this.tileToPixelY(targetY);

        this.playWalkAnimation();

        this.moveTween = this.scene.tweens.add({
            targets: this.sprite,
            x: targetPixelX,
            y: targetPixelY,
            duration: PLAYER_MOVE_DURATION,
            ease: 'Linear',
            onUpdate: () => {
                this.sprite.setDepth(this.sprite.y);
            },
            onComplete: () => {
                this.tileX = targetX;
                this.tileY = targetY;
                this.sprite.x = targetPixelX;
                this.sprite.y = targetPixelY;
                this.isMoving = false;
                this.moveTween = null;

                // Check for more positions to follow
                if (this.positionQueue.length > this.FOLLOW_DISTANCE) {
                    this.followNext();
                } else {
                    this.playIdleAnimation();
                }
            }
        });
    }

    /**
     * Teleports the follower to a position
     * Used for scene transitions or when follower gets too far
     */
    public teleport(tileX: number, tileY: number, direction?: Direction): void {
        // Stop any current movement
        if (this.moveTween) {
            this.moveTween.stop();
            this.moveTween = null;
        }
        this.isMoving = false;

        // Clear position queue
        this.positionQueue = [];

        // Update position
        this.tileX = tileX;
        this.tileY = tileY;
        this.sprite.x = this.tileToPixelX(tileX);
        this.sprite.y = this.tileToPixelY(tileY);
        this.sprite.setDepth(this.sprite.y);

        if (direction !== undefined) {
            this.currentDirection = direction;
        }

        this.playIdleAnimation();
    }

    /**
     * Teleports follower to be behind the player
     */
    public teleportBehindPlayer(playerTileX: number, playerTileY: number, playerDirection: Direction): void {
        // Calculate position behind player based on their direction
        const behindVectors = {
            [Direction.DOWN]: { x: 0, y: -1 },
            [Direction.UP]: { x: 0, y: 1 },
            [Direction.LEFT]: { x: 1, y: 0 },
            [Direction.RIGHT]: { x: -1, y: 0 }
        };

        const behind = behindVectors[playerDirection];
        this.teleport(
            playerTileX + behind.x,
            playerTileY + behind.y,
            playerDirection
        );
    }

    /**
     * Updates the follower each frame
     */
    public update(_time: number, _delta: number): void {
        // Continue following if there are positions queued
        if (!this.isMoving && this.positionQueue.length > this.FOLLOW_DISTANCE) {
            this.followNext();
        }
    }

    /**
     * Checks if follower is at a specific tile
     */
    public isAtTile(tileX: number, tileY: number): boolean {
        return this.tileX === tileX && this.tileY === tileY;
    }

    /**
     * Stops all movement
     */
    public stop(): void {
        if (this.moveTween) {
            this.moveTween.stop();
            this.moveTween = null;
        }
        this.isMoving = false;
        this.playIdleAnimation();
    }

    /**
     * Destroys the follower
     */
    public destroy(): void {
        if (this.moveTween) {
            this.moveTween.stop();
        }
        this.sprite.destroy();
    }
}
