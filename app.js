/* app.js - Cinemoji Game Logic */
const movies = window.movies;

// Sound Synth Engine using Web Audio API
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, delay = 0, volume = 0.1) {
    if (!this.enabled || !this.ctx) return;
    
    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        console.warn("Audio playing error:", e);
      }
    }, delay * 1000);
  }

  playClick() {
    this.init();
    this.playTone(800, 'sine', 0.08, 0, 0.15);
  }

  playSuccess() {
    this.init();
    // Nice major arpeggio
    this.playTone(523.25, 'sine', 0.15, 0, 0.15);     // C5
    this.playTone(659.25, 'sine', 0.15, 0.08, 0.15);    // E5
    this.playTone(783.99, 'sine', 0.15, 0.16, 0.15);    // G5
    this.playTone(1046.50, 'sine', 0.3, 0.24, 0.15);   // C6
  }

  playFail() {
    this.init();
    // Sad buzzy double tone
    this.playTone(150, 'sawtooth', 0.2, 0, 0.2);
    this.playTone(145, 'sawtooth', 0.25, 0.05, 0.2);
  }

  playHint() {
    this.init();
    // High-pitched magical sparkle
    this.playTone(987.77, 'sine', 0.1, 0, 0.1);      // B5
    this.playTone(1174.66, 'sine', 0.1, 0.06, 0.1);   // D6
    this.playTone(1318.51, 'sine', 0.1, 0.12, 0.1);   // E6
    this.playTone(1567.98, 'sine', 0.2, 0.18, 0.1);   // G6
  }

  playGameOver() {
    this.init();
    // Descending sad tones
    this.playTone(392.00, 'triangle', 0.3, 0, 0.2);   // G4
    this.playTone(349.23, 'triangle', 0.3, 0.15, 0.2); // F4
    this.playTone(311.13, 'triangle', 0.3, 0.3, 0.2);  // Eb4
    this.playTone(246.94, 'triangle', 0.6, 0.45, 0.2); // B3
  }

  playWinGame() {
    this.init();
    // Triumphant Fanfare
    const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 523.25];
    const delays = [0, 0.1, 0.2, 0.3, 0.45, 0.6];
    const lens = [0.15, 0.15, 0.15, 0.15, 0.15, 0.5];
    notes.forEach((note, i) => {
      this.playTone(note, 'sine', lens[i], delays[i], 0.15);
    });
  }
}

// Instantiate Sound Engine
const sfx = new SoundEngine();

// Confetti Effect Helper
function launchConfetti() {
  const container = document.body;
  const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  const particleCount = 100;
  
  for (let i = 0; i < particleCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    // Random styling
    const size = Math.random() * 8 + 6;
    confetti.style.width = `${size}px`;
    confetti.style.height = `${size}px`;
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    
    // Position and motion
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    
    // Animations variables
    const duration = Math.random() * 1.5 + 1.5;
    confetti.style.animationDuration = `${duration}s`;
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    
    container.appendChild(confetti);
    
    // Cleanup
    setTimeout(() => {
      confetti.remove();
    }, (duration + 0.5) * 1000);
  }
}

// Main Game State Object
const state = {
  // Config
  playerName: "Player 1",
  currentMode: "classic", // 'classic' or 'timeattack'
  coins: 0,
  soundEnabled: true,
  keyboardMode: false,
  
  // Game Play Progress
  classicLevel: 0, // index of active movie in randomized set
  classicLevelSolved: 0, // total solved in classic mode
  lives: 3,
  score: 0,
  streak: 0,
  timeRemaining: 60,
  
  // Active Question Info
  activeMovie: null,
  activeMovieIndex: 0,
  shuffledClassicMovies: [], // Randomized array of movies for classic mode
  
  // Interactive letter boards
  guessedLetters: [], // Array representing user fills
  letterPool: [], // Scrambled letter buttons content
  selectedPoolIndices: [], // Map slot index -> pool letter index
  revealedSlotIndices: new Set(), // Set of slots unlocked via hints
  
  // Stats
  totalSolvedAllTime: 0,
  totalCoinsAllTime: 0,
  leaderboards: {
    classic: [],
    timeattack: []
  },
  
  // Timer Reference
  timerInterval: null,
  levelStartTime: 0,

  // Multiplayer Mode State
  mpPlayer1Name: "Player 1",
  mpPlayer2Name: "Player 2",
  mpScores: [0, 0],
  mpActivePlayerIndex: 0,
  mpRound: 1,
  mpMaxRounds: 5,
  mpTimerRemaining: 30,
  mpMovies: []
};

// DOM Elements
const DOM = {
  // Screens
  welcomeScreen: document.getElementById('welcome-screen'),
  gameScreen: document.getElementById('game-screen'),
  
  // Navigation
  logoBtn: document.getElementById('logo-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  soundToggle: document.getElementById('sound-toggle'),
  leaderboardBtn: document.getElementById('leaderboard-btn'),
  settingsBtn: document.getElementById('settings-btn'),
  backToMenuBtn: document.getElementById('back-to-menu-btn'),
  
  // Welcome Elements
  usernameInput: document.getElementById('username'),
  modeClassic: document.getElementById('mode-classic'),
  modeTimeAttack: document.getElementById('mode-time-attack'),
  startGameBtn: document.getElementById('start-game-btn'),
  
  // Game Play Elements
  classicStats: document.getElementById('classic-stats'),
  timeAttackStats: document.getElementById('time-attack-stats'),
  timerVal: document.getElementById('timer-val'),
  coinsVal: document.getElementById('coins-val'),
  livesContainer: document.getElementById('lives-container'),
  levelIndicator: document.getElementById('level-indicator'),
  genreBadge: document.getElementById('genre-badge'),
  genreVal: document.getElementById('genre-val'),
  emojiDisplay: document.getElementById('emoji-display'),
  wordSlots: document.getElementById('word-slots'),
  letterBank: document.getElementById('letter-bank'),
  fallbackContainer: document.getElementById('fallback-container'),
  manualTextInput: document.getElementById('manual-text-input'),
  manualSubmitBtn: document.getElementById('manual-submit-btn'),
  clearLettersBtn: document.getElementById('clear-letters-btn'),
  
  // Hints
  hintGenreBtn: document.getElementById('hint-genre-btn'),
  hintLetterBtn: document.getElementById('hint-letter-btn'),
  hintSkipBtn: document.getElementById('hint-skip-btn'),
  hintContainerWrapper: document.querySelector('.hint-container') ? document.querySelector('.hint-container').parentElement : null,
  
  // Theme Icons
  sunIcon: document.getElementById('sun-icon'),
  moonIcon: document.getElementById('moon-icon'),
  soundOnIcon: document.getElementById('sound-on-icon'),
  soundOffIcon: document.getElementById('sound-off-icon'),
  
  // Modals
  feedbackModal: document.getElementById('feedback-modal'),
  feedbackTitle: document.getElementById('feedback-title'),
  feedbackIcon: document.getElementById('feedback-icon'),
  feedbackMsg: document.getElementById('feedback-msg'),
  feedbackMovieDetails: document.getElementById('feedback-movie-details'),
  feedbackCoinsEarned: document.getElementById('feedback-coins-earned'),
  feedbackNextBtn: document.getElementById('feedback-next-btn'),
  
  gameOverModal: document.getElementById('gameover-modal'),
  gameOverMsg: document.getElementById('gameover-msg'),
  goStatScore: document.getElementById('go-stat-score'),
  goStatScoreLbl: document.getElementById('go-stat-score-lbl'),
  goStatBest: document.getElementById('go-stat-best'),
  goRestartBtn: document.getElementById('go-restart-btn'),
  goMenuBtn: document.getElementById('go-menu-btn'),
  
  leaderboardModal: document.getElementById('leaderboard-modal'),
  leaderboardClose: document.getElementById('leaderboard-close'),
  leaderboardScoresContainer: document.getElementById('leaderboard-scores-container'),
  lbTabClassic: document.getElementById('lb-tab-classic'),
  lbTabTime: document.getElementById('lb-tab-time'),
  statsTotalSolved: document.getElementById('stats-total-solved'),
  statsTotalCoins: document.getElementById('stats-total-coins'),
  
  settingsModal: document.getElementById('settings-modal'),
  settingsClose: document.getElementById('settings-close'),
  keyboardToggle: document.getElementById('keyboard-toggle'),
  soundCheckbox: document.getElementById('sound-checkbox'),
  resetGameDataBtn: document.getElementById('reset-game-data-btn'),

  // Multiplayer Elements
  modeMultiplayer: document.getElementById('mode-multiplayer'),
  multiplayerStats: document.getElementById('multiplayer-stats'),
  mpActivePlayer: document.getElementById('mp-active-player'),
  mpRoundIndicator: document.getElementById('mp-round-indicator'),
  mpScoreboard: document.getElementById('mp-scoreboard'),
  mpTimerVal: document.getElementById('mp-timer-val'),
  singlePlayerCoins: document.getElementById('single-player-coins'),
  passTurnBtn: document.getElementById('pass-turn-btn')
};

// Initialize App
function initApp() {
  loadSavedState();
  setupEventListeners();
  updateThemeUI();
  updateSoundUI();
  updateCoinsDisplay();
}

// Load data from LocalStorage
function loadSavedState() {
  const savedName = localStorage.getItem('cinemoji_player_name');
  if (savedName) {
    state.playerName = savedName;
    DOM.usernameInput.value = savedName;
  }
  
  const savedCoins = localStorage.getItem('cinemoji_coins');
  if (savedCoins) state.coins = parseInt(savedCoins, 10);
  
  const savedLevel = localStorage.getItem('cinemoji_classic_level');
  if (savedLevel) state.classicLevel = parseInt(savedLevel, 10);

  const savedLevelSolved = localStorage.getItem('cinemoji_classic_solved');
  if (savedLevelSolved) state.classicLevelSolved = parseInt(savedLevelSolved, 10);
  
  const savedSound = localStorage.getItem('cinemoji_sound');
  if (savedSound !== null) {
    state.soundEnabled = savedSound === 'true';
    sfx.enabled = state.soundEnabled;
    DOM.soundCheckbox.checked = state.soundEnabled;
  }
  
  const savedKbd = localStorage.getItem('cinemoji_keyboard_mode');
  if (savedKbd !== null) {
    state.keyboardMode = savedKbd === 'true';
    DOM.keyboardToggle.checked = state.keyboardMode;
  }
  
  const savedTotalSolved = localStorage.getItem('cinemoji_total_solved');
  if (savedTotalSolved) state.totalSolvedAllTime = parseInt(savedTotalSolved, 10);
  
  const savedTotalCoins = localStorage.getItem('cinemoji_total_coins');
  if (savedTotalCoins) state.totalCoinsAllTime = parseInt(savedTotalCoins, 10);
  
  const savedLB = localStorage.getItem('cinemoji_leaderboards');
  if (savedLB) {
    try {
      state.leaderboards = JSON.parse(savedLB);
    } catch(e) {
      console.error(e);
    }
  }

  // Load multiplayer names
  const savedMpP1 = localStorage.getItem('cinemoji_mp_p1');
  if (savedMpP1) {
    state.mpPlayer1Name = savedMpP1;
    const p1Input = document.getElementById('username-p1');
    if (p1Input) p1Input.value = savedMpP1;
  }
  const savedMpP2 = localStorage.getItem('cinemoji_mp_p2');
  if (savedMpP2) {
    state.mpPlayer2Name = savedMpP2;
    const p2Input = document.getElementById('username-p2');
    if (p2Input) p2Input.value = savedMpP2;
  }
}

// Save crucial progress data
function saveProgress() {
  localStorage.setItem('cinemoji_player_name', state.playerName);
  localStorage.setItem('cinemoji_coins', state.coins);
  localStorage.setItem('cinemoji_classic_level', state.classicLevel);
  localStorage.setItem('cinemoji_classic_solved', state.classicLevelSolved);
  localStorage.setItem('cinemoji_total_solved', state.totalSolvedAllTime);
  localStorage.setItem('cinemoji_total_coins', state.totalCoinsAllTime);
  localStorage.setItem('cinemoji_leaderboards', JSON.stringify(state.leaderboards));
  
  localStorage.setItem('cinemoji_mp_p1', state.mpPlayer1Name);
  localStorage.setItem('cinemoji_mp_p2', state.mpPlayer2Name);
}

// Add event handlers
function setupEventListeners() {
  // Theme Switching
  DOM.themeToggle.addEventListener('click', () => {
    sfx.playClick();
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('cinemoji_theme', newTheme);
    updateThemeUI();
  });
  
  // Sound toggling (header button)
  DOM.soundToggle.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    sfx.enabled = state.soundEnabled;
    DOM.soundCheckbox.checked = state.soundEnabled;
    localStorage.setItem('cinemoji_sound', state.soundEnabled);
    updateSoundUI();
    sfx.playClick();
  });
  
  // Mode selection helper
  function selectGameMode(mode) {
    state.currentMode = mode;
    DOM.modeClassic.classList.toggle('selected', mode === 'classic');
    DOM.modeTimeAttack.classList.toggle('selected', mode === 'timeattack');
    DOM.modeMultiplayer.classList.toggle('selected', mode === 'multiplayer');
    
    const singleGroup = document.getElementById('single-player-name-group');
    const multiGroup = document.getElementById('multiplayer-names-group');
    if (mode === 'multiplayer') {
      singleGroup.style.display = 'none';
      multiGroup.style.display = 'flex';
    } else {
      singleGroup.style.display = 'flex';
      multiGroup.style.display = 'none';
    }
  }

  // Welcome page mode pickers
  DOM.modeClassic.addEventListener('click', () => {
    sfx.playClick();
    selectGameMode('classic');
  });
  
  DOM.modeTimeAttack.addEventListener('click', () => {
    sfx.playClick();
    selectGameMode('timeattack');
  });

  DOM.modeMultiplayer.addEventListener('click', () => {
    sfx.playClick();
    selectGameMode('multiplayer');
  });
  
  // Start game click
  DOM.startGameBtn.addEventListener('click', () => {
    sfx.playClick();
    if (state.currentMode === 'multiplayer') {
      const p1Input = document.getElementById('username-p1');
      const p2Input = document.getElementById('username-p2');
      state.mpPlayer1Name = p1Input.value.trim() || "Player 1";
      state.mpPlayer2Name = p2Input.value.trim() || "Player 2";
      saveProgress();
    } else {
      const nameVal = DOM.usernameInput.value.trim();
      state.playerName = nameVal || "Player 1";
      saveProgress();
    }
    
    // Switch Screen
    DOM.welcomeScreen.classList.remove('active');
    DOM.gameScreen.classList.add('active');
    
    startGameSession();
  });

  // Pass turn button in multiplayer
  DOM.passTurnBtn.addEventListener('click', () => {
    sfx.playClick();
    if (state.currentMode === 'multiplayer') {
      clearInterval(state.timerInterval);
      const activePlayerName = state.mpActivePlayerIndex === 0 ? state.mpPlayer1Name : state.mpPlayer2Name;
      showFeedbackModalMp('pass', activePlayerName);
    }
  });
  
  // Exit back to menu
  DOM.backToMenuBtn.addEventListener('click', () => {
    sfx.playClick();
    exitGameSession();
  });
  
  // Clear letters choice button
  DOM.clearLettersBtn.addEventListener('click', () => {
    sfx.playClick();
    resetGuessedLetters();
  });
  
  // Mode selection inside leaderboard modal
  DOM.lbTabClassic.addEventListener('click', () => {
    sfx.playClick();
    renderLeaderboardList('classic');
  });
  
  DOM.lbTabTime.addEventListener('click', () => {
    sfx.playClick();
    renderLeaderboardList('timeattack');
  });
  
  // Hints buying
  DOM.hintGenreBtn.addEventListener('click', buyHintGenre);
  DOM.hintLetterBtn.addEventListener('click', buyHintLetter);
  DOM.hintSkipBtn.addEventListener('click', buyHintSkip);
  
  // Modals showing
  DOM.leaderboardBtn.addEventListener('click', () => {
    sfx.playClick();
    showLeaderboardModal();
  });
  
  DOM.leaderboardClose.addEventListener('click', () => {
    sfx.playClick();
    DOM.leaderboardModal.classList.remove('active');
  });
  
  DOM.settingsBtn.addEventListener('click', () => {
    sfx.playClick();
    DOM.settingsModal.classList.add('active');
  });
  
  DOM.settingsClose.addEventListener('click', () => {
    sfx.playClick();
    DOM.settingsModal.classList.remove('active');
  });
  
  // Settings checkbox options
  DOM.soundCheckbox.addEventListener('change', (e) => {
    state.soundEnabled = e.target.checked;
    sfx.enabled = state.soundEnabled;
    localStorage.setItem('cinemoji_sound', state.soundEnabled);
    updateSoundUI();
    sfx.playClick();
  });
  
  DOM.keyboardToggle.addEventListener('change', (e) => {
    state.keyboardMode = e.target.checked;
    localStorage.setItem('cinemoji_keyboard_mode', state.keyboardMode);
    sfx.playClick();
    updateInputModeUI();
  });
  
  DOM.resetGameDataBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all coins, scores, stats, and classic levels progress? This cannot be undone.")) {
      sfx.playFail();
      localStorage.clear();
      state.coins = 0;
      state.classicLevel = 0;
      state.classicLevelSolved = 0;
      state.totalSolvedAllTime = 0;
      state.totalCoinsAllTime = 0;
      state.leaderboards = { classic: [], timeattack: [] };
      state.playerName = "Player 1";
      DOM.usernameInput.value = "Player 1";
      saveProgress();
      DOM.settingsModal.classList.remove('active');
      exitGameSession();
      updateCoinsDisplay();
      alert("Game database reset successful!");
    }
  });
  
  // Next button click on feedback screen
  DOM.feedbackNextBtn.addEventListener('click', () => {
    sfx.playClick();
    DOM.feedbackModal.classList.remove('active');
    if (state.currentMode === 'multiplayer') {
      nextMpTurn();
    } else {
      loadNextMovie();
    }
  });
  
  // Game over screen interactions
  DOM.goRestartBtn.addEventListener('click', () => {
    sfx.playClick();
    DOM.gameOverModal.classList.remove('active');
    startGameSession();
  });
  
  DOM.goMenuBtn.addEventListener('click', () => {
    sfx.playClick();
    DOM.gameOverModal.classList.remove('active');
    exitGameSession();
  });
  
  // Manual / Keyboard text submission
  DOM.manualSubmitBtn.addEventListener('click', checkManualTextGuess);
  DOM.manualTextInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      checkManualTextGuess();
    }
  });

  // Clicking logo goes home
  DOM.logoBtn.addEventListener('click', () => {
    sfx.playClick();
    exitGameSession();
  });
}

// Start visual UI updates
function updateThemeUI() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    DOM.sunIcon.style.display = 'block';
    DOM.moonIcon.style.display = 'none';
  } else {
    DOM.sunIcon.style.display = 'none';
    DOM.moonIcon.style.display = 'block';
  }
}

function updateSoundUI() {
  if (state.soundEnabled) {
    DOM.soundOnIcon.style.display = 'block';
    DOM.soundOffIcon.style.display = 'none';
  } else {
    DOM.soundOnIcon.style.display = 'none';
    DOM.soundOffIcon.style.display = 'block';
  }
}

function updateCoinsDisplay() {
  DOM.coinsVal.textContent = state.coins;
}

// Start Game Mode
function startGameSession() {
  state.score = 0;
  state.streak = 0;
  state.lives = 3;
  
  // Reset visibility states and modal formatting
  DOM.multiplayerStats.style.display = 'none';
  DOM.passTurnBtn.style.display = 'none';
  DOM.singlePlayerCoins.style.display = 'flex';
  if (DOM.hintContainerWrapper) DOM.hintContainerWrapper.style.display = 'block';
  
  // Reset Game Over modal to standard values
  const modalTitle = DOM.gameOverModal.querySelector('.modal-title');
  if (modalTitle) {
    modalTitle.textContent = "Game Over";
    modalTitle.style.color = "var(--color-error)";
  }
  const modalIcon = DOM.gameOverModal.querySelector('.modal-icon');
  if (modalIcon) {
    modalIcon.textContent = "💀";
  }
  if (DOM.goStatScoreLbl) DOM.goStatScoreLbl.textContent = "Score";
  const bestLabel = DOM.goStatBest.nextElementSibling;
  if (bestLabel) bestLabel.textContent = "Best Streak";

  // Setup movies array for classic level
  if (state.currentMode === 'classic') {
    DOM.classicStats.style.display = 'block';
    DOM.timeAttackStats.style.display = 'none';
    DOM.livesContainer.style.display = 'flex';
    
    // Classic level selection
    // Randomize the movies list but keep seed based on progress or simple random
    shuffleClassicSet();
    
    // If player level index exceeds the movie catalog, reset loop or wrap
    if (state.classicLevel >= state.shuffledClassicMovies.length) {
      state.classicLevel = 0; // reset back to level 1 but shuffle again
      shuffleClassicSet();
    }
    
    state.activeMovieIndex = state.classicLevel;
    state.activeMovie = state.shuffledClassicMovies[state.activeMovieIndex];
  } else if (state.currentMode === 'timeattack') {
    // Time Attack
    DOM.classicStats.style.display = 'none';
    DOM.timeAttackStats.style.display = 'block';
    DOM.livesContainer.style.display = 'none';
    state.timeRemaining = 60;
    DOM.timerVal.textContent = `${state.timeRemaining}s`;
    DOM.timerVal.classList.remove('timer-warn');
    
    // Choose random movie
    selectRandomTimeAttackMovie();
    
    // Start countdown timer
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(updateCountdown, 1000);
  } else if (state.currentMode === 'multiplayer') {
    // Local Versus Multiplayer
    DOM.classicStats.style.display = 'none';
    DOM.timeAttackStats.style.display = 'none';
    DOM.livesContainer.style.display = 'none';
    DOM.singlePlayerCoins.style.display = 'none';
    if (DOM.hintContainerWrapper) DOM.hintContainerWrapper.style.display = 'none';
    
    DOM.multiplayerStats.style.display = 'flex';
    DOM.passTurnBtn.style.display = 'inline-flex';
    
    // Setup multiplayer specific parameters
    state.mpScores = [0, 0];
    state.mpActivePlayerIndex = 0;
    state.mpRound = 1;
    state.mpTimerRemaining = 30;
    
    // Choose movies for multiplayer session
    selectMultiplayerMovies();
    
    DOM.mpTimerVal.textContent = `${state.mpTimerRemaining}s`;
    DOM.mpTimerVal.classList.remove('timer-warn');
    updateMpScoreboard();
    
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(updateMpCountdown, 1000);
  }
  
  // Load UI for current movie
  loadMovieBoard();
}

// Shuffle classic movie collection
function shuffleClassicSet() {
  // Use a pseudo-random shuffle that ensures they see a fun random distribution
  // We can seed or copy the array
  const temp = [...movies];
  // Simple Fisher-Yates shuffle
  for (let i = temp.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [temp[i], temp[j]] = [temp[j], temp[i]];
  }
  state.shuffledClassicMovies = temp;
}

function selectRandomTimeAttackMovie() {
  const index = Math.floor(Math.random() * movies.length);
  state.activeMovie = movies[index];
}

// Main countdown for time attack
function updateCountdown() {
  state.timeRemaining--;
  if (state.timeRemaining <= 0) {
    state.timeRemaining = 0;
    DOM.timerVal.textContent = "0s";
    clearInterval(state.timerInterval);
    handleTimeOut();
  } else {
    DOM.timerVal.textContent = `${state.timeRemaining}s`;
    if (state.timeRemaining <= 10) {
      DOM.timerVal.classList.add('timer-warn');
      sfx.playTone(400, 'sine', 0.1, 0, 0.05); // tick warning
    } else {
      DOM.timerVal.classList.remove('timer-warn');
    }
  }
}

// When timer hits 0
function handleTimeOut() {
  sfx.playGameOver();
  saveScoreToLeaderboard('timeattack', state.score);
  
  DOM.gameOverMsg.textContent = `Time's up! You solved ${state.score} movies in Time Attack.`;
  DOM.goStatScore.textContent = state.score;
  DOM.goStatScoreLbl.textContent = "Movies Solved";
  
  // Calculate best streak or top score
  const best = getBestScore('timeattack');
  DOM.goStatBest.textContent = best;
  
  DOM.gameOverModal.classList.add('active');
}

// Exit to main menu
function exitGameSession() {
  clearInterval(state.timerInterval);
  DOM.gameScreen.classList.remove('active');
  DOM.welcomeScreen.classList.add('active');
  
  // Reset visibility states
  DOM.multiplayerStats.style.display = 'none';
  DOM.passTurnBtn.style.display = 'none';
  DOM.singlePlayerCoins.style.display = 'flex';
  DOM.livesContainer.style.display = 'flex';
  if (DOM.hintContainerWrapper) DOM.hintContainerWrapper.style.display = 'block';
}

// Build question card displays
function loadMovieBoard() {
  const movie = state.activeMovie;
  if (!movie) {
    alert("Oops! No movies loaded. Please reset database.");
    exitGameSession();
    return;
  }
  
  state.levelStartTime = Date.now();
  
  // Setup details / genre hint
  DOM.genreBadge.style.visibility = 'hidden';
  DOM.genreVal.textContent = movie.genre;
  
  // Display emojis
  DOM.emojiDisplay.textContent = movie.emojis;
  
  // Setup level labels
  if (state.currentMode === 'classic') {
    DOM.levelIndicator.textContent = `Level ${state.classicLevelSolved + 1}`;
    updateLivesUI();
  } else if (state.currentMode === 'multiplayer') {
    // Update active player badge and round indicator
    const activeBadge = DOM.mpActivePlayer;
    const pName = state.mpActivePlayerIndex === 0 ? state.mpPlayer1Name : state.mpPlayer2Name;
    activeBadge.textContent = `${pName}'s Turn`;
    
    if (state.mpActivePlayerIndex === 0) {
      activeBadge.className = 'active-player-badge p1-active';
    } else {
      activeBadge.className = 'active-player-badge p2-active';
    }
    
    DOM.mpRoundIndicator.textContent = `Round ${state.mpRound}/${state.mpMaxRounds}`;
    updateMpScoreboard();
  }
  
  // Build Letter Slots & Clean tracking
  setupLetterSlots(movie.title);
  
  // Setup letter bank or input text keyboard fallback
  updateInputModeUI();
  
  // Reset hint buttons state depending on coins
  updateHintsAvailability();
}

// Calculate the word grouping structures for movie titles
function setupLetterSlots(title) {
  DOM.wordSlots.innerHTML = '';
  state.guessedLetters = [];
  state.selectedPoolIndices = [];
  state.revealedSlotIndices.clear();
  
  // Split title into words
  const words = title.split(' ');
  let letterIndex = 0; // global index across all letter slots
  
  words.forEach((word) => {
    const wordGroupDiv = document.createElement('div');
    wordGroupDiv.className = 'word-group';
    
    // Iterate characters in word
    for (let char of word) {
      // We only create input slots for alphanumeric values
      if (/[a-zA-Z0-9]/.test(char)) {
        const slot = document.createElement('div');
        slot.className = 'letter-slot';
        slot.setAttribute('data-index', letterIndex);
        
        // Track states
        state.guessedLetters.push(null);
        state.selectedPoolIndices.push(null);
        
        // Handle clicking a slot to empty it
        slot.addEventListener('click', () => {
          if (!state.keyboardMode) {
            handleSlotClick(parseInt(slot.getAttribute('data-index'), 10));
          }
        });
        
        wordGroupDiv.appendChild(slot);
        letterIndex++;
      } else {
        // Render static punctuation symbols
        const staticSpan = document.createElement('span');
        staticSpan.style.fontSize = '1.8rem';
        staticSpan.style.fontWeight = '700';
        staticSpan.style.alignSelf = 'flex-end';
        staticSpan.style.margin = '0 0.1rem';
        staticSpan.textContent = char;
        wordGroupDiv.appendChild(staticSpan);
      }
    }
    
    DOM.wordSlots.appendChild(wordGroupDiv);
  });
  
  // Generate and display Scrambled Letter bank
  generateScrambledLetters(title);
}

// Construct pool of letters
function generateScrambledLetters(title) {
  DOM.letterBank.innerHTML = '';
  
  // Extract correct alphanumeric letters
  const normalizedChars = title.toUpperCase().replace(/[^A-Z0-9]/g, '').split('');
  
  // Fill pool up to 16 letters with random choices
  const bankSize = Math.max(16, normalizedChars.length);
  const fillers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  while (normalizedChars.length < bankSize) {
    const randChar = fillers[Math.floor(Math.random() * fillers.length)];
    normalizedChars.push(randChar);
  }
  
  // Shuffle Fisher-Yates
  for (let i = normalizedChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [normalizedChars[i], normalizedChars[j]] = [normalizedChars[j], normalizedChars[i]];
  }
  
  // Store pool in game state
  state.letterPool = normalizedChars.map((letter, idx) => ({
    letter: letter,
    id: idx,
    used: false
  }));
  
  // Populate DOM buttons
  state.letterPool.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'letter-btn';
    btn.textContent = item.letter;
    btn.setAttribute('data-id', item.id);
    
    btn.addEventListener('click', () => {
      handleBankButtonClick(item.id);
    });
    
    DOM.letterBank.appendChild(btn);
  });
}

// Slot click clears letters
function handleSlotClick(slotIndex) {
  // If slot has hint-reveal lock, ignore
  if (state.revealedSlotIndices.has(slotIndex)) return;
  
  const poolIndex = state.selectedPoolIndices[slotIndex];
  if (poolIndex !== null && poolIndex !== undefined) {
    sfx.playClick();
    
    // Release pool letter
    state.letterPool[poolIndex].used = false;
    const poolBtn = DOM.letterBank.querySelector(`[data-id="${poolIndex}"]`);
    if (poolBtn) poolBtn.classList.remove('used');
    
    // Clear slot
    state.guessedLetters[slotIndex] = null;
    state.selectedPoolIndices[slotIndex] = null;
    
    updateSlotUI(slotIndex);
  }
}

// Clicking bank button fills slot
function handleBankButtonClick(poolIndex) {
  const poolItem = state.letterPool[poolIndex];
  if (poolItem.used) return;
  
  // Find first empty slot index
  const emptyIndex = state.guessedLetters.findIndex((val, idx) => val === null);
  if (emptyIndex !== -1) {
    sfx.playClick();
    
    // Mark pool used
    poolItem.used = true;
    const poolBtn = DOM.letterBank.querySelector(`[data-id="${poolIndex}"]`);
    if (poolBtn) poolBtn.classList.add('used');
    
    // Fill slot
    state.guessedLetters[emptyIndex] = poolItem.letter;
    state.selectedPoolIndices[emptyIndex] = poolIndex;
    
    updateSlotUI(emptyIndex);
    
    // Check if slots are fully filled
    checkSubmitProgress();
  }
}

// Refresh visual slot content
function updateSlotUI(slotIndex) {
  const slots = DOM.wordSlots.querySelectorAll('.letter-slot');
  const slot = slots[slotIndex];
  if (slot) {
    const val = state.guessedLetters[slotIndex];
    slot.textContent = val || '';
    if (val) {
      slot.classList.add('filled');
    } else {
      slot.classList.remove('filled');
    }
  }
}

// Reset letters filled by player
function resetGuessedLetters() {
  state.guessedLetters.forEach((letter, idx) => {
    if (!state.revealedSlotIndices.has(idx)) {
      handleSlotClick(idx);
    }
  });
}

// Test progress for completion
function checkSubmitProgress() {
  const isFilled = state.guessedLetters.every(val => val !== null);
  if (isFilled) {
    // Check match
    const finalGuess = state.guessedLetters.join('').toUpperCase();
    const correctNormalized = state.activeMovie.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (finalGuess === correctNormalized) {
      if (state.currentMode === 'multiplayer') {
        handleCorrectGuessMp();
      } else {
        handleCorrectGuess();
      }
    } else {
      handleIncorrectGuess();
    }
  }
}

// Validate text typed in keyboard mode
function checkManualTextGuess() {
  const typed = DOM.manualTextInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const correctNormalized = state.activeMovie.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (!typed) return;
  
  if (typed === correctNormalized) {
    DOM.manualTextInput.value = '';
    if (state.currentMode === 'multiplayer') {
      handleCorrectGuessMp();
    } else {
      handleCorrectGuess();
    }
  } else {
    DOM.manualTextInput.value = '';
    handleIncorrectGuess();
  }
}

// Action on correct guess
function handleCorrectGuess() {
  sfx.playSuccess();
  launchConfetti();
  
  // Calculate reward details
  let earnedCoins = 10; // base
  
  // Difficulty multiplier
  if (state.activeMovie.difficulty === 'medium') earnedCoins += 5;
  if (state.activeMovie.difficulty === 'hard') earnedCoins += 10;
  
  // Speed bonus
  const durationSec = (Date.now() - state.levelStartTime) / 1000;
  let speedBonus = false;
  if (durationSec < 15) {
    earnedCoins += 5;
    speedBonus = true;
  }
  
  // Streak bonus
  state.streak++;
  const streakBonusVal = Math.min(10, Math.floor(state.streak / 2) * 2);
  earnedCoins += streakBonusVal;
  
  // Credit coins
  state.coins += earnedCoins;
  state.totalCoinsAllTime += earnedCoins;
  state.totalSolvedAllTime++;
  
  if (state.currentMode === 'classic') {
    state.score++;
    state.classicLevelSolved++;
    // Advance levels count
    state.classicLevel++;
  } else {
    // Time attack
    state.score++;
    // Add bonus time to the clock
    state.timeRemaining = Math.min(99, state.timeRemaining + 10);
    DOM.timerVal.textContent = `${state.timeRemaining}s`;
    
    // Trigger splash text or feedback card
    const plusSpan = document.createElement('span');
    plusSpan.textContent = "+10s";
    plusSpan.style.color = "var(--color-success)";
    plusSpan.style.fontWeight = "bold";
    plusSpan.style.marginLeft = "10px";
    plusSpan.style.animation = "float 1s ease-out forwards";
    DOM.timeAttackStats.appendChild(plusSpan);
    setTimeout(() => plusSpan.remove(), 1000);
  }
  
  saveProgress();
  updateCoinsDisplay();
  
  // Display success feedback modal
  showFeedbackModal(true, earnedCoins, speedBonus, streakBonusVal);
}

// Action on wrong guess
function handleIncorrectGuess() {
  sfx.playFail();
  
  // Shake main question container
  DOM.emojiDisplay.classList.add('shake');
  DOM.wordSlots.classList.add('shake');
  setTimeout(() => {
    DOM.emojiDisplay.classList.remove('shake');
    DOM.wordSlots.classList.remove('shake');
  }, 400);
  
  if (state.currentMode === 'classic') {
    state.lives--;
    updateLivesUI();
    state.streak = 0; // break streak
    
    if (state.lives <= 0) {
      handleGameOver();
    }
  } else {
    // Time Attack penalty
    state.timeRemaining = Math.max(0, state.timeRemaining - 5);
    DOM.timerVal.textContent = `${state.timeRemaining}s`;
    
    const minusSpan = document.createElement('span');
    minusSpan.textContent = "-5s";
    minusSpan.style.color = "var(--color-error)";
    minusSpan.style.fontWeight = "bold";
    minusSpan.style.marginLeft = "10px";
    minusSpan.style.animation = "float 1s ease-out forwards";
    DOM.timeAttackStats.appendChild(minusSpan);
    setTimeout(() => minusSpan.remove(), 1000);
    
    if (state.timeRemaining <= 0) {
      handleTimeOut();
    }
  }
}

// Handle classic Game Over
function handleGameOver() {
  sfx.playGameOver();
  saveScoreToLeaderboard('classic', state.score);
  
  DOM.gameOverMsg.textContent = `You reached level ${state.classicLevelSolved + 1} with a score of ${state.score}!`;
  DOM.goStatScore.textContent = state.score;
  DOM.goStatScoreLbl.textContent = "Final Score";
  
  const best = getBestScore('classic');
  DOM.goStatBest.textContent = best;
  
  DOM.gameOverModal.classList.add('active');
}

// Advance to next movie after feedback
function loadNextMovie() {
  if (state.currentMode === 'classic') {
    // Check if we solved all movies
    if (state.classicLevel >= state.shuffledClassicMovies.length) {
      sfx.playWinGame();
      alert("Congratulations! You completed all the movies in the database! We will restart and mix them up again.");
      state.classicLevel = 0;
      shuffleClassicSet();
    }
    
    state.activeMovieIndex = state.classicLevel;
    state.activeMovie = state.shuffledClassicMovies[state.activeMovieIndex];
    saveProgress();
  } else {
    // Time attack
    selectRandomTimeAttackMovie();
  }
  
  loadMovieBoard();
}

// Lives visual indicators (hearts)
function updateLivesUI() {
  DOM.livesContainer.innerHTML = '';
  const heartsCount = state.lives;
  for (let i = 0; i < 3; i++) {
    const heart = document.createElement('span');
    heart.style.fontSize = '1.3rem';
    heart.textContent = i < heartsCount ? '❤️' : '🖤';
    DOM.livesContainer.appendChild(heart);
  }
}

// Display Feedback popup modal details
function showFeedbackModal(isSuccess, coinsEarned, speedBonus, streakBonusVal) {
  if (isSuccess) {
    DOM.feedbackTitle.textContent = "Awesome!";
    DOM.feedbackTitle.style.color = "var(--color-success)";
    DOM.feedbackIcon.textContent = "🎉";
    
    // Add success flash effect
    DOM.gameScreen.classList.add('success-flash');
    setTimeout(() => DOM.gameScreen.classList.remove('success-flash'), 500);
    
    let detailsText = `"${state.activeMovie.title}" (${state.activeMovie.year})`;
    DOM.feedbackMovieDetails.textContent = detailsText;
    
    let msg = `Difficulty: ${state.activeMovie.difficulty.toUpperCase()} | `;
    if (speedBonus) msg += "⚡ Speed Bonus! ";
    if (streakBonusVal > 0) msg += `🔥 Streak +${state.streak}!`;
    DOM.feedbackMsg.textContent = msg;
    
    DOM.feedbackCoinsEarned.textContent = `+${coinsEarned} Coins`;
    DOM.feedbackCoinsEarned.style.display = 'block';
  }
  
  DOM.feedbackModal.classList.add('active');
}

// Switch between grid letters vs real keyboard input
function updateInputModeUI() {
  if (state.keyboardMode) {
    DOM.letterBank.style.display = 'none';
    DOM.clearLettersBtn.style.display = 'none';
    DOM.fallbackContainer.classList.add('active');
    DOM.manualTextInput.focus();
  } else {
    DOM.letterBank.style.display = 'flex';
    DOM.clearLettersBtn.style.display = 'inline-flex';
    DOM.fallbackContainer.classList.remove('active');
  }
}

// Re-evaluate coins vs costs
function updateHintsAvailability() {
  // Reveal genre cost 15
  DOM.hintGenreBtn.disabled = state.coins < 15;
  // Reveal letter cost 25
  DOM.hintLetterBtn.disabled = state.coins < 25;
  // Skip cost 50 (Classic only)
  DOM.hintSkipBtn.disabled = state.coins < 50 || state.currentMode !== 'classic';
}

// Hint actions
function buyHintGenre() {
  if (state.coins >= 15) {
    sfx.playHint();
    state.coins -= 15;
    updateCoinsDisplay();
    updateHintsAvailability();
    
    DOM.genreBadge.style.visibility = 'visible';
    DOM.genreBadge.style.animation = 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    saveProgress();
  }
}

function buyHintLetter() {
  if (state.coins >= 25) {
    // Find empty indices that are NOT revealed
    const emptyIndices = [];
    state.guessedLetters.forEach((letter, idx) => {
      if (!state.revealedSlotIndices.has(idx)) {
        emptyIndices.push(idx);
      }
    });
    
    if (emptyIndices.length > 0) {
      sfx.playHint();
      state.coins -= 25;
      updateCoinsDisplay();
      updateHintsAvailability();
      
      // Select random unfilled index
      const targetSlotIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      const targetChar = getTargetCharacterAtSlot(targetSlotIdx);
      
      // If player placed something there, remove it
      if (state.guessedLetters[targetSlotIdx] !== null) {
        handleSlotClick(targetSlotIdx);
      }
      
      // Find this character in the pool to mark as used
      const poolIdx = state.letterPool.findIndex(item => item.letter === targetChar && !item.used);
      if (poolIdx !== -1) {
        state.letterPool[poolIdx].used = true;
        const poolBtn = DOM.letterBank.querySelector(`[data-id="${poolIdx}"]`);
        if (poolBtn) poolBtn.classList.add('used');
      }
      
      // Set slot as locked reveal
      state.guessedLetters[targetSlotIdx] = targetChar;
      state.selectedPoolIndices[targetSlotIdx] = poolIdx !== -1 ? poolIdx : null;
      state.revealedSlotIndices.add(targetSlotIdx);
      
      // Update UI
      const slots = DOM.wordSlots.querySelectorAll('.letter-slot');
      const slot = slots[targetSlotIdx];
      if (slot) {
        slot.textContent = targetChar;
        slot.classList.add('filled', 'revealed');
      }
      
      saveProgress();
      checkSubmitProgress();
    }
  }
}

// Get the specific character of target movie at given slot index
function getTargetCharacterAtSlot(slotIndex) {
  const lettersOnly = state.activeMovie.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return lettersOnly[slotIndex];
}

function buyHintSkip() {
  if (state.coins >= 50 && state.currentMode === 'classic') {
    sfx.playHint();
    state.coins -= 50;
    updateCoinsDisplay();
    updateHintsAvailability();
    
    state.classicLevel++;
    state.classicLevelSolved++;
    saveProgress();
    
    loadNextMovie();
  }
}

// --- Leaderboard functionality ---
function showLeaderboardModal() {
  // Update totals
  DOM.statsTotalSolved.textContent = state.totalSolvedAllTime;
  DOM.statsTotalCoins.textContent = state.totalCoinsAllTime;
  
  // Render Leaderboard list
  renderLeaderboardList('classic');
  
  DOM.leaderboardModal.classList.add('active');
}

function renderLeaderboardList(mode) {
  // Set tab buttons
  if (mode === 'classic') {
    DOM.lbTabClassic.style.borderColor = 'var(--color-brand)';
    DOM.lbTabTime.style.borderColor = 'transparent';
  } else {
    DOM.lbTabTime.style.borderColor = 'var(--color-brand)';
    DOM.lbTabClassic.style.borderColor = 'transparent';
  }
  
  DOM.leaderboardScoresContainer.innerHTML = '';
  
  const scores = state.leaderboards[mode] || [];
  
  if (scores.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.color = 'var(--text-secondary)';
    emptyMsg.style.padding = '1.5rem 0';
    emptyMsg.textContent = "No scores yet. Start playing to set a record!";
    DOM.leaderboardScoresContainer.appendChild(emptyMsg);
    return;
  }
  
  // Sort descending
  const sorted = [...scores].sort((a, b) => b.score - a.score).slice(0, 5);
  
  sorted.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = `leaderboard-item ${index === 0 ? 'top' : ''}`;
    
    const leftText = document.createElement('span');
    const medal = index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : `${index + 1}. `;
    leftText.textContent = `${medal}${item.name}`;
    
    const rightText = document.createElement('span');
    rightText.style.fontWeight = 'bold';
    rightText.textContent = `${item.score} pts`;
    
    div.appendChild(leftText);
    div.appendChild(rightText);
    DOM.leaderboardScoresContainer.appendChild(div);
  });
}

function saveScoreToLeaderboard(mode, score) {
  if (!state.leaderboards[mode]) {
    state.leaderboards[mode] = [];
  }
  
  // Add new score
  state.leaderboards[mode].push({
    name: state.playerName,
    score: score,
    date: new Date().toLocaleDateString()
  });
  
  // Keep only top 10 values
  state.leaderboards[mode].sort((a, b) => b.score - a.score);
  state.leaderboards[mode] = state.leaderboards[mode].slice(0, 10);
  
  saveProgress();
}

function getBestScore(mode) {
  const scores = state.leaderboards[mode] || [];
  if (scores.length === 0) return 0;
  return Math.max(...scores.map(s => s.score));
}

// --- Local Multiplayer (Versus) Helper Functions ---

function selectMultiplayerMovies() {
  const temp = [...movies];
  // Simple Fisher-Yates shuffle
  for (let i = temp.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [temp[i], temp[j]] = [temp[j], temp[i]];
  }
  // Store 10 movies for 5 rounds (each player plays 5 movies)
  state.mpMovies = temp.slice(0, state.mpMaxRounds * 2);
  state.activeMovie = state.mpMovies[0];
  state.activeMovieIndex = 0;
}

function updateMpCountdown() {
  state.mpTimerRemaining--;
  if (state.mpTimerRemaining <= 0) {
    state.mpTimerRemaining = 0;
    DOM.mpTimerVal.textContent = "0s";
    clearInterval(state.timerInterval);
    
    // Time out
    const activePlayerName = state.mpActivePlayerIndex === 0 ? state.mpPlayer1Name : state.mpPlayer2Name;
    showFeedbackModalMp('timeout', activePlayerName);
  } else {
    DOM.mpTimerVal.textContent = `${state.mpTimerRemaining}s`;
    if (state.mpTimerRemaining <= 5) {
      DOM.mpTimerVal.classList.add('timer-warn');
      sfx.playTone(400, 'sine', 0.08, 0, 0.05); // tick tone
    } else {
      DOM.mpTimerVal.classList.remove('timer-warn');
    }
  }
}

function handleCorrectGuessMp() {
  clearInterval(state.timerInterval);
  state.mpScores[state.mpActivePlayerIndex]++;
  updateMpScoreboard();
  
  const activePlayerName = state.mpActivePlayerIndex === 0 ? state.mpPlayer1Name : state.mpPlayer2Name;
  showFeedbackModalMp('success', activePlayerName);
}

function updateMpScoreboard() {
  DOM.mpScoreboard.innerHTML = `
    <span style="color: var(--color-brand); font-weight: bold;">${state.mpPlayer1Name}: ${state.mpScores[0]}</span>
    <span style="color: var(--text-secondary); margin: 0 0.25rem;">vs</span>
    <span style="color: var(--color-accent); font-weight: bold;">${state.mpPlayer2Name}: ${state.mpScores[1]}</span>
  `;
}

function showFeedbackModalMp(type, playerName) {
  DOM.feedbackCoinsEarned.style.display = 'none';
  
  let detailsText = `"${state.activeMovie.title}" (${state.activeMovie.year})`;
  DOM.feedbackMovieDetails.textContent = detailsText;
  
  if (type === 'success') {
    sfx.playSuccess();
    launchConfetti();
    DOM.feedbackTitle.textContent = "Correct!";
    DOM.feedbackTitle.style.color = "var(--color-success)";
    DOM.feedbackIcon.textContent = "🎉";
    DOM.feedbackMsg.textContent = `${playerName} guessed it correctly and gets 1 point!`;
  } else if (type === 'pass') {
    sfx.playClick();
    DOM.feedbackTitle.textContent = "Passed!";
    DOM.feedbackTitle.style.color = "var(--color-warning)";
    DOM.feedbackIcon.textContent = "⏩";
    DOM.feedbackMsg.textContent = `${playerName} passed this turn.`;
  } else if (type === 'timeout') {
    sfx.playFail();
    DOM.feedbackTitle.textContent = "Time's Up!";
    DOM.feedbackTitle.style.color = "var(--color-error)";
    DOM.feedbackIcon.textContent = "⏰";
    DOM.feedbackMsg.textContent = `${playerName} ran out of time.`;
  }
  
  DOM.feedbackModal.classList.add('active');
}

function nextMpTurn() {
  clearInterval(state.timerInterval);
  state.activeMovieIndex++;
  
  if (state.activeMovieIndex >= state.mpMaxRounds * 2) {
    handleMpGameOver();
    return;
  }
  
  state.mpActivePlayerIndex = state.activeMovieIndex % 2;
  state.mpRound = Math.floor(state.activeMovieIndex / 2) + 1;
  state.activeMovie = state.mpMovies[state.activeMovieIndex];
  
  loadMovieBoard();
  
  state.mpTimerRemaining = 30;
  DOM.mpTimerVal.textContent = `${state.mpTimerRemaining}s`;
  DOM.mpTimerVal.classList.remove('timer-warn');
  
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(updateMpCountdown, 1000);
}

function handleMpGameOver() {
  sfx.playWinGame();
  
  const p1 = state.mpPlayer1Name;
  const p2 = state.mpPlayer2Name;
  const s1 = state.mpScores[0];
  const s2 = state.mpScores[1];
  
  let titleText = "";
  let msgText = "";
  let icon = "🏆";
  
  if (s1 > s2) {
    titleText = `${p1} Wins!`;
    msgText = `${p1} defeated ${p2} by ${s1} to ${s2}!`;
    icon = "👑";
  } else if (s2 > s1) {
    titleText = `${p2} Wins!`;
    msgText = `${p2} defeated ${p1} by ${s2} to ${s1}!`;
    icon = "👑";
  } else {
    titleText = "It's a Tie!";
    msgText = `Both players scored ${s1} points. What a close game!`;
    icon = "🤝";
  }
  
  DOM.gameOverMsg.textContent = msgText;
  DOM.goStatScore.textContent = s1;
  if (DOM.goStatScoreLbl) DOM.goStatScoreLbl.textContent = `${p1} Score`;
  
  DOM.goStatBest.textContent = s2;
  const bestLabel = DOM.goStatBest.nextElementSibling;
  if (bestLabel) {
    bestLabel.textContent = `${p2} Score`;
  }
  
  const modalTitle = DOM.gameOverModal.querySelector('.modal-title');
  if (modalTitle) {
    modalTitle.textContent = titleText;
    modalTitle.style.color = "var(--color-brand)";
  }
  
  const modalIcon = DOM.gameOverModal.querySelector('.modal-icon');
  if (modalIcon) {
    modalIcon.textContent = icon;
  }
  
  DOM.gameOverModal.classList.add('active');
}

// Load initialization
document.addEventListener('DOMContentLoaded', initApp);
