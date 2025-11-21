import { useRef } from "react";
import { Grid } from "./components/Grid";
import { PathfindingProvider } from "./context/PathfindingContext";
import { SpeedProvider } from "./context/SpeedContext";
import { TileProvider } from "./context/TileContext";
import { Nav } from "./components/Nav";

function App() {
  const isVisualizationRunningRef = useRef(false);

  return (
    <PathfindingProvider>
      <TileProvider>
        <SpeedProvider>
          <div className="h-screen w-screen flex flex-col bg-[#131416]">
            <Nav isVisualizationRunningRef={isVisualizationRunningRef} />

            <div className="flex justify-center p-4">
              <div className="w-full max-w-[1200px]">
                <Grid isVisualizationRunningRef={isVisualizationRunningRef} />
              </div>
            </div>
          </div>
        </SpeedProvider>
      </TileProvider>
    </PathfindingProvider>
  );
}

export default App;
