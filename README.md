# Nancymon Engine

Nancymon is a Pokémon-style top-down RPG engine designed as a robust web application. Built with modern web technologies, it features a scalable architecture designed to handle various game states, interactive UI overlays, and media-rich entry sequences.

## 🚀 Tech Stack

The project relies on a modern frontend development environment:
* **Core Engine**: Phaser v3.80.1.
* **Language**: TypeScript v5.4.5.
* **Bundler & Tooling**: Vite v5.2.11 configured with ESNext target.

## 🎮 Game Features & Architecture

The engine is built around a multi-scene architecture managed by Phaser, ensuring clean separation of game logic and UI components:
* **Exploration Scenes**: Includes `WorldScene`, `CityScene`, `CafeScene`, and `GardenScene`.
* **Core Mechanics**: Implements a dedicated `BattleScene` for RPG combat and a `FinaleScene`.
* **Interactive Systems**: Supports a `JournalScene`, `BagScene`, `MemoryAlbumScene`, and `SystemMenuScene` for inventory and progression management.
* **User Interface**: Utilizes an overlying `HudOverlay` for real-time heads-up display integration.
* **Media Integration**: Features a cinematic start sequence that plays an intro video prior to initializing the main Phaser game canvas.

## ⚙️ Game Configuration

The game initializes with specific rendering parameters optimized for a retro feel:
* **Rendering**: Pixel art is enabled for crisp rendering and sub-pixel rendering is prevented via `roundPixels: true`.
* **Physics**: Runs on Arcade physics with debugging options available.
* **Scaling**: Responsive scaling using `Phaser.Scale.FIT` and auto-centering, utilizing a logical canvas size of 800x600.

## 🕹️ Controls

* **Movement**: Arrow Keys or WASD to move.

