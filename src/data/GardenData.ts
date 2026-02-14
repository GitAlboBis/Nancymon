export interface PlantDef {
    id: string;
    name: string;
    stages: number; // Total stages (e.g. 4: Seed -> Sprout -> Bloom -> Ripe)
    maxGrowthPoints: number; // Total "presses" to reach full maturity
    harvestItemId: string; // ID from Items.ts
    sprites: string[]; // Sprite keys/frames for each stage. If not used, we rely on emojis/generic sprites.
    emoji: string;
}

export interface GardenPlot {
    index: number;
    isUnlocked: boolean;
    plantId: string | null;
    currentStage: number; // 0 to (PlantDef.stages - 1)
    currentGrowthPoints: number;
}

export const PLANT_DEFINITIONS: Record<string, PlantDef> = {
    love_berry: {
        id: 'love_berry',
        name: 'Love Berry',
        stages: 4,
        maxGrowthPoints: 20, // 20 clicks to fully grow
        harvestItemId: 'love_berry',
        sprites: ['plant_seed', 'plant_sprout', 'plant_bloom', 'plant_ripe'],
        emoji: '🍓'
    },
    rose: {
        id: 'rose',
        name: 'Rose',
        stages: 4,
        maxGrowthPoints: 30,
        harvestItemId: 'flower_rose',
        sprites: [],
        emoji: '🌹'
    },
    sunflower: {
        id: 'sunflower',
        name: 'Sunflower',
        stages: 4,
        maxGrowthPoints: 40,
        harvestItemId: 'flower_sunflower',
        sprites: [],
        emoji: '🌻'
    },
    coffee_bean: {
        id: 'coffee_bean',
        name: 'Coffee',
        stages: 4,
        maxGrowthPoints: 50,
        harvestItemId: 'coffee_beans',
        sprites: [],
        emoji: '☕'
    }
};

export const getPlantDef = (id: string): PlantDef | undefined => {
    return PLANT_DEFINITIONS[id];
};
