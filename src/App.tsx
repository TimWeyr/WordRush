// Main App Component

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './infra/auth/AuthContext';
import { ToastProvider } from './components/Toast/ToastContainer';
import { GalaxyUniverseView } from './components/GalaxyUniverseView';
import { GalaxyPlanetView } from './components/GalaxyPlanetView';
import { Game } from './components/Game';
import { EditorLayout } from './components/Editor/EditorLayout';
import { LoginScreen } from './components/Auth/LoginScreen';
import { ResetPasswordScreen } from './components/Auth/ResetPasswordScreen';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import type { Universe, Theme } from './types/content.types';
import type { GameMode } from './types/game.types';

// Initialize SessionManager on app startup
import '@/infra/utils/SessionManager';

type AppState =
  | { screen: 'universe' }
  | { screen: 'planet'; universe: Universe; theme: Theme; mode: GameMode }
  | {
      screen: 'game';
      universe: Universe;
      theme: Theme;
      chapterIds: string[];
      currentChapterIndex: number;
      mode: GameMode;
      startItemId?: string;
      levelFilter?: number;
      loadAllItems?: boolean; // If true, load all items from all chapters at once (chaotic mode)
    };

function AppContent() {
  const [state, setState] = useState<AppState>({ screen: 'universe' });
  const [lastFocusedPlanetId, setLastFocusedPlanetId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle URL parameters on initial load
  useEffect(() => {
    const initializeFromURL = async () => {
      if (isInitialized) return;
      
      const params = new URLSearchParams(window.location.search);
      const universeParam = params.get('universe');
      const themeParam = params.get('theme');
      const modeParam = params.get('mode');
      const presetParam = params.get('preset');
      
      // If theme is specified in URL, navigate directly to planet view
      if (universeParam && themeParam) {
        try {
          const { jsonLoader } = await import('@/infra/utils/JSONLoader');
          const { localProgressProvider } = await import('@/infra/providers/LocalProgressProvider');
          
          // Load universe and theme
          const universe = await jsonLoader.loadUniverse(universeParam);
          if (!universe) {
            console.warn(`Universe not found: ${universeParam}`);
            setIsInitialized(true);
            return;
          }
          
          const theme = await jsonLoader.loadTheme(universeParam, themeParam);
          if (!theme) {
            console.warn(`Theme not found: ${themeParam}`);
            setIsInitialized(true);
            return;
          }
          
          // Get mode from URL or settings
          let mode: GameMode = 'shooter';
          if (modeParam === 'lernmodus' || modeParam === 'shooter') {
            mode = modeParam;
          } else {
            try {
              const settings = await localProgressProvider.getUISettings();
              mode = settings.gameMode || 'shooter';
            } catch (error) {
              console.warn('Failed to load game mode from settings:', error);
            }
          }
          
          // Apply preset if specified
          if (presetParam) {
            try {
              const { GAMEPLAY_PRESETS, DEFAULT_GAMEPLAY_SETTINGS } = await import('@/config/gameplayPresets');
              if (presetParam in GAMEPLAY_PRESETS) {
                const currentSettings = await localProgressProvider.getUISettings();
                const newGameplaySettings = {
                  ...currentSettings.gameplaySettings || DEFAULT_GAMEPLAY_SETTINGS,
                  ...GAMEPLAY_PRESETS[presetParam as keyof typeof GAMEPLAY_PRESETS],
                  preset: presetParam as any
                };
                const newSettings = {
                  ...currentSettings,
                  gameplaySettings: newGameplaySettings
                };
                await localProgressProvider.saveUISettings(newSettings);
              }
            } catch (error) {
              console.warn('Failed to apply preset:', error);
            }
          }
          
          // Navigate to planet view
          setLastFocusedPlanetId(theme.id);
          setState({
            screen: 'planet',
            universe,
            theme,
            mode
          });
          
          console.log(`🌌 URL Init: Navigated to ${universe.name} > ${theme.name} (mode: ${mode})`);
        } catch (error) {
          console.error('Failed to initialize from URL:', error);
        }
      }
      
      setIsInitialized(true);
    };
    
    initializeFromURL();
  }, [isInitialized]);

  const handlePlanetSelect = async (universe: Universe, theme: Theme) => {
    setLastFocusedPlanetId(theme.id);
    
    // Get mode from UISettings (default: shooter)
    let mode: GameMode = 'shooter';
    try {
      const { localProgressProvider } = await import('@/infra/providers/LocalProgressProvider');
      const settings = await localProgressProvider.getUISettings();
      mode = settings.gameMode || 'shooter'; // Default: shooter
    } catch (error) {
      console.warn('Failed to load game mode from settings:', error);
    }
    
    setState({
      screen: 'planet',
      universe,
      theme,
      mode
    });
  };

  const handleBackToUniverse = () => {
    // Keep lastFocusedPlanetId so GalaxyUniverseView can focus on it
    setState({ screen: 'universe' });
  };

  const handleStart = (
    universe: Universe,
    theme: Theme,
    chapterIds: string | string[],
    mode: GameMode,
    itemId?: string,
    levelFilter?: number,
    loadAllItems?: boolean
  ) => {
    setLastFocusedPlanetId(theme.id);
    const chapters = Array.isArray(chapterIds) ? chapterIds : [chapterIds];
    setState({
      screen: 'game',
      universe,
      theme,
      chapterIds: chapters,
      currentChapterIndex: 0,
      mode,
      startItemId: itemId,
      levelFilter,
      loadAllItems: loadAllItems || false
    });
  };

  const handleExitGame = () => {
    // Return to planet view (not universe view)
    if (state.screen === 'game') {
      setState({
        screen: 'planet',
        universe: state.universe,
        theme: state.theme,
        mode: state.mode
      });
    }
  };

  const handleNextChapter = () => {
    if (state.screen === 'game') {
      setState({
        ...state,
        currentChapterIndex: state.currentChapterIndex + 1,
        startItemId: undefined // Reset item filter for next chapter
      });
    }
  };

  const handleUniverseStart = (universe: Universe, themes: Theme[], mode: GameMode) => {
    // Collect all chapter IDs from all themes with theme prefix
    // Format: "themeId:chapterId" to preserve theme context
    const allChapterIds: string[] = [];
    for (const theme of themes) {
      const chapterIds = Object.keys(theme.chapters);
      for (const chapterId of chapterIds) {
        allChapterIds.push(`${theme.id}:${chapterId}`);
      }
    }
    
    console.log(`🌟 Universe Chaotic Mode: ${themes.length} themes, ${allChapterIds.length} chapters`);
    
    // Use first theme as "representative" theme (needed for Game component)
    // But pass all chapter IDs with loadAllItems=true
    if (themes.length > 0) {
      setState({
        screen: 'game',
        universe,
        theme: themes[0], // Representative theme (not used in universe mode)
        chapterIds: allChapterIds,
        currentChapterIndex: 0,
        mode,
        loadAllItems: true // Enable universe chaotic mode
      });
    }
  };

  if (state.screen === 'universe') {
    return (
      <GalaxyUniverseView
        onPlanetSelect={handlePlanetSelect}
        onUniverseStart={handleUniverseStart}
        initialFocusedPlanetId={lastFocusedPlanetId}
      />
    );
  }

  if (state.screen === 'planet') {
    return (
      <GalaxyPlanetView
        universe={state.universe}
        theme={state.theme}
        mode={state.mode}
        onBack={handleBackToUniverse}
        onStart={handleStart}
      />
    );
  }

  const currentChapterId = state.chapterIds[state.currentChapterIndex];
  const isLastChapter = state.currentChapterIndex >= state.chapterIds.length - 1;

  return (
    <Game
      universe={state.universe}
      theme={state.theme}
      chapterId={currentChapterId}
      chapterIds={state.chapterIds}
      mode={state.mode}
      startItemId={state.startItemId}
      levelFilter={state.levelFilter}
      onExit={handleExitGame}
      onNextChapter={isLastChapter ? undefined : handleNextChapter}
      currentChapterIndex={state.currentChapterIndex}
      totalChapters={state.chapterIds.length}
      loadAllItems={state.loadAllItems}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Main game route - Public (freeTier content available) */}
            <Route path="/" element={<AppContent />} />
            
            {/* Login route */}
            <Route path="/login" element={<LoginScreen />} />
            
            {/* Reset Password route */}
            <Route path="/reset-password" element={<ResetPasswordScreen />} />
            
            {/* Editor routes - Protected (requires verification) */}
            <Route
              path="/editor"
              element={
                <ProtectedRoute requiresVerification={true}>
                  <EditorLayout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor/:universe"
              element={
                <ProtectedRoute requiresVerification={true}>
                  <EditorLayout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor/:universe/:theme"
              element={
                <ProtectedRoute requiresVerification={true}>
                  <EditorLayout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor/:universe/:theme/:chapter"
              element={
                <ProtectedRoute requiresVerification={true}>
                  <EditorLayout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor/:universe/:theme/:chapter/:itemId"
              element={
                <ProtectedRoute requiresVerification={true}>
                  <EditorLayout />
                </ProtectedRoute>
              }
            />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

