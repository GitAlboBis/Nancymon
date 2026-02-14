import Phaser from 'phaser';
import { NPC, NPCConfig } from './NPC';
import { GameState } from '../state/GameState';
import { ReactionBubble } from '../ui/ReactionBubble';
import { Direction } from '../config/GameConfig';

export class BaristaNPC extends NPC {
    constructor(scene: Phaser.Scene, tileX: number, tileY: number) {
        const config: NPCConfig = {
            id: 'barista',
            name: 'Barista',
            tileX: tileX,
            tileY: tileY,
            sprite: 'barista',
            dialogue: [], // Logic handled in interact()
            direction: Direction.DOWN, // Facing the counter/player
            behavior: 'stationary'
        };

        super(scene, config);

        // Ensure idle animation plays
        // The base NPC class calls playIdleAnimation() in constructor, 
        // but we might need to override createAnimations if the sprite sheet is different
        // or just rely on the base class if the sprite sheet follows the standard order.
        // If 'barista' sprite is 32x32 standard, it likely has 3 frames per dir or similar.
        // Base NPC assumes `FRAMES_PER_DIRECTION` (which is likely 3 or 4 based on Config).
        // Let's assume the base NPC logic works for now.
    }

    public interact(dialogueBox?: any): void {
        const db = dialogueBox || (this.scene as any).dialogueBox;

        // 1. Dialogue
        if (db) {
            // Signal start of dialogue - try to fit existing pattern if any
            if (typeof (this.scene as any).setIsInDialogue === 'function') {
                (this.scene as any).setIsInDialogue(true);
            } else {
                (this.scene as any).isInDialogue = true;
            }

            db.show(this.name, [
                "Benvenuta al Cafè! Vuoi un caffè speciale per recuperare le energie? ☕"
            ], () => {
                if (typeof (this.scene as any).setIsInDialogue === 'function') {
                    (this.scene as any).setIsInDialogue(false);
                } else {
                    (this.scene as any).isInDialogue = false;
                }
                this.performHealing();
            });
        } else {
            // Fallback if no dialogue box (shouldn't happen in CafeScene)
            this.performHealing();
        }
    }

    private performHealing(): void {
        // 2. Heal
        GameState.playerVibe = GameState.maxPlayerVibe;

        // 3. Visual Feedback
        // Heart Bubble
        new ReactionBubble(this.scene, this.sprite.x, this.sprite.y - 20, 'love');

        // Floating Text
        const floatingText = this.scene.add.text(this.sprite.x, this.sprite.y - 40, '+ VIBE RESTORED!', {
            font: 'bold 12px Arial',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Animate floating text
        this.scene.tweens.add({
            targets: floatingText,
            y: floatingText.y - 30,
            alpha: 0,
            duration: 1500,
            ease: 'Power1',
            onComplete: () => {
                floatingText.destroy();
            }
        });
    }
}
