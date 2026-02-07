export class TimeSystem {
    private static instance: TimeSystem;

    // Time tracking (0-1440 minutes in a day)
    private totalMinutes: number = 720; // Start at 12:00 PM

    // Config: How many game minutes pass per real second
    // 1440 minutes / 240 seconds (4 mins) = 6 game minutes per real second
    private readonly GAME_MINUTES_PER_REAL_SECOND = 6;

    private constructor() { }

    public static getInstance(): TimeSystem {
        if (!TimeSystem.instance) {
            TimeSystem.instance = new TimeSystem();
        }
        return TimeSystem.instance;
    }

    public update(deltaSeconds: number): void {
        this.totalMinutes += deltaSeconds * this.GAME_MINUTES_PER_REAL_SECOND;

        // Loop day
        if (this.totalMinutes >= 1440) {
            this.totalMinutes -= 1440;
        }
    }

    public getFormattedTime(): string {
        const totalMin = Math.floor(this.totalMinutes);
        const hours = Math.floor(totalMin / 60);
        const minutes = totalMin % 60;

        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 === 0 ? 12 : hours % 12;
        const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;

        return `${displayHours}:${displayMinutes} ${period}`;
    }

    // Returns 0.0 (Brightest) to 0.8 (Darkest)
    public getLightIntensity(): number {
        const totalMin = Math.floor(this.totalMinutes);

        // Day: 6 AM (360) to 6 PM (1080)
        // Night: 6 PM to 6 AM (wrapping)
        // Peak Day: 12 PM (720) -> Intensity 0
        // Peak Night: 12 AM (0) -> Intensity 0.7

        // Simple curve
        // 0 (12 AM) -> 0.7
        // 360 (6 AM) -> transition to 0
        // 720 (12 PM) -> 0
        // 1080 (6 PM) -> transition to 0.7

        let intensity = 0;

        if (totalMin < 300) { // 12 AM - 5 AM: Deep Night
            intensity = 0.7;
        } else if (totalMin < 480) { // 5 AM - 8 AM: Sunrise
            // 300 -> 0.7, 480 -> 0.0
            const progress = (totalMin - 300) / 180;
            intensity = 0.7 * (1 - progress);
        } else if (totalMin < 1020) { // 8 AM - 5 PM: Day
            intensity = 0;
        } else if (totalMin < 1200) { // 5 PM - 8 PM: Sunset
            // 1020 -> 0.0, 1200 -> 0.7
            const progress = (totalMin - 1020) / 180;
            intensity = 0.7 * progress;
        } else { // 8 PM - 12 AM: Deep Night
            intensity = 0.7;
        }

        return intensity;
    }

    public isNight(): boolean {
        return this.getLightIntensity() > 0.3;
    }
}
