import Phaser from 'phaser';
import {
    Direction,
    DIRECTION_VECTORS,
    TILE_SIZE,
    PLAYER_MOVE_DURATION,
    WALK_FRAME_RATE
} from '../config/GameConfig';

/**
 * Player Entity
 * Handles grid-based movement with smooth interpolation, animations, and state management
 * Designed after Pokémon Generation 3 movement system
 */
export class Player {
    public sprite: Phaser.GameObjects.Sprite;
    public tileX: number;
    public tileY: number;
    public currentDirection: Direction = Direction.DOWN;
    public isMoving: boolean = false;

    private scene: Phaser.Scene;
    private moveTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Phaser.Scene, tileX: number, tileY: number) {
        this.scene = scene;
        this.tileX = tileX;
        this.tileY = tileY;

        // Create sprite at tile position
        const pixelX = this.tileToPixelX(tileX);
        const pixelY = this.tileToPixelY(tileY);

        this.sprite = scene.add.sprite(pixelX, pixelY, 'player');
        this.sprite.setOrigin(0.5, 1); // Bottom center for depth sorting
        this.sprite.setDepth(pixelY); // Y-sorting for depth

        // Create animations
        this.createAnimations();

        // Start with idle down
        this.playIdleAnimation();
    }

    /**
     * Creates all player animations from the spritesheet
     * Non-standard layout:
     * - Frames 0-3: Walk Down (Front view)
     * - Frames 4-7: Walk Left (Side view)
     * - Walk Right: Use Left frames with flipX
     * - Walk Up: Reuse Down frames as placeholder
     */
    private createAnimations(): void {
        // Walk Down (frames 0-3)
        if (!this.scene.anims.exists('walk-down')) {
            this.scene.anims.create({
                key: 'walk-down',
                frames: this.scene.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
                frameRate: WALK_FRAME_RATE,
                repeat: -1
            });
        }

        // Idle Down (frame 0)
        if (!this.scene.anims.exists('idle-down')) {
            this.scene.anims.create({
                key: 'idle-down',
                frames: [{ key: 'player', frame: 0 }],
                frameRate: 1,
                repeat: 0
            });
        }

        // Walk Left (frames 4-7)
        if (!this.scene.anims.exists('walk-left')) {
            this.scene.anims.create({
                key: 'walk-left',
                frames: this.scene.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
                frameRate: WALK_FRAME_RATE,
                repeat: -1
            });
        }

        // Idle Left (frame 4)
        if (!this.scene.anims.exists('idle-left')) {
            this.scene.anims.create({
                key: 'idle-left',
                frames: [{ key: 'player', frame: 4 }],
                frameRate: 1,
                repeat: 0
            });
        }

        // Walk Right (reuse Left frames, will use flipX)
        if (!this.scene.anims.exists('walk-right')) {
            this.scene.anims.create({
                key: 'walk-right',
                frames: this.scene.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
                frameRate: WALK_FRAME_RATE,
                repeat: -1
            });
        }

        // Idle Right (frame 4, will use flipX)
        if (!this.scene.anims.exists('idle-right')) {
            this.scene.anims.create({
                key: 'idle-right',
                frames: [{ key: 'player', frame: 4 }],
                frameRate: 1,
                repeat: 0
            });
        }

        // Walk Up (reuse Down frames as placeholder)
        if (!this.scene.anims.exists('walk-up')) {
            this.scene.anims.create({
                key: 'walk-up',
                frames: this.scene.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
                frameRate: WALK_FRAME_RATE,
                repeat: -1
            });
        }

        // Idle Up (frame 0 as placeholder)
        if (!this.scene.anims.exists('idle-up')) {
            this.scene.anims.create({
                key: 'idle-up',
                frames: [{ key: 'player', frame: 0 }],
                frameRate: 1,
                repeat: 0
            });
        }
    }

    /**
     * Converts tile X coordinate to pixel X coordinate (center of tile)
     */
    private tileToPixelX(tileX: number): number {
        return tileX * TILE_SIZE + TILE_SIZE / 2;
    }

    /**
     * Converts tile Y coordinate to pixel Y coordinate (bottom of sprite on tile)
     */
    private tileToPixelY(tileY: number): number {
        return tileY * TILE_SIZE + TILE_SIZE;
    }

    /**
     * Gets the direction name for animation keys
     */
    private getDirectionName(direction: Direction): string {
        const names = ['down', 'left', 'right', 'up'];
        return names[direction];
    }

    /**
     * Calculates target tile position for a given direction
     */
    public getTargetPosition(direction: Direction): { x: number; y: number } {
        const vector = DIRECTION_VECTORS[direction];
        return {
            x: this.tileX + vector.x,
            y: this.tileY + vector.y
        };
    }

    /**
     * Moves the player in the specified direction
     * Uses tweens for smooth interpolation between tiles
     * @param direction Direction to move
     * @param onComplete Optional callback when movement finishes
     */
    public move(direction: Direction, onComplete?: () => void): void {
        if (this.isMoving) {
            return;
        }

        this.isMoving = true;
        this.currentDirection = direction;

        // Calculate target position
        const target = this.getTargetPosition(direction);
        const targetPixelX = this.tileToPixelX(target.x);
        const targetPixelY = this.tileToPixelY(target.y);

        // Play walking animation
        this.playWalkAnimation();

        // Create smooth movement tween
        this.moveTween = this.scene.tweens.add({
            targets: this.sprite,
            x: targetPixelX,
            y: targetPixelY,
            duration: PLAYER_MOVE_DURATION,
            ease: 'Linear',
            onUpdate: () => {
                // Update depth for Y-sorting during movement
                this.sprite.setDepth(this.sprite.y);
            },
            onComplete: () => {
                // Update tile position
                this.tileX = target.x;
                this.tileY = target.y;

                // Snap to exact pixel position (prevent floating point drift)
                this.sprite.x = targetPixelX;
                this.sprite.y = targetPixelY;

                // Check if key is still held for continuous movement
                this.isMoving = false;
                this.moveTween = null;

                // Return to idle animation
                this.playIdleAnimation();

                // Call the completion callback
                if (onComplete) {
                    onComplete();
                }
            }
        });
    }

    /**
     * Faces a direction without moving (used when blocked)
     */
    public face(direction: Direction): void {
        if (this.isMoving) {
            return;
        }

        this.currentDirection = direction;
        this.playIdleAnimation();
    }

    /**
     * Plays the walking animation for current direction
     * Handles flipX for right movement
     */
    private playWalkAnimation(): void {
        const dirName = this.getDirectionName(this.currentDirection);
        this.sprite.play(`walk-${dirName}`, true);

        // Handle flipX: flip for right, unflip for all others
        if (this.currentDirection === Direction.RIGHT) {
            this.sprite.setFlipX(true);
        } else {
            this.sprite.setFlipX(false);
        }
    }

    /**
     * Plays the idle animation for current direction
     * Handles flipX for right movement
     */
    private playIdleAnimation(): void {
        const dirName = this.getDirectionName(this.currentDirection);
        this.sprite.play(`idle-${dirName}`, true);

        // Handle flipX: flip for right, unflip for all others
        if (this.currentDirection === Direction.RIGHT) {
            this.sprite.setFlipX(true);
        } else {
            this.sprite.setFlipX(false);
        }
    }

    /**
     * Stops all movement immediately (for scene transitions, etc.)
     */
    public stopMovement(): void {
        if (this.moveTween) {
            this.moveTween.stop();
            this.moveTween = null;
        }
        this.isMoving = false;
        this.playIdleAnimation();

        // Snap to current tile
        this.sprite.x = this.tileToPixelX(this.tileX);
        this.sprite.y = this.tileToPixelY(this.tileY);
    }

    /**
     * Gets the world position of the player
     */
    public getWorldPosition(): { x: number; y: number } {
        return {
            x: this.sprite.x,
            y: this.sprite.y
        };
    }

    /**
     * Teleports player to a new tile position
     */
    public teleport(tileX: number, tileY: number, direction?: Direction): void {
        this.stopMovement();

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
}
