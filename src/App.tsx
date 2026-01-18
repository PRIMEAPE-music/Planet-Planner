import { Toolbar, LayerPanel, StatusBar } from '@/components/layout';
import { CanvasContainer } from '@/components/canvas';

function App() {
  return (
    <div className="w-full h-screen bg-ink-950 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <Toolbar />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden">
          <CanvasContainer />
        </div>

        {/* Layer panel */}
        <LayerPanel />
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}

export default App;
