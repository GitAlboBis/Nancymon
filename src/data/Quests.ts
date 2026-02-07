export interface Quest {
    id: string;
    title: string;
    description: string;
    objectives: string[];
    nextQuestId?: string;
}

export const QUESTS: Record<string, Quest> = {
    'q1_start': {
        id: 'q1_start',
        title: 'A New Beginning',
        description: 'I just moved to the city. I should explore and maybe find something sweet to eat.',
        objectives: [
            'Explore the City',
            'Find the Cafe'
        ],
        nextQuestId: 'q2_date'
    },
    'q2_date': {
        id: 'q2_date',
        title: 'Date Night',
        description: 'I met someone special! We should go on a date.',
        objectives: [
            'Go to the Cafe for a date',
            'Win their heart'
        ]
    },
    'q3_memories': {
        id: 'q3_memories',
        title: 'Collecting Memories',
        description: 'Our journey is just beginning. Let\'s make beautiful memories together.',
        objectives: [
            'Find "First Kiss" memory',
            'Find "Cozy Hug" memory'
        ]
    }
};

export const INITIAL_QUEST_ID = 'q1_start';
