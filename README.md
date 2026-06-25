# Cinemoji 🎬 Emojis Movie Guessing Game..

Cinemoji is a premium, interactive front-end trivia web game where players decode sets of emojis to guess famous movie titles. Built using pure semantic HTML5, modern CSS3 variables/transitions, and modular ES6 JavaScript, the app features fluid animations, custom synthesized sound effects, dark/light themes, and local statistics tracking.The game is Launched at https://sanjay-kumarrs.github.io/emoji_game/

---

## ✨ Features

- **🏆 Classic Mode**: Progress through level-based sets of movies with increasing difficulty. Earn coins and level up.
- **⏱️ Time Attack**: Face a ticking clock in a 60-second survival mode where correct answers reward bonus time and mistakes penalize.
- **💡 Rich Hint Shop**: Use earned coins to unlock hints:
  - *Reveal Genre & Year* (15 Coins)
  - *Fill One Letter* (25 Coins)
  - *Skip Movie* (50 Coins - Classic Mode only)
- **🎹 Web Audio Synthesizer**: Uses standard browser oscillators to synthesize custom game audio (Clicks, Success Chime, Wrong Answer Buzz, Game Over minor drops, and Win fanfare) without loading external audio assets.
- **🎛️ Settings Drawer**: Customize keyboard input layout (switch between dynamic clickable letters grid vs. physical keyboard typing), toggle sound settings, or clear saved statistics.
- **📊 Local Leaderboard & Stats**: High scores and career statistics (total solved, lifetime coins) are persisted locally via `localStorage`.

---

## 🛠️ Technology Stack

- **HTML5**: Semantic document layout.
- **CSS3**: Layouts, glassmorphism, responsive grid styling, custom slide/pulse keyframe animations, dark & light theme system.
- **JavaScript (ES6 Modules)**: State management, Web Audio API, event routers, and LocalStorage caching.
- **Development Server**: Hosted via `live-server` for instant hot-reloads and CORS module support.

---

## 🚀 Getting Started

### Prerequisites

You only need **Node.js** installed on your computer to run the local server.

### Launch Methods

#### Method A: Play Immediately (Zero Setup)
Simply locate [index.html](file:///e:/project/emoji_game/index.html) in your file explorer and **double-click it** to open it directly in your web browser. There are no CORS restrictions or installation steps required!

#### Method B: Local Dev Server
If you want to edit files with automatic reloading:
1. Open your terminal in the project directory:
   ```bash
   cd emoji_game
   ```
2. Install development dependencies:
   ```bash
   npm install
   ```
3. Spin up the local server:
   ```bash
   npm run dev
   ```
4. The server will start and launch the game in your browser at:
   👉 **[http://127.0.0.1:8080](http://127.0.0.1:8080)**

---

## 🎮 Game Controls

- **Letter Grid Input**: Click the scrambled letters at the bottom to place them into the blank slots. Click any placed letter in a slot to return it to the letter bank.
- **Keyboard Input**: Toggle "Text Keyboard Mode" in settings to type the names directly using your physical keyboard. Press `Enter` or click "Go" to submit.
