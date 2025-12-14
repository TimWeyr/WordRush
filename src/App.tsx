// Main App Component

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './infra/auth/AuthContext';
import { ToastProvider } from './components/Toast/ToastContainer';
import { GalaxyMap } from './components/GalaxyMap';
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
  | { screen: 'galaxy' }
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
  const [state, setState] = useState<AppState>({ screen: 'galaxy' });
  const [pendingFocus, setPendingFocus] = useState<{ universeId: string; planetId: string } | null>(null);
  const [initialFocus, setInitialFocus] = useState<{ universeId: string; planetId: string } | null>(null);

  const handleStart = (
    universe: Universe,
    theme: Theme,
    chapterIds: string | string[],
    mode: GameMode,
    itemId?: string,
    levelFilter?: number,
    loadAllItems?: boolean
  ) => {
    setPendingFocus({ universeId: universe.id, planetId: theme.id });
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

  const handleExit = () => {
    setInitialFocus(pendingFocus);
    setState({ screen: 'galaxy' });
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

  if (state.screen === 'galaxy') {
    return (
      <GalaxyMap
        onStart={handleStart}
        initialFocus={initialFocus}
        onInitialFocusConsumed={() => setInitialFocus(null)}
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
      onExit={handleExit}
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

