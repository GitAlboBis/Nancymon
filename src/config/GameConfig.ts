/**
 * Game Configuration Constants
 * Central location for all game settings
 */

// Grid and Movement
export const TILE_SIZE = 16; // Pixels per grid tile
export const PLAYER_MOVE_DURATION = 150; // Milliseconds per tile movement

// Map Dimensions (in tiles)
export const MAP_WIDTH_TILES = 30;
export const MAP_HEIGHT_TILES = 20;
export const MAP_WIDTH = MAP_WIDTH_TILES * TILE_SIZE;
export const MAP_HEIGHT = MAP_HEIGHT_TILES * TILE_SIZE;

// Game Display
export const GAME_WIDTH = 480; // 30 tiles * 16px (GBA-style resolution)
export const GAME_HEIGHT = 320; // 20 tiles * 16px

// Player Settings
export const PLAYER_WIDTH = 16;
export const PLAYER_HEIGHT = 24; // Slightly taller than tile for depth

// Animation
export const WALK_FRAME_RATE = 10;
export const IDLE_FRAME_RATE = 1;

// Directions
export enum Direction {
    DOWN = 0,
    LEFT = 1,
    RIGHT = 2,
    UP = 3
}

// Direction Vectors for movement calculation
export const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
    [Direction.DOWN]: { x: 0, y: 1 },
    [Direction.LEFT]: { x: -1, y: 0 },
    [Direction.RIGHT]: { x: 1, y: 0 },
    [Direction.UP]: { x: 0, y: -1 }
};

// Color palette for placeholder graphics
export const COLORS = {
    PLAYER: 0x4a90d9,      // Blue
    PLAYER_FACE: 0xffcc99, // Skin tone for direction indicator
    GRASS: 0x5a8a3a,       // Dark green
    GRASS_LIGHT: 0x7ab35a, // Light green
    PATH: 0xd4a574,        // Sandy brown
    WATER: 0x4a90d9,       // Blue
    TREE: 0x2d5a1a         // Dark forest green
};
