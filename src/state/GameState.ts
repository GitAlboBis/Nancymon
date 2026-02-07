/**
 * GameState.ts
 * Global game state management for persistent data across scenes
 */

import { getMemoryById, MemoryItem } from '../data/MemoriesData';
import { GardenPlot } from '../data/GardenData';

/**
 * Global game state singleton
 * Tracks player progress, collected items, and game flags
 */
class GameStateManager {
    private static instance: GameStateManager;

    // ============================================================================
    // GARDEN
    // ============================================================================

    /** 6 Garden Plots */
    private gardenPlots: GardenPlot[] = [
        { index: 0, plantId: null, growthStage: 'empty', growthProgress: 0, waterLevel: 0, isWithered: false },
        { index: 1, plantId: null, growthStage: 'empty', growthProgress: 0, waterLevel: 0, isWithered: false },
        { index: 2, plantId: null, growthStage: 'empty', growthProgress: 0, waterLevel: 0, isWithered: false },
        { index: 3, plantId: null, growthStage: 'empty', growthProgress: 0, waterLevel: 0, isWithered: false },
        { index: 4, plantId: null, growthStage: 'empty', growthProgress: 0, waterLevel: 0, isWithered: false },
        { index: 5, plantId: null, growthStage: 'empty', growthProgress: 0, waterLevel: 0, isWithered: false }
    ];

    public getGardenPlots(): GardenPlot[] {
        return this.gardenPlots;
    }

    public getPlot(index: number): GardenPlot | undefined {
        return this.gardenPlots[index];
    }

    public updatePlot(index: number, updates: Partial<GardenPlot>): void {
        if (this.gardenPlots[index]) {
            this.gardenPlots[index] = { ...this.gardenPlots[index], ...updates };
        }
    }

    // ============================================================================
    // COLLECTED MEMORIES
    // ============================================================================

    /** Array of collected memory IDs */
    private collectedMemories: string[] = [];

    // ============================================================================
    // INVENTORY
    // ============================================================================

    /** Inventory mapping ItemID -> Count */
    private inventory: Map<string, number> = new Map();

    /**
     * Add item to inventory
     */
    addItem(id: string, count: number = 1): void {
        const current = this.inventory.get(id) || 0;
        this.inventory.set(id, current + count);
        console.log(`🎒 Added ${count}x ${id}. Total: ${current + count}`);
    }

    /**
     * Remove/Use item from inventory
     * Returns true if successful, false if not enough
     */
    useItem(id: string, count: number = 1): boolean {
        const current = this.inventory.get(id) || 0;
        if (current < count) return false;

        const newValue = current - count;
        if (newValue === 0) {
            this.inventory.delete(id);
        } else {
            this.inventory.set(id, newValue);
        }
        return true;
    }

    /**
     * Get item count
     */
    getItemCount(id: string): number {
        return this.inventory.get(id) || 0;
    }

    /**
     * Get entire inventory as list of {id, count}
     */
    getInventoryItems(): { id: string; count: number }[] {
        return Array.from(this.inventory.entries()).map(([id, count]) => ({ id, count }));
    }

    /**
     * Initialize starter items (debug/first play)
     */
    giveStarterItems(): void {
        if (this.inventory.size === 0) {
            this.addItem('chocolate', 3);
            this.addItem('flower', 2);
            // Give some seeds to start
            this.addItem('seed_rose', 2);
            this.addItem('seed_sunflower', 2);
        }
    }

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
    // QUESTS
    // ============================================================================

    activeQuestId: string | null = 'q1_start';
    completedQuestIds: string[] = [];
    completedObjectives: string[] = []; // Format: "questId:objectiveIndex"

    startQuest(id: string): void {
        if (this.completedQuestIds.includes(id)) return;

        this.activeQuestId = id;
        console.log(`📜 Quest Started: ${id}`);
    }

    completeQuest(id: string): void {
        if (this.activeQuestId === id) {
            this.activeQuestId = null;
        }
        if (!this.completedQuestIds.includes(id)) {
            this.completedQuestIds.push(id);
            console.log(`✅ Quest Completed: ${id}`);
        }
    }

    /**
     * Complete a specific objective for a quest
     */
    completeObjective(questId: string, objectiveIndex: number): boolean {
        const key = `${questId}:${objectiveIndex}`;
        if (!this.completedObjectives.includes(key)) {
            this.completedObjectives.push(key);
            console.log(`🎯 Objective Completed: ${key}`);
            return true;
        }
        return false;
    }

    /**
     * Check if an objective is completed
     */
    isObjectiveCompleted(questId: string, objectiveIndex: number): boolean {
        return this.completedObjectives.includes(`${questId}:${objectiveIndex}`);
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
        this.inventory.clear();
        this.activeQuestId = 'q1_start';
        this.completedQuestIds = [];
        this.completedObjectives = [];
        this.gardenPlots = this.gardenPlots.map((p, i) => ({
            index: i, plantId: null, growthStage: 'empty', growthProgress: 0, waterLevel: 0, isWithered: false
        }));
        this.giveStarterItems();
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
            flags: Object.fromEntries(this.flags),
            inventory: Object.fromEntries(this.inventory),
            activeQuestId: this.activeQuestId,
            completedQuestIds: this.completedQuestIds,
            completedObjectives: this.completedObjectives,
            gardenPlots: this.gardenPlots
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
        inventory?: Record<string, number>;
        activeQuestId?: string | null;
        completedQuestIds?: string[];
        completedObjectives?: string[];
        gardenPlots?: GardenPlot[];
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
        if (data.inventory) {
            this.inventory = new Map(Object.entries(data.inventory));
        } else {
            this.giveStarterItems();
        }
        if (data.activeQuestId !== undefined) {
            this.activeQuestId = data.activeQuestId;
        }
        if (data.completedQuestIds) {
            this.completedQuestIds = data.completedQuestIds;
        }
        if (data.completedObjectives) {
            this.completedObjectives = data.completedObjectives;
        }
        if (data.gardenPlots) {
            this.gardenPlots = data.gardenPlots;
        }
        console.log('📂 Game state loaded');
    }

    /**
     * SAVE GAME to LocalStorage
     */
    saveGame(): void {
        const data = this.exportState();
        try {
            localStorage.setItem('nancymon_save', JSON.stringify(data));
            console.log('💾 GAME SAVED');
        } catch (e) {
            console.error('Failed to save game:', e);
        }
    }

    /**
     * LOAD GAME from LocalStorage
     */
    loadGame(): boolean {
        try {
            const json = localStorage.getItem('nancymon_save');
            if (json) {
                const data = JSON.parse(json);
                this.importState(data);
                return true;
            }
        } catch (e) {
            console.error('Failed to load game:', e);
        }
        return false;
    }

    /**
     * Check if a save file exists
     */
    hasSaveFile(): boolean {
        return localStorage.getItem('nancymon_save') !== null;
    }
}

// Export singleton instance
export const GameState = GameStateManager.getInstance();

// Export class for type checking
export { GameStateManager };
