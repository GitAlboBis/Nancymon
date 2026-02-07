import Phaser from 'phaser';
import { TimeSystem } from '../systems/TimeSystem';
import { QuestSystem, QuestUpdateType } from '../systems/QuestSystem';

export class HudOverlay extends Phaser.Scene {
    private timeText!: Phaser.GameObjects.Text;
    private vibeBar!: Phaser.GameObjects.Graphics;
    private clockContainer!: Phaser.GameObjects.Container;

    // Quest Notification UI
    private questContainer!: Phaser.GameObjects.Container;
    private questTitle!: Phaser.GameObjects.Text;
    private questMessage!: Phaser.GameObjects.Text;
    private questIcon!: Phaser.GameObjects.Text;

    private timeSystem: TimeSystem;

    constructor() {
        super({ key: 'HudOverlay' });
        this.timeSystem = TimeSystem.getInstance();
    }

    create(): void {
        console.log('📱 HUD Overlay loaded');

        // Create Clock UI (Top Right)
        this.createClock();

        // Create Vibe UI (Top Left)
        this.createVibeMeter();

        // Create Journal Hint (Bottom Right)
        this.createJournalHint();

        // Create Quest Notification (Top Center, hidden)
        this.createQuestNotification();

        // Connect to Quest System
        QuestSystem.getInstance().setNotificationCallback((type, message) => {
            this.showQuestNotification(type, message);
        });

        // Start initial quest check
        this.time.delayedCall(1000, () => {
            QuestSystem.getInstance().startInitialQuest();
        });
    }

    private createJournalHint(): void {
        const width = 100;
        const x = this.cameras.main.width - (width + 10);
        const y = this.cameras.main.height - 40;

        const container = this.add.container(x, y);

        // Icon bg
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.5);
        bg.fillRoundedRect(0, 0, width, 30, 8);
        container.add(bg);

        // Text
        const text = this.add.text(width / 2, 15, '[J] [I]', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(text);
    }

    private createClock(): void {
        const padding = 10;
        const width = 80;
        const height = 24;

        // Use camera width to position correctly regardless of config
        const screenWidth = this.cameras.main.width;
        const x = screenWidth - width - padding;
        const y = padding;

        this.clockContainer = this.add.container(x, y);

        // Background Pill
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.6);
        bg.fillRoundedRect(0, 0, width, height, 12);
        this.clockContainer.add(bg);

        // Time Text
        this.timeText = this.add.text(width / 2, height / 2, '12:00 PM', {
            fontSize: '12px',
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5, 0.5);
        this.clockContainer.add(this.timeText);

        // Add a subtle border
        const border = this.add.graphics();
        border.lineStyle(1, 0xffffff, 0.2);
        border.strokeRoundedRect(0, 0, width, height, 12);
        this.clockContainer.add(border);
    }

    private createVibeMeter(): void {
        const padding = 10;
        const x = padding;
        const y = padding;

        const container = this.add.container(x, y);

        // Label
        const label = this.add.text(0, 0, 'VIBE', {
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#ff69b4', // Hot pink
            fontStyle: 'bold'
        });
        container.add(label);

        // Bar container
        const barBg = this.add.graphics();
        barBg.fillStyle(0x000000, 0.5);
        barBg.fillRoundedRect(0, 14, 100, 8, 4);
        container.add(barBg);

        // Bar fill (static for now)
        this.vibeBar = this.add.graphics();
        this.updateVibeBar(0.8); // 80% vibe
        container.add(this.vibeBar);
    }

    private updateVibeBar(percentage: number): void {
        this.vibeBar.clear();
        this.vibeBar.fillStyle(0xff69b4, 1); // Pink
        this.vibeBar.fillRoundedRect(0, 14, 100 * percentage, 8, 4);
    }

    private createQuestNotification(): void {
        const width = 300;
        const height = 60;
        const x = this.cameras.main.width / 2;
        const y = -100; // Start off-screen

        this.questContainer = this.add.container(x, y);

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x222233, 0.95);
        bg.fillRoundedRect(-width / 2, 0, width, height, 12);
        bg.lineStyle(2, 0xffd700, 1); // Gold border
        bg.strokeRoundedRect(-width / 2, 0, width, height, 12);
        this.questContainer.add(bg);

        // Icon
        this.questIcon = this.add.text(-width / 2 + 20, height / 2, '📜', { fontSize: '24px' }).setOrigin(0.5);
        this.questContainer.add(this.questIcon);

        // Title
        this.questTitle = this.add.text(-width / 2 + 50, 15, 'QUEST STARTED', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#ffd700',
            fontStyle: 'bold'
        });
        this.questContainer.add(this.questTitle);

        // Message
        this.questMessage = this.add.text(-width / 2 + 50, 35, 'Task Name Here', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff'
        });
        this.questContainer.add(this.questMessage);
    }

    private showQuestNotification(type: QuestUpdateType, message: string): void {
        console.log(`[HUD] Showing Quest Notification: ${type} - ${message}`);

        // Update styling based on type
        let color = '#ffd700'; // Gold/Start
        let icon = '📜';
        let header = 'NEW QUEST';

        if (type === 'OBJECTIVE') {
            color = '#00ffaa'; // Greenish
            icon = '🎯';
            header = 'OBJECTIVE COMPLETE';
        } else if (type === 'COMPLETE') {
            color = '#ff69b4'; // Pink/Victory
            icon = '✨';
            header = 'QUEST COMPLETE!';
        }

        this.questTitle.setText(header);
        this.questTitle.setColor(color);
        this.questIcon.setText(icon);
        this.questMessage.setText(message);

        // Bring to top
        this.questContainer.setDepth(1000);

        // Animation Sequence
        // 1. Slide In
        this.tweens.add({
            targets: this.questContainer,
            y: 50, // Target Y position (visible)
            duration: 500,
            ease: 'Back.out',
            onComplete: () => {
                // 2. Wait
                this.time.delayedCall(3000, () => {
                    // 3. Slide Out
                    this.tweens.add({
                        targets: this.questContainer,
                        y: -100,
                        duration: 500,
                        ease: 'Back.in'
                    });
                });
            }
        });
    }

    update(_time: number, delta: number): void {
        // Update Time System
        // Delta is in ms, we convert to seconds
        this.timeSystem.update(delta / 1000);

        // Update UI Text
        this.timeText.setText(this.timeSystem.getFormattedTime());
    }
}
