// Main App Component

import { useState } from 'react';
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

  if (state.screen === 'universe') {
    return (
      <GalaxyUniverseView
        onPlanetSelect={handlePlanetSelect}
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

