import Phaser from 'phaser';

export enum WeatherType {
    NONE,
    RAIN,
    SNOW,
    CHERRY_BLOSSOM
}

export class WeatherSystem {
    private scene: Phaser.Scene;
    private emitters: Map<WeatherType, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();
    private currentType: WeatherType = WeatherType.NONE;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.createTextures();
    }

    /**
     * Use Graphics to generate particle textures programmatically
     * This avoids needing external assets
     */
    private createTextures(): void {
        // Rain Drop (Blue/White line)
        if (!this.scene.textures.exists('rain_particle')) {
            const rain = this.scene.make.graphics({ x: 0, y: 0 });
            rain.fillStyle(0xaaccff, 0.8);
            rain.fillRect(0, 0, 2, 10);
            rain.generateTexture('rain_particle', 2, 10);
        }

        // Snow Flake (White circle)
        if (!this.scene.textures.exists('snow_particle')) {
            const snow = this.scene.make.graphics({ x: 0, y: 0 });
            snow.fillStyle(0xffffff, 0.8);
            snow.fillCircle(4, 4, 4);
            snow.generateTexture('snow_particle', 8, 8);
        }

        // Cherry Blossom Petal (Pink oval-ish)
        if (!this.scene.textures.exists('petal_particle')) {
            const petal = this.scene.make.graphics({ x: 0, y: 0 });
            petal.fillStyle(0xffb7c5, 0.9);
            petal.fillCircle(5, 5, 5); // Simple circle for now, rotation will sell it
            petal.generateTexture('petal_particle', 10, 10);
        }
    }

    public setWeather(type: WeatherType): void {
        if (this.currentType === type) return;

        // Stop current weather
        this.stopWeather();

        this.currentType = type;

        switch (type) {
            case WeatherType.RAIN:
                this.startRain();
                break;
            case WeatherType.SNOW:
                this.startSnow();
                break;
            case WeatherType.CHERRY_BLOSSOM:
                this.startCherryBlossom();
                break;
            case WeatherType.NONE:
            default:
                // Already stopped
                break;
        }
    }

    private stopWeather(): void {
        this.emitters.forEach(emitter => {
            emitter.stop();
            // We can keep the manager/emitter alive, just stop emission
        });
    }

    private startRain(): void {
        let emitter = this.emitters.get(WeatherType.RAIN);

        if (!emitter) {
            emitter = this.scene.add.particles(0, 0, 'rain_particle', {
                x: { min: -100, max: this.scene.scale.width + 100 },
                y: -50,
                lifespan: 1000,
                speedY: { min: 400, max: 600 },
                speedX: { min: -20, max: 20 },
                scale: { start: 1, end: 1 },
                quantity: 2,
                blendMode: 'ADD'
            });
            emitter.setScrollFactor(0); // Attach to camera
            emitter.setDepth(200); // Above most things
            this.emitters.set(WeatherType.RAIN, emitter);
        }

        emitter.start();
    }

    private startSnow(): void {
        let emitter = this.emitters.get(WeatherType.SNOW);

        if (!emitter) {
            emitter = this.scene.add.particles(0, 0, 'snow_particle', {
                x: { min: -100, max: this.scene.scale.width + 100 },
                y: -50,
                lifespan: 4000,
                speedY: { min: 50, max: 100 },
                speedX: { min: -20, max: 20 },
                scale: { start: 0.2, end: 0.5 },
                quantity: 1,
                rotate: { min: 0, max: 360 },
                alpha: { start: 0.8, end: 0 }
            });
            emitter.setScrollFactor(0);
            emitter.setDepth(200);
            this.emitters.set(WeatherType.SNOW, emitter);
        }

        emitter.start();
    }

    private startCherryBlossom(): void {
        let emitter = this.emitters.get(WeatherType.CHERRY_BLOSSOM);

        if (!emitter) {
            emitter = this.scene.add.particles(0, 0, 'petal_particle', {
                x: { min: -100, max: this.scene.scale.width + 100 },
                y: -50,
                lifespan: 5000,
                speedY: { min: 30, max: 70 },
                speedX: { min: -50, max: 50 },
                scale: { start: 0.3, end: 0.6 },
                quantity: 1,
                rotate: { min: 0, max: 360 },
                alpha: { start: 1, end: 0 },
                // Swaying effect
                emitCallback: (_particle: any) => {
                    // Phaser particles don't have easy custom update loop without extending
                    // but we can set initial random velocity
                }
            });
            emitter.setScrollFactor(0);
            emitter.setDepth(200);
            this.emitters.set(WeatherType.CHERRY_BLOSSOM, emitter);
        }

        emitter.start();
    }

    /**
     * Call this in scene update if dynamic updates are needed
     * (e.g. changing wind direction)
     */
    public update(): void {
        // Optional logic
    }
}
