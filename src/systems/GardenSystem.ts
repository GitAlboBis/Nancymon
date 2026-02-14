import { GameState } from '../state/GameState';
import { PLANT_DEFINITIONS } from '../data/GardenData';

export class GardenSystem {
    private static instance: GardenSystem;

    private constructor() { }

    public static getInstance(): GardenSystem {
        if (!GardenSystem.instance) {
            GardenSystem.instance = new GardenSystem();
        }
        return GardenSystem.instance;
    }

    /**
     * Attempts to plant a seed in a specific plot
     * @param plotIndex Index of the plot (0-11)
     * @param plantId ID of the plant definition
     * @returns true if successful, false if plot occupied or invalid
     */
    public plantSeed(plotIndex: number, plantId: string): boolean {
        const plot = GameState.getPlot(plotIndex);
        if (!plot || plot.plantId) return false;

        const plantDef = PLANT_DEFINITIONS[plantId];
        if (!plantDef) return false;

        GameState.updatePlot(plotIndex, {
            plantId: plantId,
            currentStage: 0, // Seed
            currentGrowthPoints: 0
        });

        console.log(`🌱 Planted ${plantDef.name} at plot #${plotIndex}`);
        return true;
    }

    /**
     * Nurtures the plant (player pressed SPACE)
     * @param plotIndex Index of the plot
     * @returns true if the plant leveled up a stage
     */
    public nurturePlant(plotIndex: number): boolean {
        const plot = GameState.getPlot(plotIndex);
        if (!plot || !plot.plantId) return false;

        const plantDef = PLANT_DEFINITIONS[plot.plantId];
        if (!plantDef) return false;

        // If already ripe (last stage), we can't grow further
        if (plot.currentStage >= plantDef.stages - 1) return false;

        // Increment growth
        const newPoints = plot.currentGrowthPoints + 1;
        let newStage = plot.currentStage;
        let leveledUp = false;

        // Calculate stage based on percentage of maxGrowthPoints
        // Stages are 0-indexed. Max stage is stages-1.
        // Stage 0: 0% - 33%
        // Stage 1: 33% - 66%
        // Stage 2: 66% - 99%
        // Stage 3 (Ripe): 100%
        const progress = newPoints / plantDef.maxGrowthPoints;

        // Simple linear progression mapping
        // e.g. 4 stages. 0 -> 0-0.33, 1 -> 0.33-0.66, 2 -> 0.66-0.99, 3 -> 1.0
        // But we want "Ripe" to only happen at 100% (maxGrowthPoints)

        let calculatedStage = Math.floor(progress * (plantDef.stages - 1));

        // Cap at bloom (stages-2) until we reach 100%
        if (calculatedStage >= plantDef.stages - 1) {
            calculatedStage = plantDef.stages - 2;
        }

        // Check if fully ripe
        if (newPoints >= plantDef.maxGrowthPoints) {
            calculatedStage = plantDef.stages - 1; // Ripe
        }

        if (calculatedStage > plot.currentStage) {
            newStage = calculatedStage;
            leveledUp = true;
            console.log(`🌿 Plant #${plotIndex} grew to stage ${newStage}!`);
        }

        GameState.updatePlot(plotIndex, {
            currentGrowthPoints: newPoints,
            currentStage: newStage
        });

        return leveledUp;
    }

    /**
     * Harvests the plant
     * @param plotIndex Index of the plot
     * @returns item ID of harvest or null
     */
    public harvestPlant(plotIndex: number): string | null {
        const plot = GameState.getPlot(plotIndex);
        if (!plot || !plot.plantId) return null;

        const plantDef = PLANT_DEFINITIONS[plot.plantId];
        if (!plantDef) return null;

        // Must be ripe
        if (plot.currentStage < plantDef.stages - 1) return null;

        // Return the produce
        const harvestItem = plantDef.harvestItemId;

        // Clear plot
        GameState.updatePlot(plotIndex, {
            plantId: null,
            currentStage: 0,
            currentGrowthPoints: 0
        });

        console.log(`🧺 Harvested ${harvestItem} from plot #${plotIndex}`);
        return harvestItem;
    }

    /**
     * Checks if a plot is fully grown
     */
    public isRipe(plotIndex: number): boolean {
        const plot = GameState.getPlot(plotIndex);
        if (!plot || !plot.plantId) return false;

        const plantDef = PLANT_DEFINITIONS[plot.plantId];
        if (!plantDef) return false;

        return plot.currentStage >= plantDef.stages - 1;
    }
}
