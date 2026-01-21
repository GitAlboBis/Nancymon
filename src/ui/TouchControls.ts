/**
 * TouchControls.ts
 * Custom touch controls overlay for mobile play
 * Creates HTML/CSS D-pad and Action button
 */

export type TouchDirection = 'up' | 'down' | 'left' | 'right' | null;

export interface TouchControlsConfig {
    onDirectionChange?: (direction: TouchDirection) => void;
    onActionPress?: () => void;
    onActionRelease?: () => void;
}

/**
 * TouchControls class
 * Creates an HTML overlay with D-pad and Action button for touch input
 */
export class TouchControls {
    private container: HTMLDivElement;
    private dpad: HTMLDivElement;
    private actionButton: HTMLDivElement;
    private currentDirection: TouchDirection = null;
    private config: TouchControlsConfig;
    private isActionPressed = false;

    constructor(config: TouchControlsConfig = {}) {
        this.config = config;
        this.container = this.createContainer();
        this.dpad = this.createDpad();
        this.actionButton = this.createActionButton();

        this.container.appendChild(this.dpad);
        this.container.appendChild(this.actionButton);
        document.body.appendChild(this.container);

        this.setupStyles();
    }

    /**
     * Creates the main container
     */
    private createContainer(): HTMLDivElement {
        const container = document.createElement('div');
        container.id = 'touch-controls';
        container.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 150px;
            pointer-events: none;
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding: 20px;
            box-sizing: border-box;
        `;
        return container;
    }

    /**
     * Creates the D-pad control
     */
    private createDpad(): HTMLDivElement {
        const dpad = document.createElement('div');
        dpad.className = 'dpad';
        dpad.style.cssText = `
            position: relative;
            width: 130px;
            height: 130px;
            pointer-events: auto;
        `;

        // Create direction buttons
        const directions: { dir: TouchDirection; style: string; label: string }[] = [
            { dir: 'up', style: 'top: 0; left: 50%; transform: translateX(-50%);', label: '▲' },
            { dir: 'down', style: 'bottom: 0; left: 50%; transform: translateX(-50%);', label: '▼' },
            { dir: 'left', style: 'left: 0; top: 50%; transform: translateY(-50%);', label: '◀' },
            { dir: 'right', style: 'right: 0; top: 50%; transform: translateY(-50%);', label: '▶' }
        ];

        directions.forEach(({ dir, style, label }) => {
            const btn = document.createElement('div');
            btn.className = `dpad-btn dpad-${dir}`;
            btn.innerHTML = label;
            btn.style.cssText = `
                position: absolute;
                width: 45px;
                height: 45px;
                background: rgba(255, 107, 157, 0.6);
                border: 2px solid rgba(255, 255, 255, 0.5);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: white;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                user-select: none;
                -webkit-user-select: none;
                touch-action: manipulation;
                ${style}
            `;

            // Touch events
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleDirectionStart(dir);
                btn.style.background = 'rgba(255, 107, 157, 0.9)';
                btn.style.transform = btn.style.transform.replace(')', ' scale(0.95))');
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleDirectionEnd();
                btn.style.background = 'rgba(255, 107, 157, 0.6)';
                btn.style.transform = btn.style.transform.replace(' scale(0.95)', '');
            }, { passive: false });

            btn.addEventListener('touchcancel', () => {
                this.handleDirectionEnd();
                btn.style.background = 'rgba(255, 107, 157, 0.6)';
            });

            dpad.appendChild(btn);
        });

        // Center decoration
        const center = document.createElement('div');
        center.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 30px;
            height: 30px;
            background: rgba(255, 107, 157, 0.4);
            border-radius: 50%;
        `;
        dpad.appendChild(center);

        return dpad;
    }

    /**
     * Creates the action button
     */
    private createActionButton(): HTMLDivElement {
        const btn = document.createElement('div');
        btn.className = 'action-btn';
        btn.innerHTML = 'A';
        btn.style.cssText = `
            width: 70px;
            height: 70px;
            background: rgba(74, 144, 217, 0.7);
            border: 3px solid rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: bold;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            user-select: none;
            -webkit-user-select: none;
            pointer-events: auto;
            touch-action: manipulation;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleActionPress();
            btn.style.background = 'rgba(74, 144, 217, 1)';
            btn.style.transform = 'scale(0.9)';
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleActionRelease();
            btn.style.background = 'rgba(74, 144, 217, 0.7)';
            btn.style.transform = 'scale(1)';
        }, { passive: false });

        btn.addEventListener('touchcancel', () => {
            this.handleActionRelease();
            btn.style.background = 'rgba(74, 144, 217, 0.7)';
            btn.style.transform = 'scale(1)';
        });

        return btn;
    }

    /**
     * Add global styles
     */
    private setupStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            #touch-controls .dpad-btn:active,
            #touch-controls .action-btn:active {
                transform: scale(0.9) !important;
            }
            
            @media (min-width: 1024px) and (hover: hover) {
                #touch-controls {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Handle direction button press
     */
    private handleDirectionStart(direction: TouchDirection): void {
        this.currentDirection = direction;
        if (this.config.onDirectionChange) {
            this.config.onDirectionChange(direction);
        }
    }

    /**
     * Handle direction button release
     */
    private handleDirectionEnd(): void {
        this.currentDirection = null;
        if (this.config.onDirectionChange) {
            this.config.onDirectionChange(null);
        }
    }

    /**
     * Handle action button press
     */
    private handleActionPress(): void {
        this.isActionPressed = true;
        if (this.config.onActionPress) {
            this.config.onActionPress();
        }
    }

    /**
     * Handle action button release
     */
    private handleActionRelease(): void {
        this.isActionPressed = false;
        if (this.config.onActionRelease) {
            this.config.onActionRelease();
        }
    }

    /**
     * Get current direction being pressed
     */
    public getDirection(): TouchDirection {
        return this.currentDirection;
    }

    /**
     * Check if action button is pressed
     */
    public isActionDown(): boolean {
        return this.isActionPressed;
    }

    /**
     * Show the controls
     */
    public show(): void {
        this.container.style.display = 'flex';
    }

    /**
     * Hide the controls
     */
    public hide(): void {
        this.container.style.display = 'none';
    }

    /**
     * Destroy the controls
     */
    public destroy(): void {
        this.container.remove();
    }
}
