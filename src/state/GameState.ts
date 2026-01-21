/**
 * GameState.ts
 * Global game state management for persistent data across scenes
 */

import { getMemoryById, MemoryItem } from '../data/MemoriesData';

/**
 * Global game state singleton
 * Tracks player progress, collected items, and game flags
 */
class GameStateManager {
    private static instance: GameStateManager;

    // ============================================================================
    // COLLECTED MEMORIES
    // ============================================================================

    /** Array of collected memory IDs */
    private collectedMemories: string[] = [];

    /**
     * Check if a memory has been collected
     */
    hasCollected(id: string): boolean {
        return this.collectedMemories.includes(id);
    }

    /**
     * Collect a new memory
     * Returns true if newly collected, false if already had it
     */
    collectMemory(id: string): boolean {
        if (this.hasCollected(id)) {
            return false;
        }
        this.collectedMemories.push(id);
        console.log(`💕 Memory collected: ${id}`);
        return true;
    }

    /**
     * Get all collected memory IDs
     */
    getCollectedMemoryIds(): string[] {
        return [...this.collectedMemories];
    }

    /**
     * Get all collected memories as MemoryItem objects
     */
    getCollectedMemories(): MemoryItem[] {
        return this.collectedMemories
            .map(id => getMemoryById(id))
            .filter((m): m is MemoryItem => m !== undefined);
    }

    /**
     * Get the count of collected memories
     */
    getCollectedCount(): number {
        return this.collectedMemories.length;
    }

    // ============================================================================
    // PLAYER STATS
    // ============================================================================

    /** Current player vibe (health) */
    playerVibe: number = 100;

    /** Maximum player vibe */
    maxPlayerVibe: number = 100;

    // ============================================================================
    // GAME FLAGS
    // ============================================================================

    /** Story progress flags */
    private flags: Map<string, boolean> = new Map();

    /**
     * Set a game flag
     */
    setFlag(flag: string, value: boolean = true): void {
        this.flags.set(flag, value);
    }

    /**
     * Check if a flag is set
     */
    hasFlag(flag: string): boolean {
        return this.flags.get(flag) ?? false;
    }

    // ============================================================================
    // SINGLETON & PERSISTENCE
    // ============================================================================

    /**
     * Get the singleton instance
     */
    static getInstance(): GameStateManager {
        if (!GameStateManager.instance) {
            GameStateManager.instance = new GameStateManager();
        }
        return GameStateManager.instance;
    }

    /**
     * Reset all game state (for new game)
     */
    reset(): void {
        this.collectedMemories = [];
        this.playerVibe = 100;
        this.maxPlayerVibe = 100;
        this.flags.clear();
        console.log('🔄 Game state reset');
    }

    /**
     * Export state for saving
     */
    exportState(): object {
        return {
            collectedMemories: this.collectedMemories,
            playerVibe: this.playerVibe,
            maxPlayerVibe: this.maxPlayerVibe,
            flags: Object.fromEntries(this.flags)
        };
    }

    /**
     * Import state from save data
     */
    importState(data: {
        collectedMemories?: string[];
        playerVibe?: number;
        maxPlayerVibe?: number;
        flags?: Record<string, boolean>;
    }): void {
        if (data.collectedMemories) {
            this.collectedMemories = data.collectedMemories;
        }
        if (data.playerVibe !== undefined) {
            this.playerVibe = data.playerVibe;
        }
        if (data.maxPlayerVibe !== undefined) {
            this.maxPlayerVibe = data.maxPlayerVibe;
        }
        if (data.flags) {
            this.flags = new Map(Object.entries(data.flags));
        }
        console.log('📂 Game state loaded');
    }
}

// Export singleton instance
export const GameState = GameStateManager.getInstance();

// Export class for type checking
export { GameStateManager };
