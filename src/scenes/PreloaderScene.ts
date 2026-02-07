import Phaser from 'phaser';
import { COLORS, TILE_SIZE, PLAYER_WIDTH, PLAYER_HEIGHT } from '../config/GameConfig';

/**
 * PreloaderScene
 * Handles loading of all game assets and creates placeholder graphics
 */
export class PreloaderScene extends Phaser.Scene {
    private loadingBar!: Phaser.GameObjects.Graphics;
    private progressBar!: Phaser.GameObjects.Graphics;

    constructor() {
        super({ key: 'PreloaderScene' });
    }

    preload(): void {
        this.createLoadingBar();
        this.createPlaceholderAssets();

        // Load map assets
        this.load.image('title-bg', '/assets/title-bg.png');

        // Load map assets
        this.load.image('background', '/assets/background.png');
        this.load.image('battle-bg', '/assets/battle-bg.jpg');
        this.load.image('forest-bg', '/assets/forest_bg.png');
        this.load.image('route2_bg', '/assets/route2_bg.png');
        this.load.image('city-background', '/assets/city-background.png');
        this.load.image('cafe-interior', '/assets/cafe-interior.png');
        this.load.image('mysterious_path_bg', '/assets/mysterious_path.png');

        // Load map data (TMJ/JSON)
        this.load.tilemapTiledJSON('map', '/assets/map.tmj');
        this.load.tilemapTiledJSON('route2', '/assets/route2.tmj');
        this.load.tilemapTiledJSON('secret_garden', '/assets/secret_garden.tmj');
        this.load.tilemapTiledJSON('mysterious_path', '/assets/mysterious_path.tmj');
        this.load.tilemapTiledJSON('cafecity_map', '/assets/cafecity.tmj');
        this.load.tilemapTiledJSON('cafe_interior_map', '/assets/Cafe-Interior.tmj');

        // Load city and cafe backgrounds
        this.load.image('cafecity_bg', '/assets/cafecity_bg.png');
        this.load.image('cafe_interior_bg', '/assets/cafe_interior_bg.png');


        // Load player spritesheet (32x48 per frame, 16 frames total in 4x4 grid)
        this.load.spritesheet('player', '/assets/player.png', {
            frameWidth: 32,
            frameHeight: 48
        });

        // Load partner spritesheet (32x48 per frame)
        this.load.spritesheet('partner', '/assets/partner.png', {
            frameWidth: 32,
            frameHeight: 48
        });

        // Add error handler for failed loads
        this.load.on('loaderror', (fileObj: any) => {
            console.error('❌ Failed to load:', fileObj.key, 'from', fileObj.src);
        });

        // Loading progress events
        this.load.on('progress', (value: number) => {
            this.progressBar.clear();
            this.progressBar.fillStyle(0x4a90d9, 1);
            this.progressBar.fillRect(
                this.cameras.main.width / 4 + 5,
                this.cameras.main.height / 2 - 15,
                (this.cameras.main.width / 2 - 10) * value,
                30
            );
        });

        this.load.on('complete', () => {
            this.progressBar.destroy();
            this.loadingBar.destroy();
        });
    }

    create(): void {
        // Diagnostic logging for player texture
        if (this.textures.exists('player')) {
            const texture = this.textures.get('player');
            const source = texture.getSourceImage() as HTMLImageElement;
            console.log('🎮 Player texture loaded:', source.width, 'x', source.height);
            console.log('📐 Expected frames:', Math.floor(source.width / 32) * Math.floor(source.height / 48));
            console.log('✅ Player sprite sheet ready');
        } else {
            console.error('❌ Player texture NOT loaded! Using placeholder.');
            this.generatePlayerSpritesheet();
        }

        // Create partner animations
        if (this.textures.exists('partner')) {
            console.log('✅ Partner sprite sheet loaded');

            // Partner animations - down (frames 0-3)
            this.anims.create({
                key: 'partner-down',
                frames: this.anims.generateFrameNumbers('partner', { start: 0, end: 3 }),
                frameRate: 10,
                repeat: -1
            });

            // Partner animations - left (frames 4-7)
            this.anims.create({
                key: 'partner-left',
                frames: this.anims.generateFrameNumbers('partner', { start: 4, end: 7 }),
                frameRate: 10,
                repeat: -1
            });

            // Partner animations - right (frames 8-11)
            this.anims.create({
                key: 'partner-right',
                frames: this.anims.generateFrameNumbers('partner', { start: 8, end: 11 }),
                frameRate: 10,
                repeat: -1
            });

            // Partner animations - up (frames 12-15)
            this.anims.create({
                key: 'partner-up',
                frames: this.anims.generateFrameNumbers('partner', { start: 12, end: 15 }),
                frameRate: 10,
                repeat: -1
            });
        }

        // Create player animations
        if (this.textures.exists('player')) {
            console.log('✅ Creating player animations');

            // Player animations - down (frames 0-3)
            this.anims.create({
                key: 'player-down',
                frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
                frameRate: 10,
                repeat: -1
            });

            // Player animations - left (frames 4-7)
            this.anims.create({
                key: 'player-left',
                frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
                frameRate: 10,
                repeat: -1
            });

            // Player animations - right (frames 8-11)
            this.anims.create({
                key: 'player-right',
                frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
                frameRate: 10,
                repeat: -1
            });

            // Player animations - up (frames 12-15)
            this.anims.create({
                key: 'player-up',
                frames: this.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
                frameRate: 10,
                repeat: -1
            });
        }

        // Generate placeholder spritesheet textures (only if real sprites weren't loaded)
        if (!this.textures.exists('player')) {
            this.generatePlayerSpritesheet();
        }
        // this.generatePartnerSpritesheet(); // Using real asset now
        if (!this.textures.exists('partner')) {
            this.generatePartnerSpritesheet();
        }
        this.generateNPCSpritesheet();
        this.generateWorldTiles();
        this.generateWorldTiles();
        this.generateStressSprites();
        // this.generateCityAssets(); // Using real asset now

        // Transition to world scene
        // Transition to Title scene
        this.scene.start('TitleScene');
    }

    private createLoadingBar(): void {
        this.loadingBar = this.add.graphics();
        this.loadingBar.fillStyle(0x2d2d44, 1);
        this.loadingBar.fillRect(
            this.cameras.main.width / 4,
            this.cameras.main.height / 2 - 20,
            this.cameras.main.width / 2,
            40
        );

        this.progressBar = this.add.graphics();
    }

    /**
     * Creates placeholder assets when real spritesheets aren't available
     * The code is structured to easily replace with real assets later
     */
    private createPlaceholderAssets(): void {
        // Placeholder load - creates a small delay to show loading bar
        this.load.image('placeholder', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    }

    /**
     * Generates a placeholder player spritesheet
     * Layout: 4 columns (frames) x 4 rows (directions: Down, Left, Right, Up)
     */
    private generatePlayerSpritesheet(): void {
        const frameWidth = PLAYER_WIDTH;
        const frameHeight = PLAYER_HEIGHT;
        const framesPerDirection = 4;
        const directions = 4;

        const canvas = document.createElement('canvas');
        canvas.width = frameWidth * framesPerDirection;
        canvas.height = frameHeight * directions;
        const ctx = canvas.getContext('2d')!;

        // Direction indicators (small triangle showing facing direction)
        const directionOffsets = [
            { dx: 0, dy: 6 },   // Down
            { dx: -4, dy: 0 },  // Left
            { dx: 4, dy: 0 },   // Right
            { dx: 0, dy: -6 }   // Up
        ];

        for (let dir = 0; dir < directions; dir++) {
            for (let frame = 0; frame < framesPerDirection; frame++) {
                const x = frame * frameWidth;
                const y = dir * frameHeight;

                // Body (main rectangle)
                ctx.fillStyle = '#4a90d9';
                ctx.fillRect(x + 2, y + 8, frameWidth - 4, frameHeight - 10);

                // Head (circle-ish)
                ctx.fillStyle = '#ffcc99';
                ctx.beginPath();
                ctx.arc(x + frameWidth / 2, y + 6, 5, 0, Math.PI * 2);
                ctx.fill();

                // Direction indicator
                const offset = directionOffsets[dir];
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(
                    x + frameWidth / 2 + offset.dx,
                    y + 6 + offset.dy,
                    2,
                    0,
                    Math.PI * 2
                );
                ctx.fill();

                // Walking animation - leg movement
                if (frame === 1 || frame === 3) {
                    ctx.fillStyle = '#3a7ab9';
                    ctx.fillRect(x + 3, y + frameHeight - 4, 4, 4);
                } else if (frame === 2) {
                    ctx.fillStyle = '#3a7ab9';
                    ctx.fillRect(x + frameWidth - 7, y + frameHeight - 4, 4, 4);
                }
            }
        }

        // Add canvas texture and define spritesheet frames
        const texture = this.textures.addCanvas('player', canvas);
        if (texture) {
            // Add frames for spritesheet
            let frameIndex = 0;
            for (let dir = 0; dir < directions; dir++) {
                for (let frame = 0; frame < framesPerDirection; frame++) {
                    texture.add(
                        frameIndex,
                        0,
                        frame * frameWidth,
                        dir * frameHeight,
                        frameWidth,
                        frameHeight
                    );
                    frameIndex++;
                }
            }
        }
    }

    /**
     * Generates world tile textures for the placeholder map
     */
    private generateWorldTiles(): void {
        // Grass tile
        const grassCanvas = document.createElement('canvas');
        grassCanvas.width = TILE_SIZE;
        grassCanvas.height = TILE_SIZE;
        const grassCtx = grassCanvas.getContext('2d')!;

        grassCtx.fillStyle = `#${COLORS.GRASS.toString(16).padStart(6, '0')}`;
        grassCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

        // Add some texture variation
        grassCtx.fillStyle = `#${COLORS.GRASS_LIGHT.toString(16).padStart(6, '0')}`;
        for (let i = 0; i < 4; i++) {
            const px = Math.random() * TILE_SIZE;
            const py = Math.random() * TILE_SIZE;
            grassCtx.fillRect(px, py, 2, 2);
        }

        this.textures.addCanvas('grass', grassCanvas);

        // Path tile
        const pathCanvas = document.createElement('canvas');
        pathCanvas.width = TILE_SIZE;
        pathCanvas.height = TILE_SIZE;
        const pathCtx = pathCanvas.getContext('2d')!;

        pathCtx.fillStyle = `#${COLORS.PATH.toString(16).padStart(6, '0')}`;
        pathCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

        this.textures.addCanvas('path', pathCanvas);

        // Tree/obstacle tile
        const treeCanvas = document.createElement('canvas');
        treeCanvas.width = TILE_SIZE;
        treeCanvas.height = TILE_SIZE;
        const treeCtx = treeCanvas.getContext('2d')!;

        treeCtx.fillStyle = `#${COLORS.TREE.toString(16).padStart(6, '0')}`;
        treeCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        treeCtx.fillStyle = '#1a3a10';
        treeCtx.beginPath();
        treeCtx.arc(TILE_SIZE / 2, TILE_SIZE / 2, 6, 0, Math.PI * 2);
        treeCtx.fill();

        this.textures.addCanvas('tree', treeCanvas);
    }

    /**
     * Generates placeholder sprites for stress enemies
     * Each stress type has a distinct color/shape
     */
    private generateStressSprites(): void {
        const spriteSize = 32;

        // Stress type configurations
        const stressTypes = [
            { id: 'stress_work', color: '#ff6b6b', accentColor: '#cc5555', symbol: '📋' },
            { id: 'stress_anxiety', color: '#9966ff', accentColor: '#7744cc', symbol: '🌀' },
            { id: 'stress_loneliness', color: '#6688aa', accentColor: '#445566', symbol: '💔' },
            { id: 'stress_monday', color: '#4488ff', accentColor: '#3366cc', symbol: '😴' },
            { id: 'stress_social', color: '#ff9966', accentColor: '#cc7744', symbol: '😰' }
        ];

        stressTypes.forEach(({ id, color, accentColor }) => {
            const canvas = document.createElement('canvas');
            canvas.width = spriteSize;
            canvas.height = spriteSize;
            const ctx = canvas.getContext('2d')!;

            // Draw cloud-like blob shape
            ctx.fillStyle = color;

            // Main body (cloud shape using overlapping circles)
            ctx.beginPath();
            ctx.arc(spriteSize / 2, spriteSize / 2, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(spriteSize / 2 - 8, spriteSize / 2 + 2, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(spriteSize / 2 + 8, spriteSize / 2 + 2, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(spriteSize / 2, spriteSize / 2 - 6, 9, 0, Math.PI * 2);
            ctx.fill();

            // Accent shadow
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(spriteSize / 2, spriteSize / 2 + 6, 10, 0, Math.PI);
            ctx.fill();

            // Evil eyes
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(spriteSize / 2 - 5, spriteSize / 2 - 2, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(spriteSize / 2 + 5, spriteSize / 2 - 2, 4, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#330000';
            ctx.beginPath();
            ctx.arc(spriteSize / 2 - 4, spriteSize / 2 - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(spriteSize / 2 + 6, spriteSize / 2 - 2, 2, 0, Math.PI * 2);
            ctx.fill();

            // Frown
            ctx.strokeStyle = '#330000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(spriteSize / 2, spriteSize / 2 + 8, 5, 0.2 * Math.PI, 0.8 * Math.PI);
            ctx.stroke();

            this.textures.addCanvas(id, canvas);
        });
    }

    /**
     * Generates a placeholder partner/boyfriend spritesheet
     * Similar to player but with different colors (pink/romantic theme)
     */
    private generatePartnerSpritesheet(): void {
        const frameWidth = PLAYER_WIDTH;
        const frameHeight = PLAYER_HEIGHT;
        const framesPerDirection = 4;
        const directions = 4;

        const canvas = document.createElement('canvas');
        canvas.width = frameWidth * framesPerDirection;
        canvas.height = frameHeight * directions;
        const ctx = canvas.getContext('2d')!;

        // Direction indicators
        const directionOffsets = [
            { dx: 0, dy: 6 },   // Down
            { dx: -4, dy: 0 },  // Left
            { dx: 4, dy: 0 },   // Right
            { dx: 0, dy: -6 }   // Up
        ];

        for (let dir = 0; dir < directions; dir++) {
            for (let frame = 0; frame < framesPerDirection; frame++) {
                const x = frame * frameWidth;
                const y = dir * frameHeight;

                // Body (pink/romantic color for partner)
                ctx.fillStyle = '#ff6b9d';
                ctx.fillRect(x + 2, y + 8, frameWidth - 4, frameHeight - 10);

                // Head
                ctx.fillStyle = '#ffcc99';
                ctx.beginPath();
                ctx.arc(x + frameWidth / 2, y + 6, 5, 0, Math.PI * 2);
                ctx.fill();

                // Hair (darker pink)
                ctx.fillStyle = '#cc4477';
                ctx.beginPath();
                ctx.arc(x + frameWidth / 2, y + 4, 4, Math.PI, 0);
                ctx.fill();

                // Direction indicator
                const offset = directionOffsets[dir];
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(
                    x + frameWidth / 2 + offset.dx,
                    y + 6 + offset.dy,
                    2,
                    0,
                    Math.PI * 2
                );
                ctx.fill();

                // Walking animation - leg movement
                if (frame === 1 || frame === 3) {
                    ctx.fillStyle = '#cc5588';
                    ctx.fillRect(x + 3, y + frameHeight - 4, 4, 4);
                } else if (frame === 2) {
                    ctx.fillStyle = '#cc5588';
                    ctx.fillRect(x + frameWidth - 7, y + frameHeight - 4, 4, 4);
                }
            }
        }

        // Add canvas texture and define spritesheet frames
        const texture = this.textures.addCanvas('partner', canvas);
        if (texture) {
            let frameIndex = 0;
            for (let dir = 0; dir < directions; dir++) {
                for (let frame = 0; frame < framesPerDirection; frame++) {
                    texture.add(
                        frameIndex,
                        0,
                        frame * frameWidth,
                        dir * frameHeight,
                        frameWidth,
                        frameHeight
                    );
                    frameIndex++;
                }
            }
        }
    }

    /**
     * Generates a placeholder NPC spritesheet
     * Green colored to distinguish from player and partner
     */
    private generateNPCSpritesheet(): void {
        const frameWidth = PLAYER_WIDTH;
        const frameHeight = PLAYER_HEIGHT;
        const framesPerDirection = 4;
        const directions = 4;

        const canvas = document.createElement('canvas');
        canvas.width = frameWidth * framesPerDirection;
        canvas.height = frameHeight * directions;
        const ctx = canvas.getContext('2d')!;

        // Direction indicators
        const directionOffsets = [
            { dx: 0, dy: 6 },   // Down
            { dx: -4, dy: 0 },  // Left
            { dx: 4, dy: 0 },   // Right
            { dx: 0, dy: -6 }   // Up
        ];

        for (let dir = 0; dir < directions; dir++) {
            for (let frame = 0; frame < framesPerDirection; frame++) {
                const x = frame * frameWidth;
                const y = dir * frameHeight;

                // Body (green for NPC)
                ctx.fillStyle = '#6bbd6b';
                ctx.fillRect(x + 2, y + 8, frameWidth - 4, frameHeight - 10);

                // Head
                ctx.fillStyle = '#ffcc99';
                ctx.beginPath();
                ctx.arc(x + frameWidth / 2, y + 6, 5, 0, Math.PI * 2);
                ctx.fill();

                // Direction indicator
                const offset = directionOffsets[dir];
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(
                    x + frameWidth / 2 + offset.dx,
                    y + 6 + offset.dy,
                    2,
                    0,
                    Math.PI * 2
                );
                ctx.fill();

                // NPCs don't have walking animation for now (stationary)
                // Just show legs
                ctx.fillStyle = '#5aa55a';
                ctx.fillRect(x + 4, y + frameHeight - 4, 3, 4);
                ctx.fillRect(x + frameWidth - 7, y + frameHeight - 4, 3, 4);
            }
        }

        // Add canvas texture and define spritesheet frames
        const texture = this.textures.addCanvas('npc', canvas);
        if (texture) {
            let frameIndex = 0;
            for (let dir = 0; dir < directions; dir++) {
                for (let frame = 0; frame < framesPerDirection; frame++) {
                    texture.add(
                        frameIndex,
                        0,
                        frame * frameWidth,
                        dir * frameHeight,
                        frameWidth,
                        frameHeight
                    );
                    frameIndex++;
                }
            }
        }
    }

}
