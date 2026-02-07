/**
 * Memories.ts
 * Data definitions for Memories (the game's "monsters") and Moves
 * Theme: Romantic/stress-relief - reducing stress through love and care
 */

import { StatusType, ActiveStatus } from '../battle/BattleStatus';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * A move/action that can be used in battle
 * Instead of "Attack", we use friendly actions like Hug, Joke, Kiss
 */
export interface Move {
    id: string;
    name: string;
    power: number;           // Effectiveness (damage to stress)
    description: string;     // Flavor text shown in text box
    emoji: string;           // Visual indicator
    type: 'comfort' | 'heal' | 'special';
    statusEffect?: StatusType; // Status applied to target
    statusChance?: number;     // 0.0 to 1.0
    selfStatus?: StatusType;   // Status applied to self
}

/**
 * A Memory - the player's emotional companion
 * Think of it as a Pokémon but representing positive memories/feelings
 */
export interface Memory {
    id: string;
    name: string;
    maxVibe: number;         // Max HP (called "Vibe" - emotional energy)
    currentVibe: number;     // Current HP
    sprite: string;          // Texture key for the sprite
    moves: Move[];           // Available moves
    description: string;     // Flavor text
    level: number;
    xp: number;              // Current XP
    xpToNextLevel: number;   // XP required for next level
    activeStatuses: ActiveStatus[];
}

/**
 * A Stress enemy - represents daily stressors to overcome
 */
export interface StressEnemy {
    id: string;
    name: string;
    maxStress: number;       // Max HP (stress level)
    currentStress: number;   // Current stress to reduce
    sprite: string;          // Texture key
    attackPower: number;     // Damage dealt to player's vibe
    attackName: string;      // Name of the attack
    attackDescription: string;
    level: number;
    vibeReward: number;      // Vibe restored on victory
    xpReward: number;        // XP gained on victory
    activeStatuses: ActiveStatus[];
}

/**
 * Battle state passed between scenes
 */
export interface BattleData {
    enemy: StressEnemy;
    playerMemory: Memory;
    returnPosition: { x: number; y: number };
}

// ============================================================================
// PREDEFINED MOVES
// ============================================================================

export const MOVES: Record<string, Move> = {
    hug: {
        id: 'hug',
        name: 'Warm Hug',
        power: 15,
        description: 'You gave {enemy} a warm, comforting hug!',
        emoji: '🤗',
        type: 'comfort',
        statusEffect: 'BLUSHING',
        statusChance: 0.3
    },
    joke: {
        id: 'joke',
        name: 'Inside Joke',
        power: 20,
        description: 'You shared a silly joke! {enemy} can\'t help but smile.',
        emoji: '😄',
        type: 'comfort',
        statusEffect: 'LAUGHING',
        statusChance: 0.4
    },
    kiss: {
        id: 'kiss',
        name: 'Sweet Kiss',
        power: 30,
        description: 'A gentle kiss melts away the tension...',
        emoji: '💋',
        type: 'comfort',
        statusEffect: 'INSPIRED', // Inspires the player?
        selfStatus: 'INSPIRED',   // Actually let's inspire the player
        statusChance: 0.5
    },
    words: {
        id: 'words',
        name: 'Gentle Words',
        power: 10,
        description: 'You whispered sweet, encouraging words.',
        emoji: '💕',
        type: 'heal',  // This one also heals the player slightly
        selfStatus: 'PROUD',
        statusChance: 0.2
    },
    cuddle: {
        id: 'cuddle',
        name: 'Cozy Cuddle',
        power: 25,
        description: 'You snuggled up close, creating a safe space.',
        emoji: '🥰',
        type: 'comfort'
    },
    dance: {
        id: 'dance',
        name: 'Silly Dance',
        power: 18,
        description: 'You broke into a goofy dance! The mood lightens.',
        emoji: '💃',
        type: 'special',
        statusEffect: 'CONFUSED',
        statusChance: 0.6
    }
};

// ============================================================================
// PREDEFINED STRESS ENEMIES
// ============================================================================

export const STRESS_ENEMIES: Record<string, Omit<StressEnemy, 'currentStress'>> = {
    workStress: {
        id: 'workStress',
        name: 'Work Stress',
        maxStress: 50,
        sprite: 'stress_work',
        attackPower: 8,
        attackName: 'Deadline Pressure',
        attackDescription: 'Work Stress reminds you of pending deadlines!',
        level: 3,
        vibeReward: 10,
        xpReward: 30,
        activeStatuses: []
    },
    anxietyCloud: {
        id: 'anxietyCloud',
        name: 'Anxiety Cloud',
        maxStress: 70,
        sprite: 'stress_anxiety',
        attackPower: 12,
        attackName: 'Overthinking',
        attackDescription: 'Anxiety Cloud fills your mind with worries!',
        level: 5,
        vibeReward: 15,
        xpReward: 50,
        activeStatuses: []
    },
    loneliness: {
        id: 'loneliness',
        name: 'Loneliness',
        maxStress: 100,
        sprite: 'stress_loneliness',
        attackPower: 15,
        attackName: 'Isolation',
        attackDescription: 'Loneliness makes the world feel distant...',
        level: 8,
        vibeReward: 25,
        xpReward: 80,
        activeStatuses: []
    },
    mondayBlues: {
        id: 'mondayBlues',
        name: 'Monday Blues',
        maxStress: 40,
        sprite: 'stress_monday',
        attackPower: 6,
        attackName: 'Alarm Clock',
        attackDescription: 'Monday Blues hits you with early morning dread!',
        level: 2,
        vibeReward: 8,
        xpReward: 20,
        activeStatuses: []
    },
    socialDrain: {
        id: 'socialDrain',
        name: 'Social Drain',
        maxStress: 60,
        sprite: 'stress_social',
        attackPower: 10,
        attackName: 'Awkward Silence',
        attackDescription: 'Social Drain makes everything feel exhausting!',
        level: 4,
        vibeReward: 12,
        xpReward: 40,
        activeStatuses: []
    }
};

// ============================================================================
// DEFAULT PLAYER MEMORY
// ============================================================================

export const DEFAULT_PLAYER_MEMORY: Memory = {
    id: 'loveHeart',
    name: 'Love',
    maxVibe: 100,
    currentVibe: 100,
    sprite: 'player',
    moves: [MOVES.hug, MOVES.joke, MOVES.kiss, MOVES.words],
    description: 'The power of love and connection.',
    level: 5,
    xp: 0,
    xpToNextLevel: 500,
    activeStatuses: []
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a new enemy instance from a template
 */
export function createEnemyInstance(enemyId: string): StressEnemy {
    const template = STRESS_ENEMIES[enemyId];
    if (!template) {
        // Default to work stress if not found
        return {
            ...STRESS_ENEMIES.workStress,
            currentStress: STRESS_ENEMIES.workStress.maxStress,
            activeStatuses: []
        };
    }
    return {
        ...template,
        currentStress: template.maxStress,
        activeStatuses: []
    };
}

/**
 * Gets a random enemy for wild encounters
 */
export function getRandomEnemy(): StressEnemy {
    const enemyIds = Object.keys(STRESS_ENEMIES);
    // Weight towards easier enemies
    const weights = [0.35, 0.25, 0.1, 0.2, 0.1]; // work, anxiety, loneliness, monday, social

    let random = Math.random();
    let cumulativeWeight = 0;

    for (let i = 0; i < enemyIds.length; i++) {
        cumulativeWeight += weights[i] || 0.1;
        if (random <= cumulativeWeight) {
            return createEnemyInstance(enemyIds[i]);
        }
    }

    return createEnemyInstance('workStress');
}

/**
 * Calculates damage with some randomness
 */
export function calculateDamage(basePower: number): number {
    const variance = 0.2; // ±20% variance
    const multiplier = 1 + (Math.random() * variance * 2 - variance);
    return Math.round(basePower * multiplier);
}

