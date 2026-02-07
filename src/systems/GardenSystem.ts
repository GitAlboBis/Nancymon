import { GameState } from '../state/GameState';
import { PLANTS } from '../data/GardenData';
import { WeatherType } from './WeatherSystem';

export class GardenSystem {
    private static instance: GardenSystem;
    private readonly GROWTH_CHECK_INTERVAL = 10000; // Check every 10 seconds
    private lastCheckTime = 0;

    private constructor() { }

    public static getInstance(): GardenSystem {
        if (!GardenSystem.instance) {
            GardenSystem.instance = new GardenSystem();
        }
        return GardenSystem.instance;
    }

    /**
     * Update garden state (growth, water decay)
     * Call this from a scene's update loop or on a timer
     * @param time Current game time
     * @param delta Delta time in ms
     */
    public update(time: number, _delta: number): void {
        if (time - this.lastCheckTime > this.GROWTH_CHECK_INTERVAL) {
            this.processGrowth();
            this.lastCheckTime = time;
        }
    }

    /**
     * Process growth for all plots
     */
    private processGrowth(): void {
        const plots = GameState.getGardenPlots();
        let changed = false;

        plots.forEach(plot => {
            if (plot.plantId && plot.growthStage !== 'mature' && !plot.isWithered) {
                const plant = PLANTS[plot.plantId];
                if (!plant) return;

                // Needs water to grow
                if (plot.waterLevel > 0) {
                    // Growth increment based on time
                    // If growthTime is 2 mins, we need 100% progress.
                    // internal check is every 10s. 2 mins = 120s = 12 checks.
                    // So increment ~0.08 per check.
                    // Formula: (CheckInterval / (GrowthTime * 60 * 1000))
                    const growthSteps = (plant.growthTime * 60 * 1000) / this.GROWTH_CHECK_INTERVAL;
                    const increment = 1 / growthSteps;

                    plot.growthProgress = Math.min(plot.growthProgress + increment, 1);

                    // Consume water slowly
                    plot.waterLevel = Math.max(plot.waterLevel - 0.1, 0);

                    // Stage progression
                    if (plot.growthProgress >= 0.5 && plot.growthStage === 'seed') {
                        plot.growthStage = 'sprout';
                    }
                    if (plot.growthProgress >= 1.0) {
                        plot.growthStage = 'mature';
                        console.log(`🌻 Plant ${plant.name} matured!`);
                    }

                    changed = true;
                } else {
                    // Wither risk? maybe later.
                }
            } else if (plot.waterLevel > 0) {
                // Evaporate unused water
                plot.waterLevel = Math.max(plot.waterLevel - 0.05, 0);
                changed = true;
            }
        });

        if (changed) {
            // Force save? Or just rely on auto-save
            // GameState.saveGame();
        }
    }

    /**
     * Handle weather impacts (Rain waters plants)
     */
    public onWeatherChange(weather: WeatherType): void {
        if (weather === WeatherType.RAIN) {
            console.log('🌧️ Rain is watering the garden!');
            const plots = GameState.getGardenPlots();
            plots.forEach((plot, index) => {
                if (plot.waterLevel < 1.0) {
                    GameState.updatePlot(index, { waterLevel: 1.0 });
                }
            });
        }
    }
}
