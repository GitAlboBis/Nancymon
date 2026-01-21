/**
 * MemoriesData.ts
 * Data structures and definitions for collectible Memory items
 * Memories are special collectibles that represent romantic moments
 */

/**
 * Interface for a collectible Memory item
 */
export interface MemoryItem {
    /** Unique identifier for the memory */
    id: string;
    /** Display name shown in UI */
    name: string;
    /** Path to the pixel art icon sprite */
    pixelSpritePath: string;
    /** Romantic description text */
    description: string;
    /** Optional: emoji icon for quick display */
    emoji?: string;
}

/**
 * All collectible memories in the game
 */
export const AllMemories: MemoryItem[] = [
    {
        id: 'paris_trip',
        name: 'Paris Trip',
        pixelSpritePath: '/assets/memories/paris.png',
        description: 'Our first trip together. The Eiffel Tower sparkled just for us.',
        emoji: '🗼'
    },
    {
        id: 'first_kiss',
        name: 'First Kiss',
        pixelSpritePath: '/assets/memories/kiss.png',
        description: 'That magical moment when time stopped and our hearts aligned.',
        emoji: '💋'
    },
    {
        id: 'pizza_night',
        name: 'Pizza Night',
        pixelSpritePath: '/assets/memories/pizza.png',
        description: 'Burnt pizza, wrong toppings, but the best dinner ever because we were together.',
        emoji: '🍕'
    },
    {
        id: 'stargazing',
        name: 'Stargazing',
        pixelSpritePath: '/assets/memories/stars.png',
        description: 'Lying on the grass, counting stars, making wishes that already came true.',
        emoji: '⭐'
    },
    {
        id: 'rainy_day',
        name: 'Rainy Day',
        pixelSpritePath: '/assets/memories/rain.png',
        description: 'Dancing in the rain without an umbrella. Your laughter was my sunshine.',
        emoji: '🌧️'
    },
    {
        id: 'movie_marathon',
        name: 'Movie Marathon',
        pixelSpritePath: '/assets/memories/movie.png',
        description: 'Three movies, two pizzas, one blanket. Perfect Saturday.',
        emoji: '🎬'
    }
];

/**
 * Get a memory by its ID
 */
export function getMemoryById(id: string): MemoryItem | undefined {
    return AllMemories.find(memory => memory.id === id);
}

/**
 * Get all memories (for UI lists)
 */
export function getAllMemories(): MemoryItem[] {
    return AllMemories;
}
