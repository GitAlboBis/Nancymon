/**
 * Items.ts
 * Data definitions for consumable items in Nancymon
 */

export interface Item {
    id: string;
    name: string;
    description: string;
    type: 'heal' | 'comfort' | 'special' | 'seed' | 'resource';
    value: number; // Effectiveness amount
    emoji: string;
    plantId?: string; // If it's a seed, what plant does it grow?
}

export const ITEMS: Record<string, Item> = {
    chocolate: {
        id: 'chocolate',
        name: 'Dark Chocolate',
        description: 'A rich treat that restores Vibe.',
        type: 'heal',
        value: 30,
        emoji: '🍫'
    },
    coffee: {
        id: 'coffee',
        name: 'Espresso',
        description: 'Strong coffee to wake up your senses.',
        type: 'heal',
        value: 50,
        emoji: '☕'
    },
    flower: {
        id: 'flower',
        name: 'Wildflower',
        description: 'A simple flower that brings a smile.',
        type: 'comfort',
        value: 20,
        emoji: '🌼'
    },
    loveLetter: {
        id: 'loveLetter',
        name: 'Love Note',
        description: 'A handwritten note reminding you you are loved.',
        type: 'comfort',
        value: 40,
        emoji: '💌'
    },
    plushie: {
        id: 'plushie',
        name: 'Tiny Plushie',
        description: 'Soft and huggable. Reduces stress instantly.',
        type: 'comfort',
        value: 30,
        emoji: '🧸'
    },
    // SEEDS
    seed_rose: {
        id: 'seed_rose',
        name: 'Rose Seeds',
        description: 'Plant these to grow beautiful red roses.',
        type: 'seed',
        value: 0,
        emoji: '🌰',
        plantId: 'rose'
    },
    seed_sunflower: {
        id: 'seed_sunflower',
        name: 'Sunflower Seeds',
        description: 'Grow tall sunflowers that face the light.',
        type: 'seed',
        value: 0,
        emoji: '🌰',
        plantId: 'sunflower'
    },
    seed_coffee: {
        id: 'seed_coffee',
        name: 'Raw Coffee Bean',
        description: 'Can be planted to grow a coffee shrub.',
        type: 'seed',
        value: 0,
        emoji: '🫘',
        plantId: 'coffee_bean'
    },
    // PRODUCE
    flower_rose: {
        id: 'flower_rose',
        name: 'Fresh Rose',
        description: 'A romantic flower with a sweet scent.',
        type: 'comfort',
        value: 25,
        emoji: '🌹'
    },
    flower_sunflower: {
        id: 'flower_sunflower',
        name: 'Sunflower',
        description: 'Bright and cheerful.',
        type: 'comfort',
        value: 20,
        emoji: '🌻'
    },
    coffee_beans: {
        id: 'coffee_beans',
        name: 'Roasted Beans',
        description: 'Freshly harvested coffee beans.',
        type: 'resource',
        value: 10,
        emoji: '🫘'
    },
    // NEW ITEMS
    seed_love_berry: {
        id: 'seed_love_berry',
        name: 'Love Berry Seed',
        description: 'Plants a magical berry that grows with love.',
        type: 'seed',
        value: 0,
        emoji: '🌰',
        plantId: 'love_berry'
    },
    love_berry: {
        id: 'love_berry',
        name: 'Love Berry',
        description: 'A sweet fruit that glows with affection.',
        type: 'heal',
        value: 50,
        emoji: '🍓'
    }
};

export const getItemById = (id: string): Item | undefined => {
    return ITEMS[id];
};
