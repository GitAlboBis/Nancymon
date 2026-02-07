import Phaser from 'phaser';
import {
    Direction,
    DIRECTION_VECTORS,
    TILE_SIZE,
    PLAYER_MOVE_DURATION
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
     * Animations are now created in PreloaderScene
     */
    private createAnimations(): void {
        // Skip animation creation - they're created in PreloaderScene
        // This keeps the same pattern as the partner sprite
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
     * Uses animations created in PreloaderScene
     */
    private playWalkAnimation(): void {
        const dirName = this.getDirectionName(this.currentDirection);
        this.sprite.play(`player-${dirName}`, true);
    }

    /**
     * Plays the idle animation for current direction
     * Shows first frame of each direction
     */
    private playIdleAnimation(): void {
        const dirName = this.getDirectionName(this.currentDirection);
        // Show first frame of each direction
        const frameMap = { down: 0, left: 4, right: 8, up: 12 };
        this.sprite.stop();
        this.sprite.setFrame(frameMap[dirName as keyof typeof frameMap]);
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
