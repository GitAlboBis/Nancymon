/**
 * AssetConfig.ts
 * Centralized asset path configuration for easy sprite swapping
 * 
 * To use your own sprites:
 * 1. Place your sprite files in public/assets/
 * 2. Update the paths below
 * 3. Set USE_PLACEHOLDERS to false
 * 
 * Sprite Format Requirements:
 * - Characters: 16x24 pixels per frame, 4 columns x 4 rows (Down, Left, Right, Up)
 * - Tilesets: 16x16 pixels per tile
 */

export const ASSETS = {
    // =========================================================================
    // TILEMAP ASSETS
    // =========================================================================

    /** Path to the Tiled JSON map file */
    TILEMAP_JSON: 'assets/map.tmj',

    /** Path to the tileset image */
    TILESET_IMAGE: 'assets/tilesets/tileset.png',

    /** Name of the tileset in Tiled (must match the JSON) */
    TILESET_NAME: 'tileset',

    // =========================================================================
    // CHARACTER SPRITES
    // =========================================================================

    /** Player character spritesheet */
    PLAYER_SPRITE: 'assets/sprites/player.png',

    /** Partner/Boyfriend character spritesheet */
    PARTNER_SPRITE: 'assets/sprites/boyfriend.png',

    /** Default NPC spritesheet */
    NPC_SPRITE: 'assets/sprites/npc.png',

    // =========================================================================
    // UI ASSETS
    // =========================================================================

    /** Dialogue box background */
    DIALOGUE_BOX: 'assets/ui/dialogue_box.png',

    // =========================================================================
    // SETTINGS
    // =========================================================================

    /**
     * When true, generate placeholder graphics instead of loading files.
     * Set to false when you have real sprite assets ready.
     */
    USE_PLACEHOLDERS: true,

    /**
     * When true, generate a procedural map instead of loading tilemap.
     * Set to false when you have a Tiled map ready.
     */
    USE_PROCEDURAL_MAP: true
};

/**
 * Sprite sheet configuration for character animations
 * All characters use the same frame layout
 */
export const SPRITE_CONFIG = {
    FRAME_WIDTH: 16,
    FRAME_HEIGHT: 24,
    FRAMES_PER_DIRECTION: 4,
    DIRECTIONS: 4,  // Down, Left, Right, Up

    // Frame indices for each direction (row * 4 + column)
    DIRECTION_FRAMES: {
        DOWN: { start: 0, end: 3 },
        LEFT: { start: 4, end: 7 },
        RIGHT: { start: 8, end: 11 },
        UP: { start: 12, end: 15 }
    }
};

/**
 * Tilemap layer names (must match your Tiled map)
 */
export const TILEMAP_LAYERS = {
    GROUND: 'Ground',
    DECORATIONS: 'Decorations',
    COLLISIONS: 'Collisions',
    ABOVE_PLAYER: 'AbovePlayer',
    OBJECTS: {
        NPCS: 'NPCs',
        WARPS: 'Warps',
        ENCOUNTERS: 'Encounters'
    }
};

/**
 * NPC definitions for the world
 * These can be overridden by tilemap object layers
 */
export const NPC_DATA = [
    {
        id: 'npc_friendly',
        name: 'Friendly Neighbor',
        tileX: 5,
        tileY: 5,
        sprite: 'npc',
        direction: 'DOWN',
        dialogue: [
            'Hello there! Welcome to our cozy little world! 💕',
            'The path ahead leads to the meadow.',
            'Be careful of the stress clouds in the tall grass!'
        ]
    },
    {
        id: 'npc_wise',
        name: 'Wise Elder',
        tileX: 20,
        tileY: 8,
        sprite: 'npc',
        direction: 'LEFT',
        dialogue: [
            'Ah, young one...',
            'Remember, love conquers all stress.',
            'A warm hug can defeat even the mightiest anxiety! 🤗'
        ]
    }
];
