import { twMerge } from "tailwind-merge";
import { usePathfinding } from "../hooks/usePathfinding";
import { useTile } from "../hooks/useTile";
import { MAX_COLS, MAX_ROWS } from "../utils/constants";
import { MutableRefObject, useEffect, useRef, useState } from "react";
import { createNewGrid } from "../utils/helpers";
import { Tile } from "./Tile";

export function Grid({
  isVisualizationRunningRef,
}: {
  isVisualizationRunningRef: MutableRefObject<boolean>;
}) {
  const { grid, setGrid } = usePathfinding();
  const { setStartTile, setEndTile } = useTile();
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [placingStart, setPlacingStart] = useState(false);
  const [placingEnd, setPlacingEnd] = useState(false);

  const gridRef = useRef(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  const placeStartNode = (row: number, col: number) => {
    const baseGrid = gridRef.current;
    const newGrid = baseGrid.map((r) =>
      r.map((tile) => {
        if (tile.isStart) return { ...tile, isStart: false };
        if (tile.row === row && tile.col === col) return { ...tile, isStart: true, isWall: false };
        return tile;
      })
    );
    setGrid(newGrid);
    setStartTile(newGrid[row][col]);
    setPlacingStart(false);
  };

  const placeEndNode = (row: number, col: number) => {
    const baseGrid = gridRef.current;
    const newGrid = baseGrid.map((r) =>
      r.map((tile) => {
        if (tile.isEnd) return { ...tile, isEnd: false };
        if (tile.row === row && tile.col === col) return { ...tile, isEnd: true, isWall: false };
        return tile;
      })
    );
    setGrid(newGrid);
    setEndTile(newGrid[row][col]);
    setPlacingEnd(false);
  };

  const handleMouseDown = (row: number, col: number) => {
    if (isVisualizationRunningRef.current) return;

    if (placingStart) {
      placeStartNode(row, col);
      return;
    }
    if (placingEnd) {
      placeEndNode(row, col);
      return;
    }

    const baseGrid = gridRef.current;
    if (baseGrid[row][col].isStart || baseGrid[row][col].isEnd) return;

    setIsMouseDown(true);
    const newGrid = createNewGrid(baseGrid, row, col);
    setGrid(newGrid);
  };

  const handleMouseUp = (_row: number, _col: number) => {
    if (isVisualizationRunningRef.current) return;
    setIsMouseDown(false);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isVisualizationRunningRef.current) return;

    if (isMouseDown && placingStart) {
      placeStartNode(row, col);
      return;
    }
    if (isMouseDown && placingEnd) {
      placeEndNode(row, col);
      return;
    }
    if (isMouseDown) {
      const baseGrid = gridRef.current;
      if (baseGrid[row][col].isStart || baseGrid[row][col].isEnd) return;
      const newGrid = createNewGrid(baseGrid, row, col);
      setGrid(newGrid);
    }
  };

  const generateRandomBuildings = () => {
    if (isVisualizationRunningRef.current) return;
    
    const baseGrid = gridRef.current;
    const newGrid = baseGrid.map((r) =>
      r.map((tile) => {
        if (!tile.isStart && !tile.isEnd && Math.random() < 0.25) {
          return { ...tile, isWall: true };
        }
        return tile;
      })
    );
    setGrid(newGrid);
  };

  // 3D-move toggle (non-destructive: disabled by default so interactions remain fast)
  const [enable3DMove, setEnable3DMove] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const cameraAngleRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3.5, radius: 50 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const _noop = (_r: number, _c: number) => {};

  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container || !enable3DMove) return;

    const updateCameraPosition = () => {
      const { theta, phi, radius } = cameraAngleRef.current;
      
      // Calculate camera rotation from spherical coordinates
      const rotX = (90 - (phi * 180 / Math.PI));
      const rotY = -(theta * 180 / Math.PI);
      const scale = Math.max(0.3, 1 / (radius / 40));
      const translateZ = -radius * 5;
      
      const gridEl = container.querySelector('div > div') as HTMLElement;
      if (gridEl) {
        gridEl.style.transition = 'transform 0.05s ease-out';
        gridEl.style.transform = `translateZ(${translateZ}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      
      if (e.shiftKey) {
        // Zoom in/out with shift+drag
        cameraAngleRef.current.radius = Math.max(20, Math.min(100, cameraAngleRef.current.radius + dy * 0.3));
      } else {
        // Orbit camera around the grid (slower rotation)
        cameraAngleRef.current.theta -= dx * 0.005;
        cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngleRef.current.phi - dy * 0.005));
      }
      
      updateCameraPosition();
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Zoom with mouse wheel
      cameraAngleRef.current.radius = Math.max(20, Math.min(100, cameraAngleRef.current.radius + e.deltaY * 0.05));
      updateCameraPosition();
    };

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });

    container.style.cursor = "grab";
    container.style.touchAction = "none";
    
    // Apply initial camera position
    updateCameraPosition();

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("wheel", onWheel);
    };
  }, [enable3DMove]);

  return (
    <div
      className={twMerge(
        "flex items-center flex-col justify-center border-sky-300 mt-10",
        `lg:min-h-[${MAX_ROWS * 14}px]  md:min-h-[${MAX_ROWS * 12}px] xs:min-h-[${MAX_ROWS * 6}px] min-h-[${MAX_ROWS * 5}px]`,
        `lg:w-[${MAX_COLS * 14}px] md:w-[${MAX_COLS * 12}px] xs:w-[${MAX_COLS * 6}px] w-[${MAX_COLS * 5}px]`
      )}
    >
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setPlacingStart((p) => !p);
            setPlacingEnd(false);
          }}
          className={twMerge("px-3 py-1 rounded border", placingStart ? "bg-sky-600 text-white" : "bg-sky-400 text-white")}
        >
          {placingStart ? "Placing Start (click grid)" : "Place Start"}
        </button>

        <button
          type="button"
          onClick={() => {
            setPlacingEnd((p) => !p);
            setPlacingStart(false);
          }}
          className={twMerge("px-3 py-1 rounded border", placingEnd ? "bg-sky-600 text-white" : "bg-sky-400 text-white")}
        >
          {placingEnd ? "Placing End (click grid)" : "Place End"}
        </button>
        <button
          type="button"
          onClick={() => setEnable3DMove((v) => !v)}
          className={twMerge("px-3 py-1 rounded border", enable3DMove ? "bg-indigo-600 text-white" : "bg-indigo-300 text-white")}
        >
          {enable3DMove ? "3D Move: On" : "3D Move: Off"}
        </button>
        <button
          type="button"
          onClick={generateRandomBuildings}
          disabled={isVisualizationRunningRef.current}
          className={twMerge("px-3 py-1 rounded border bg-purple-500 text-white hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed")}
        >
          Add Buildings
        </button>
      </div>

      <div 
        ref={gridContainerRef}
        className="relative w-full" 
        style={{ 
          height: `${Math.min(700, MAX_ROWS * 16)}px`,
          perspective: "1200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "linear-gradient(to bottom, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)",
          borderRadius: "8px",
        }}
      >
        <div style={{ transformStyle: "preserve-3d", transition: enable3DMove ? "none" : "transform 0.3s ease", transformOrigin: "center center" }}>
          {grid.map((row, rIdx) => (
            <div key={rIdx} className="flex" style={{ transformStyle: "preserve-3d" }}>
              {row.map((tile, cIdx) => (
                <Tile
                  key={`${rIdx}-${cIdx}`}
                  row={rIdx}
                  col={cIdx}
                  isStart={tile.isStart}
                  isEnd={tile.isEnd}
                  isTraversed={tile.isTraversed}
                  isWall={tile.isWall}
                  isPath={tile.isPath}
                  handleMouseDown={enable3DMove ? _noop : handleMouseDown}
                  handleMouseUp={enable3DMove ? _noop : handleMouseUp}
                  handleMouseEnter={enable3DMove ? _noop : handleMouseEnter}
                  enable3D={enable3DMove}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


 
