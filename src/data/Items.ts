/**
 * Items.ts
 * Data definitions for consumable items in Nancymon
 */

export interface Item {
    id: string;
    name: string;
    description: string;
    type: 'heal' | 'comfort' | 'special';
    value: number; // Effectiveness amount
    emoji: string;
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
    }
};

export const getItemById = (id: string): Item | undefined => {
    return ITEMS[id];
};
