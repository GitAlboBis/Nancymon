export const ASSETS = {
    TILEMAP_JSON: 'assets/map.tmj',
    TILESET_IMAGE: 'assets/tilesets/tileset.png',
    TILESET_NAME: 'tileset',

    PLAYER_SPRITE: 'assets/sprites/player.png',
    PARTNER_SPRITE: 'assets/sprites/boyfriend.png',
    NPC_SPRITE: 'assets/sprites/npc.png',

    DIALOGUE_BOX: 'assets/ui/dialogue_box.png',

    USE_PLACEHOLDERS: true,
    USE_PROCEDURAL_MAP: true
};

export const SPRITE_CONFIG = {
    FRAME_WIDTH: 16,
    FRAME_HEIGHT: 24,
    FRAMES_PER_DIRECTION: 4,
    DIRECTIONS: 4,
    DIRECTION_FRAMES: {
        DOWN: { start: 0, end: 3 },
        LEFT: { start: 4, end: 7 },
        RIGHT: { start: 8, end: 11 },
        UP: { start: 12, end: 15 }
    }
};

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
