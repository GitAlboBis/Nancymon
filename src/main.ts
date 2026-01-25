import Phaser from 'phaser';
import { PreloaderScene } from './scenes/PreloaderScene';
import { WorldScene } from './scenes/WorldScene';
import { BattleScene } from './scenes/BattleScene';
import { FinaleScene } from './scenes/FinaleScene';
import { CityScene } from './scenes/CityScene';
import { CafeScene } from './scenes/CafeScene';
import { HudOverlay } from './ui/HudOverlay';
import { MemoryAlbumScene } from './scenes/MemoryAlbumScene';
import { JournalScene } from './scenes/JournalScene';
import { BagScene } from './scenes/BagScene';
import { TitleScene } from './scenes/TitleScene';
import { SystemMenuScene } from './scenes/SystemMenuScene';
import { GardenScene } from './scenes/GardenScene';
import { GAME_WIDTH, GAME_HEIGHT } from './config/GameConfig';

/**
 * Main entry point for Nancymon - Pokémon-style RPG Engine
 */

// Phaser Game Configuration
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    pixelArt: true, // Enables crisp pixel art rendering
    roundPixels: true, // Prevents sub-pixel rendering
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,  // Logical width - larger canvas
        height: 600  // Logical height - larger canvas
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: true // Set to true to see collision boxes
        }
    },
    scene: [PreloaderScene, TitleScene, WorldScene, BattleScene, FinaleScene, CityScene, CafeScene, GardenScene, HudOverlay, MemoryAlbumScene, JournalScene, BagScene, SystemMenuScene]
};

// Game instance (created after video intro)
let game: Phaser.Game | null = null;

/**
 * Initialize the Phaser game
 * Called after the video intro completes
 */
function initializeGame(): void {
    game = new Phaser.Game(config);

    // Handle window resize for responsive scaling
    window.addEventListener('resize', () => {
        game?.scale.refresh();
    });

    // Log game info
    console.log('🎮 Nancymon Engine v1.0.0');
    console.log(`📐 Resolution: ${GAME_WIDTH}x${GAME_HEIGHT}`);
    console.log('⌨️ Controls: Arrow Keys or WASD to move');
}

/**
 * Handle the game start sequence
 * Plays the intro video and transitions to the game
 */
function handleGameStart(): void {
    const videoContainer = document.getElementById('video-container');
    const video = document.getElementById('intro-video') as HTMLVideoElement;
    const startButton = document.getElementById('start-button');
    const gameTitle = document.getElementById('game-title');
    const subtitle = document.getElementById('subtitle');

    if (!videoContainer || !video || !startButton) {
        console.warn('Video elements not found, starting game directly');
        initializeGame();
        return;
    }

    // Hide start button and title
    startButton.style.display = 'none';
    if (gameTitle) gameTitle.style.display = 'none';
    if (subtitle) subtitle.style.display = 'none';

    // Show and play video
    video.style.display = 'block';

    // Check if video source exists
    video.play().then(() => {
        console.log('🎬 Playing intro video...');
    }).catch((error) => {
        // Video failed to play (no source or error)
        console.warn('Video playback failed, starting game directly:', error.message);
        startGameAfterVideo(videoContainer);
    });

    // Listen for video end
    video.addEventListener('ended', () => {
        console.log('🎬 Intro video ended');
        startGameAfterVideo(videoContainer);
    });

    // Also handle video error (e.g., file not found)
    video.addEventListener('error', () => {
        console.warn('Video error, starting game directly');
        startGameAfterVideo(videoContainer);
    });
}

/**
 * Transition from video to game
 * Adds fade-out effect and initializes Phaser
 */
function startGameAfterVideo(videoContainer: HTMLElement): void {
    // Add fade-out class for smooth transition
    videoContainer.classList.add('fade-out');

    // Wait for CSS transition to complete (1 second)
    setTimeout(() => {
        // Remove video container from DOM
        videoContainer.remove();

        // Initialize and start the Phaser game
        initializeGame();

        console.log('✨ Game started!');
    }, 1000);
}

// Set up start button click handler
document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-button');

    if (startButton) {
        startButton.addEventListener('click', handleGameStart);
        console.log('🎮 Nancymon ready - Click START to begin!');
    } else {
        // No start button found, start game directly
        console.log('No start button found, initializing game directly');
        initializeGame();
    }
});

// Export for potential external access
export { game };
