export interface PlantType {
    id: string;
    name: string;
    growthTime: number; // Minutes to mature
    sproutImage: string; // Key for sprout sprite (usually generic)
    matureImage: string; // Key for mature plant sprite
    produceId: string; // Item ID received when harvested
    yield: number; // How many items received
    emoji: string;
}

export interface GardenPlot {
    index: number;
    plantId: string | null;
    growthStage: 'empty' | 'seed' | 'sprout' | 'mature';
    growthProgress: number; // 0 to 1
    waterLevel: number; // 0 to 1 (decays over time)
    isWithered: boolean;
}

export const PLANTS: Record<string, PlantType> = {
    rose: {
        id: 'rose',
        name: 'Rose',
        growthTime: 2, // Quick for demo
        sproutImage: 'plant_sprout',
        matureImage: 'plant_rose',
        produceId: 'flower_rose',
        yield: 1,
        emoji: '🌹'
    },
    sunflower: {
        id: 'sunflower',
        name: 'Sunflower',
        growthTime: 5,
        sproutImage: 'plant_sprout',
        matureImage: 'plant_sunflower',
        produceId: 'flower_sunflower',
        yield: 2,
        emoji: '🌻'
    },
    coffee_bean: {
        id: 'coffee_bean',
        name: 'Coffee Plant',
        growthTime: 10,
        sproutImage: 'plant_sprout',
        matureImage: 'plant_coffee',
        produceId: 'coffee_beans',
        yield: 3,
        emoji: '☕'
    }
};

export const getPlantById = (id: string): PlantType | undefined => {
    return PLANTS[id];
};
