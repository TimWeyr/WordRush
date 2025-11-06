const DATA_SOURCES = {
  config: { path: './config.json', embedKey: 'config' },
  levels: { path: './data/levels.json', embedKey: 'levels' },
  themes: { path: './data/themes.json', embedKey: 'themes' },
  words: { path: './data/words_de_en.json', embedKey: 'words' }
};

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const levelDisplay = document.getElementById('level-display');
const modeDisplay = document.getElementById('mode-display');
const roundIndicator = document.getElementById('round-indicator');
const themeSelector = document.getElementById('theme-selector');
const bonusModal = document.getElementById('bonus-modal');
const pairGrid = document.getElementById('pair-grid');
const skipBonusButton = document.getElementById('skip-bonus');
const audioRegion = document.getElementById('audio-region');

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function fetchJSON(source) {
  if (window.location.protocol === 'file:' && window.WORDRUSH_EMBED && source.embedKey && window.WORDRUSH_EMBED[source.embedKey]) {
    return Promise.resolve(cloneData(window.WORDRUSH_EMBED[source.embedKey]));
  }
  return fetch(source.path).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${source.path}`);
    }
    return response.json();
  });
}

function getRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(array) {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

class StorageManager {
  constructor(keys) {
    this.keys = keys;
  }

  loadProgress() {
    const raw = localStorage.getItem(this.keys.progress);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Failed to parse progress from storage', error);
      return null;
    }
  }

  saveProgress(progress) {
    localStorage.setItem(this.keys.progress, JSON.stringify(progress));
  }

  loadBonusData() {
    const raw = localStorage.getItem(this.keys.bonus);
    if (!raw) {
      return {
        lastBonusRound: null,
        clearedPairs: []
      };
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Failed to parse bonus data', error);
      return {
        lastBonusRound: null,
        clearedPairs: []
      };
    }
  }

  saveBonusData(data) {
    localStorage.setItem(this.keys.bonus, JSON.stringify(data));
  }
}

class ThemeManager {
  constructor(themes) {
    this.themes = themes;
    this.activeTheme = null;
  }

  setTheme(themeId) {
    const theme = this.themes.find((item) => item.id === themeId);
    if (!theme) {
      return;
    }
    this.activeTheme = theme;
    document.documentElement.style.setProperty('--bg-gradient-start', theme.colorTheme[0]);
    document.documentElement.style.setProperty('--bg-gradient-end', theme.colorTheme[1]);
  }
}

class PairMatchBoard {
  constructor({ onScore, onComplete, onFailPair }) {
    this.onScore = onScore;
    this.onComplete = onComplete;
    this.onFailPair = onFailPair;
    this.firstSelection = null;
    this.matchesRemaining = 0;
    this.resolvedPairs = new Set();
    this.boundClickHandler = (event) => this.handleCardClick(event);
  }

  open(pairs) {
    this.reset();
    this.resolvedPairs = new Set();
    const cards = [];
    pairs.forEach((pair) => {
      cards.push({
        id: `${pair.id}-de`,
        display: pair.word_de,
        word_de: pair.word_de,
        word_en: pair.correct_en,
        pairId: pair.id
      });
      cards.push({
        id: `${pair.id}-en`,
        display: pair.correct_en,
        word_de: pair.word_de,
        word_en: pair.correct_en,
        pairId: pair.id
      });
    });

    this.matchesRemaining = pairs.length;
    pairGrid.innerHTML = '';
    shuffle(cards).forEach((card) => {
      const button = document.createElement('button');
      button.className = 'pair-card';
      button.dataset.cardId = card.id;
      button.dataset.pairId = String(card.pairId);
      button.dataset.wordDe = card.word_de;
      button.dataset.wordEn = card.word_en;
      button.type = 'button';
      button.textContent = card.display;
      pairGrid.appendChild(button);
    });

    bonusModal.style.display = 'flex';
    pairGrid.addEventListener('click', this.boundClickHandler);
  }

  reset() {
    this.firstSelection = null;
    this.matchesRemaining = 0;
    pairGrid.removeEventListener('click', this.boundClickHandler);
  }

  close() {
    this.reset();
    bonusModal.style.display = 'none';
  }

  handleCardClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || !target.classList.contains('pair-card')) {
      return;
    }

    if (target.getAttribute('aria-disabled') === 'true') {
      return;
    }

    if (!this.firstSelection) {
      this.firstSelection = target;
      this.highlightCard(target, 'active');
      return;
    }

    if (this.firstSelection === target) {
      return;
    }

    const isMatch = this.isMatchingPair(this.firstSelection, target);
    if (isMatch) {
      this.onScore(50);
      this.highlightPair(this.firstSelection, target, 'correct');
      this.disableCard(this.firstSelection);
      this.disableCard(target);
      this.resolvedPairs.add(Number(target.dataset.pairId));
      this.matchesRemaining -= 1;
      if (this.matchesRemaining <= 0) {
        this.onScore(200);
        this.onComplete(Array.from(this.resolvedPairs));
      }
    } else {
      this.onScore(-30);
      this.highlightPair(this.firstSelection, target, 'wrong');
      this.onFailPair(Number(target.dataset.pairId));
      setTimeout(() => {
        this.resetState(this.firstSelection);
        this.resetState(target);
      }, 600);
    }

    this.firstSelection = null;
  }

  highlightCard(card, state) {
    card.dataset.state = state;
  }

  resetState(card) {
    card.dataset.state = '';
  }

  highlightPair(cardA, cardB, state) {
    this.highlightCard(cardA, state);
    this.highlightCard(cardB, state);
  }

  disableCard(card) {
    card.dataset.state = 'correct';
    card.setAttribute('aria-disabled', 'true');
  }

  isMatchingPair(cardA, cardB) {
    const aDe = cardA.dataset.wordDe;
    const aEn = cardA.dataset.wordEn;
    const bDe = cardB.dataset.wordDe;
    const bEn = cardB.dataset.wordEn;
    return (
      (aDe === bDe && aEn === bEn) ||
      (aDe === bEn && aEn === bDe)
    );
  }
}

class WordRushGame {
  constructor({ config, levels, themes, words, storage }) {
    this.config = config;
    this.levels = levels;
    this.themes = themes;
    this.words = words;
    this.storage = storage;
    this.themeManager = new ThemeManager(themes);
    this.pairMatchBoard = new PairMatchBoard({
      onScore: (delta) => this.adjustScore(delta),
      onComplete: (resolvedIds) => this.handleBonusComplete(resolvedIds),
      onFailPair: (id) => this.markWordFailed(id)
    });

    this.state = this.createInitialState();
    this.failedWordIDs = new Set();
    this.activeTheme = null;
    this.activeRound = null;
    this.roundsSinceBoss = 0;
    this.reverseMode = false;
    this.animationFrameId = null;
    this.lastFrameTime = null;
    this.roundStatus = 'idle';

    this.handleCanvasClick = (event) => this.onCanvasClick(event);
    canvas.addEventListener('click', this.handleCanvasClick);

    this.buildThemeSelector();
    this.restoreProgress();
    this.updateHUD();

    skipBonusButton.addEventListener('click', () => {
      this.pairMatchBoard.close();
      this.resumeAfterBonus();
    });
  }

  createInitialState() {
    return {
      level: this.config.startingLevel,
      score: 0,
      themeIndex: 0,
      unlockedRewards: [],
      lastThemeChoice: null
    };
  }

  restoreProgress() {
    const saved = this.storage.loadProgress();
    if (saved) {
      this.state = { ...this.state, ...saved };
      if (Array.isArray(saved.failedWordIDs)) {
        this.failedWordIDs = new Set(saved.failedWordIDs);
      }
    }
    this.activeTheme = this.getCurrentTheme();
    this.themeManager.setTheme(this.activeTheme.id);
  }

  persistProgress() {
    const data = {
      level: this.state.level,
      score: this.state.score,
      themeIndex: this.state.themeIndex,
      unlockedRewards: this.state.unlockedRewards,
      lastThemeChoice: this.state.lastThemeChoice,
      failedWordIDs: Array.from(this.failedWordIDs)
    };
    this.storage.saveProgress(data);
  }

  buildThemeSelector() {
    themeSelector.innerHTML = '';
    this.themes.forEach((theme, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = theme.name;
      button.addEventListener('click', () => {
        this.state.themeIndex = index;
        this.state.lastThemeChoice = theme.id;
        this.activeTheme = theme;
        this.themeManager.setTheme(theme.id);
        this.persistProgress();
        this.updateHUD();
      });
      themeSelector.appendChild(button);
    });
  }

  getCurrentTheme() {
    if (this.state.lastThemeChoice) {
      const theme = this.themes.find((item) => item.id === this.state.lastThemeChoice);
      if (theme) {
        return theme;
      }
    }
    const fallbackIndex = this.state.themeIndex % this.themes.length;
    return this.themes[fallbackIndex];
  }

  start() {
    this.startRound();
  }

  startRound() {
    this.stopAnimationLoop();
    this.activeTheme = this.getCurrentTheme();
    const isBoss = this.shouldTriggerBossWave();
    const roundData = this.prepareRoundData(this.activeTheme, isBoss);
    this.activeRound = roundData;
    this.roundsSinceBoss = isBoss ? 0 : this.roundsSinceBoss + 1;
    roundIndicator.textContent = isBoss ? 'Boss-Welle!' : `Level ${this.state.level}`;
    modeDisplay.textContent = isBoss ? 'Boss' : (this.reverseMode ? 'Reverse' : 'Normal');
    this.roundStatus = 'running';
    this.initializeWordSprites(roundData);
    this.startAnimationLoop();
  }

  shouldTriggerBossWave() {
    const { bossSettings } = this.config;
    if (!bossSettings) {
      return false;
    }
    if (this.roundsSinceBoss + 1 < bossSettings.roundsBetweenBoss) {
      return false;
    }
    const hasBossWords = this.words.some((word) => word.level === 'boss' && word.theme === this.activeTheme.id);
    return hasBossWords;
  }

  prepareRoundData(theme, isBoss) {
    if (isBoss) {
      return this.prepareBossRound(theme);
    }
    return this.prepareStandardRound(theme);
  }

  prepareStandardRound(theme) {
    const availableWords = this.words.filter((word) => word.theme === theme.id && word.level === this.state.level);
    const fallbackWords = this.words.filter((word) => word.theme === theme.id && typeof word.level === 'number');
    const pool = availableWords.length > 0 ? availableWords : fallbackWords;
    const chosen = getRandomItem(pool);
    const correctWord = this.reverseMode ? chosen.word_de : chosen.correct_en;
    const targetWord = this.reverseMode ? chosen.correct_en : chosen.word_de;
    const distractors = this.reverseMode ? [chosen.word_de, ...chosen.distractors] : chosen.distractors;
    const flyingWords = this.createFlyingWords(targetWord, correctWord, distractors, false);
    return {
      type: 'standard',
      theme,
      sourceWord: chosen,
      targetWord,
      flyingWords
    };
  }

  prepareBossRound(theme) {
    const bossWord = this.words.find((word) => word.level === 'boss' && word.theme === theme.id);
    if (!bossWord) {
      return this.prepareStandardRound(theme);
    }
    const correctWord = this.reverseMode ? bossWord.word_de : bossWord.correct_en;
    const targetWord = this.reverseMode ? bossWord.correct_en : bossWord.word_de;
    const flyingWords = this.createFlyingWords(targetWord, correctWord, bossWord.distractors, true);
    return {
      type: 'boss',
      theme,
      sourceWord: bossWord,
      targetWord,
      flyingWords
    };
  }

  initializeWordSprites(roundData) {
    const baseRadius = Math.max(canvas.width, canvas.height) * 0.6;
    roundData.flyingWords.forEach((word, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, roundData.flyingWords.length);
      word.angle = angle + (Math.random() - 0.5) * 0.6;
      word.radius = baseRadius + Math.random() * 80;
      word.angularSpeed = (Math.random() * 0.6 + 0.2) * (Math.random() > 0.5 ? 1 : -1);
      word.travelSpeed = word.speed * 55;
      word.state = 'flying';
      this.updateWordPosition(word);
    });
  }

  updateWordPosition(word) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    word.x = centerX + Math.cos(word.angle) * word.radius;
    word.y = centerY + Math.sin(word.angle) * word.radius;
  }

  startAnimationLoop() {
    this.lastFrameTime = null;
    const step = (timestamp) => {
      if (this.roundStatus !== 'running' || !this.activeRound) {
        return;
      }
      if (!this.lastFrameTime) {
        this.lastFrameTime = timestamp;
      }
      const delta = (timestamp - this.lastFrameTime) / 1000;
      this.lastFrameTime = timestamp;
      this.updateFlyingWords(delta);
      this.drawRound(this.activeRound);
      this.animationFrameId = requestAnimationFrame(step);
    };
    this.animationFrameId = requestAnimationFrame(step);
  }

  stopAnimationLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  updateFlyingWords(deltaSeconds) {
    if (!this.activeRound) {
      return;
    }
    const targetRadius = 60;
    this.activeRound.flyingWords.forEach((word) => {
      if (word.state !== 'flying') {
        return;
      }
      word.radius = Math.max(targetRadius, word.radius - word.travelSpeed * deltaSeconds);
      word.angle += word.angularSpeed * deltaSeconds;
      this.updateWordPosition(word);
      if (word.radius <= targetRadius + 2 && this.roundStatus === 'running') {
        word.state = 'collided';
        this.handleWordCollision(word);
      }
    });
  }

  createFlyingWords(targetWord, correctWord, distractors, isBoss) {
    const entries = [];
    entries.push({
      id: 'correct',
      text: correctWord,
      type: 'correct',
      speed: this.getSpeedMultiplier(isBoss)
    });
    const limitedDistractors = distractors.slice(0, this.getMaxDistractors(isBoss));
    limitedDistractors.forEach((word, index) => {
      entries.push({
        id: `d-${index}`,
        text: word,
        type: 'distractor',
        speed: this.getSpeedMultiplier(isBoss) * (0.85 + Math.random() * 0.3)
      });
    });
    return shuffle(entries);
  }

  getSpeedMultiplier(isBoss) {
    if (isBoss && this.config.bossSettings) {
      return this.config.speed.base * this.config.bossSettings.speedMultiplier;
    }
    const levelConfig = this.levels.find((level) => level.id === this.state.level);
    const baseMultiplier = levelConfig ? levelConfig.speedMultiplier : 1;
    return this.config.speed.base * (1 + (this.state.level - 1) * this.config.speed.incrementPerLevel) * baseMultiplier;
  }

  getMaxDistractors(isBoss) {
    if (isBoss && this.config.bossSettings) {
      return Math.max(0, this.config.bossSettings.maxWords - 1);
    }
    const levelConfig = this.levels.find((level) => level.id === this.state.level);
    return levelConfig ? levelConfig.maxDistractors : 3;
  }

  drawRound(roundData) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '48px Nunito';
    ctx.textAlign = 'center';
    ctx.fillText(roundData.targetWord, canvas.width / 2, canvas.height / 2);
    ctx.restore();

    roundData.flyingWords.forEach((word) => {
      if (word.state === 'removed') {
        return;
      }
      ctx.save();
      ctx.fillStyle = word.type === 'correct' ? '#6cf542' : '#ff6f61';
      ctx.font = '32px Nunito';
      ctx.textAlign = 'center';
      ctx.fillText(word.text, word.x, word.y);
      ctx.restore();
    });
  }

  onCanvasClick(event) {
    if (this.roundStatus !== 'running' || !this.activeRound) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const targetWord = this.findWordAt(x, y);
    this.handlePlayerShot(targetWord);
  }

  findWordAt(x, y) {
    if (!this.activeRound) {
      return null;
    }
    ctx.save();
    ctx.font = '32px Nunito';
    const hit = this.activeRound.flyingWords.find((word) => {
      if (word.state !== 'flying') {
        return false;
      }
      const metrics = ctx.measureText(word.text);
      const halfWidth = metrics.width / 2 + 12;
      const halfHeight = 24;
      return Math.abs(word.x - x) <= halfWidth && Math.abs(word.y - y) <= halfHeight;
    });
    ctx.restore();
    return hit || null;
  }

  handlePlayerShot(wordEntry) {
    if (this.roundStatus !== 'running') {
      return;
    }
    if (!wordEntry) {
      this.adjustScore(this.config.points.missShot);
      return;
    }
    if (wordEntry.type === 'distractor') {
      this.adjustScore(this.getPointsFor('hitDistractor', this.activeRound.type));
      this.removeWordFromRound(wordEntry.id);
      this.playFeedback('success');
    } else if (wordEntry.type === 'correct') {
      this.adjustScore(this.getPointsFor('hitCorrect', this.activeRound.type));
      this.markWordFailed(this.activeRound.sourceWord.id);
      this.removeWordFromRound(wordEntry.id);
      this.playFeedback('fail');
      this.handleRoundFailure();
    }
    this.persistProgress();
  }

  handleWordCollision(wordEntry) {
    if (this.roundStatus !== 'running') {
      return;
    }
    if (!wordEntry) {
      return;
    }
    if (wordEntry.type === 'correct') {
      this.adjustScore(this.getPointsFor('correctCollision', this.activeRound.type));
      this.playFeedback('combo-success');
      this.handleRoundSuccess();
    } else {
      this.adjustScore(this.getPointsFor('hitCorrect', this.activeRound.type));
      this.markWordFailed(this.activeRound.sourceWord.id);
      this.playFeedback('combo-fail');
      this.handleRoundFailure();
    }
    this.persistProgress();
  }

  removeWordFromRound(wordId) {
    if (!this.activeRound) {
      return;
    }
    this.activeRound.flyingWords = this.activeRound.flyingWords.filter((word) => {
      if (word.id === wordId) {
        word.state = 'removed';
        return false;
      }
      return true;
    });
  }

  getPointsFor(action, roundType) {
    if (roundType === 'boss' && this.config.bossSettings && this.config.bossSettings.points[action] !== undefined) {
      return this.config.bossSettings.points[action];
    }
    return this.config.points[action];
  }

  markWordFailed(wordId) {
    this.failedWordIDs.add(wordId);
  }

  handleRoundSuccess() {
    if (this.roundStatus !== 'running') {
      return;
    }
    this.roundStatus = 'transition';
    this.stopAnimationLoop();
    setTimeout(() => {
      this.roundStatus = 'idle';
      this.checkLevelProgress();
    }, 600);
  }

  handleRoundFailure() {
    if (this.roundStatus !== 'running') {
      return;
    }
    this.roundStatus = 'transition';
    this.stopAnimationLoop();
    setTimeout(() => {
      this.roundStatus = 'idle';
      this.checkLevelProgress();
    }, 600);
  }

  checkLevelProgress() {
    const threshold = this.getNextLevelThreshold();
    if (this.state.score >= threshold && this.state.level < this.config.maxLevel) {
      this.state.level += 1;
      this.roundsSinceBoss = 0;
      levelDisplay.textContent = `Level ${this.state.level}`;
      this.playFeedback('level-up');
      if (this.failedWordIDs.size > 0) {
        this.launchBonusRound();
        return;
      }
    }
    this.startRound();
  }

  getNextLevelThreshold() {
    return this.state.level * 1000;
  }

  adjustScore(delta) {
    this.state.score += delta;
    scoreDisplay.textContent = `Score: ${this.state.score}`;
  }

  handleBonusComplete(resolvedIds = []) {
    resolvedIds.forEach((id) => {
      this.failedWordIDs.delete(id);
    });
    const bonusData = this.storage.loadBonusData();
    const today = new Date().toISOString().slice(0, 10);
    bonusData.lastBonusRound = today;
    bonusData.clearedPairs = Array.from(new Set([...bonusData.clearedPairs, ...resolvedIds]));
    this.storage.saveBonusData(bonusData);
    this.persistProgress();
    this.pairMatchBoard.close();
    this.resumeAfterBonus();
  }

  resumeAfterBonus() {
    this.startRound();
  }

  launchBonusRound() {
    const failedPairs = this.words.filter((word) => this.failedWordIDs.has(word.id));
    if (failedPairs.length === 0) {
      this.startRound();
      return;
    }
    this.roundStatus = 'bonus';
    this.stopAnimationLoop();
    this.pairMatchBoard.open(failedPairs);
  }

  updateHUD() {
    scoreDisplay.textContent = `Score: ${this.state.score}`;
    levelDisplay.textContent = `Level ${this.state.level}`;
    modeDisplay.textContent = this.reverseMode ? 'Reverse' : 'Normal';
  }

  playFeedback(type) {
    const messages = {
      success: 'Treffer! Gute Wahl.',
      fail: 'Autsch! Falsches Ziel.',
      'combo-success': 'Perfekt! Richtige Kombination.',
      'combo-fail': 'Falsch getroffen! Versuch es erneut.',
      'level-up': 'Level Up! Weiter so!'
    };
    const text = messages[type];
    if (text) {
      audioRegion.textContent = text;
    }
  }
}

async function bootstrap() {
  try {
    const [config, levels, themes, words] = await Promise.all([
      fetchJSON(DATA_SOURCES.config),
      fetchJSON(DATA_SOURCES.levels),
      fetchJSON(DATA_SOURCES.themes),
      fetchJSON(DATA_SOURCES.words)
    ]);

    const storage = new StorageManager(config.storageKeys);
    const game = new WordRushGame({ config, levels, themes, words, storage });
    window.wordRush = game;
    game.start();
  } catch (error) {
    console.error('Failed to bootstrap WordRush', error);
    roundIndicator.textContent = 'Fehler beim Laden der Spieldaten';
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
