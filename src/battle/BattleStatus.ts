
export type StatusType = 'BLUSHING' | 'LAUGHING' | 'CONFUSED' | 'INSPIRED' | 'TIRED' | 'DISTRACTED' | 'PROUD';

export interface StatusEffectDefinition {
    id: StatusType;
    name: string;
    emoji: string;
    description: string;
}

export interface ActiveStatus {
    id: StatusType;
    duration: number; // Turns remaining
}

export const STATUS_DEFINITIONS: Record<StatusType, StatusEffectDefinition> = {
    BLUSHING: {
        id: 'BLUSHING',
        name: 'Blushing',
        emoji: '☺️',
        description: 'Vibe Defense increased! (Reduces damage taken)'
    },
    LAUGHING: {
        id: 'LAUGHING',
        name: 'Laughing',
        emoji: '😂',
        description: 'Too busy laughing to attack! (Skip turn chance)'
    },
    CONFUSED: {
        id: 'CONFUSED',
        name: 'Confused',
        emoji: '😵‍💫',
        description: 'Might help you instead of hurting! (50% chance)'
    },
    INSPIRED: {
        id: 'INSPIRED',
        name: 'Inspired',
        emoji: '✨',
        description: 'Next move deals double comfort!'
    },
    TIRED: {
        id: 'TIRED',
        name: 'Tired',
        emoji: '💤',
        description: 'Attack power reduced.'
    },
    DISTRACTED: {
        id: 'DISTRACTED',
        name: 'Distracted',
        emoji: '👀',
        description: 'High chance to miss turn.'
    },
    PROUD: {
        id: 'PROUD',
        name: 'Proud',
        emoji: '😎',
        description: 'Feeling great! Passive Vibe healing.'
    }
};

/**
 * Helper to create a new active status
 */
export function createStatus(type: StatusType, duration: number = 2): ActiveStatus {
    return {
        id: type,
        duration: duration
    };
}
