// Main App Component

import { useState } from 'react';
import { GalaxyMap } from './components/GalaxyMap';
import { Game } from './components/Game';
import type { Universe, Theme } from './types/content.types';
import type { GameMode } from './types/game.types';

type AppState =
  | { screen: 'galaxy' }
  | {
      screen: 'game';
      universe: Universe;
      theme: Theme;
      chapterId: string;
      mode: GameMode;
      startItemId?: string;
      levelFilter?: number;
    };

function App() {
  const [state, setState] = useState<AppState>({ screen: 'galaxy' });
  const [pendingFocus, setPendingFocus] = useState<{ universeId: string; planetId: string } | null>(null);
  const [initialFocus, setInitialFocus] = useState<{ universeId: string; planetId: string } | null>(null);

  const handleStart = (
    universe: Universe,
    theme: Theme,
    chapterId: string,
    mode: GameMode,
    itemId?: string,
    levelFilter?: number
  ) => {
    setPendingFocus({ universeId: universe.id, planetId: theme.id });
    setState({
      screen: 'game',
      universe,
      theme,
      chapterId,
      mode,
      startItemId: itemId,
      levelFilter
    });
  };

  const handleExit = () => {
    setInitialFocus(pendingFocus);
    setState({ screen: 'galaxy' });
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

  return (
    <Game
      universe={state.universe}
      theme={state.theme}
      chapterId={state.chapterId}
      mode={state.mode}
      startItemId={state.startItemId}
      levelFilter={state.levelFilter}
      onExit={handleExit}
    />
  );
}

export default App;

