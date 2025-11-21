import { twMerge } from "tailwind-merge";
import {
  END_TILE_STYLE,
  MAX_ROWS,
  PATH_TILE_STYLE,
  START_TILE_STYLE,
  TILE_STYLE,
  TRAVERSED_TILE_STYLE,
  WALL_TILE_STYLE,
} from "../utils/constants";

interface MouseFunction {
  (row: number, col: number): void;
}

export function Tile({
  row,
  col,
  isStart,
  isEnd,
  isTraversed,
  isWall,
  isPath,
  handleMouseDown,
  handleMouseUp,
  handleMouseEnter,
  enable3D,
  buildingHeight,
}: {
  row: number;
  col: number;
  isStart: boolean;
  isEnd: boolean;
  isTraversed: boolean;
  isWall: boolean;
  isPath: boolean;
  handleMouseDown: MouseFunction;
  handleMouseUp: MouseFunction;
  handleMouseEnter: MouseFunction;
  enable3D?: boolean;
  buildingHeight?: number;
}) {
  let tileTyleStyle;

  if (isStart) {
    tileTyleStyle = START_TILE_STYLE;
  } else if (isEnd) {
    tileTyleStyle = END_TILE_STYLE;
  } else if (isWall) {
    tileTyleStyle = WALL_TILE_STYLE;
  } else if (isPath) {
    tileTyleStyle = PATH_TILE_STYLE;
  } else if (isTraversed) {
    tileTyleStyle = TRAVERSED_TILE_STYLE;
  } else {
    tileTyleStyle = TILE_STYLE;
  }

  const borderStyle =
    row === MAX_ROWS - 1 ? "border-b" : col === 0 ? "border-l" : "";
  const edgeStyle = row === MAX_ROWS - 1 && col === 0 ? "border-l" : "";

  // Calculate 3D building height for walls
  const height = buildingHeight || 2 + ((row * 53 + col * 97) % 200) / 100;
  const wallHeight = enable3D && isWall ? height : 0;

  // Generate realistic building colors based on position (tan, brown, gray tones)
  const buildingColors = [
    { base: "#d4a574", light: "#e8c9a0", dark: "#a67c52", accent: "#8b6f47" }, // Tan/Beige
    { base: "#8b4513", light: "#a0522d", dark: "#654321", accent: "#4a3728" }, // Brown brick
    { base: "#b8b8b8", light: "#d4d4d4", dark: "#808080", accent: "#696969" }, // Gray concrete
    { base: "#cd853f", light: "#daa520", dark: "#8b6914", accent: "#6b5412" }, // Golden brown
    { base: "#696969", light: "#808080", dark: "#4a4a4a", accent: "#2f2f2f" }, // Dark gray
    { base: "#c9a581", light: "#ddbea9", dark: "#a68968", accent: "#8b7355" }, // Light tan
    { base: "#bc8f8f", light: "#d4a5a5", dark: "#8b6969", accent: "#704d4d" }, // Rosy brown
    { base: "#a9a9a9", light: "#c0c0c0", dark: "#7a7a7a", accent: "#5a5a5a" }, // Medium gray
  ];
  const colorIndex = (row * 7 + col * 13) % buildingColors.length;
  const buildingColor = buildingColors[colorIndex];
  
  // Determine building style (different window patterns)
  const buildingStyle = (row + col) % 3;
  const windowCount = Math.floor(height * 4);

  return (
    <div
      className={twMerge(tileTyleStyle, borderStyle, edgeStyle, "relative")}
      id={`${row}-${col}`}
      onMouseDown={() => handleMouseDown(row, col)}
      onMouseUp={() => handleMouseUp(row, col)}
      onMouseEnter={() => handleMouseEnter(row, col)}
      style={
        wallHeight > 0
          ? {
              transformStyle: "preserve-3d",
              transform: `translateZ(${wallHeight * 5}px)`,
              boxShadow: `0 ${wallHeight * 5}px ${
                wallHeight * 8
              }px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)`,
            }
          : undefined
      }
    >
      {/* 3D Building walls */}
      {wallHeight > 0 && (
        <>
          {/* Front face with realistic windows */}
          <div
            className="absolute inset-0"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateY(0deg) translateZ(0px)`,
              background: `linear-gradient(180deg, ${buildingColor.light} 0%, ${buildingColor.base} 50%, ${buildingColor.dark} 100%)`,
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.1)",
            }}
          >
            {/* Realistic window grid based on building style */}
            <div className="absolute inset-0 p-0.5">
              {buildingStyle === 0 && (
                // Style 1: Regular grid windows
                <div className="h-full grid grid-cols-4 gap-px">
                  {Array.from({ length: windowCount }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        background: i % 5 === 0 ? "#1a1a1a" : "#ffffcc",
                        opacity: 0.8,
                        border: "0.5px solid rgba(0,0,0,0.3)",
                      }}
                    />
                  ))}
                </div>
              )}
              {buildingStyle === 1 && (
                // Style 2: Wide horizontal windows
                <div className="h-full flex flex-col gap-px">
                  {Array.from({ length: Math.floor(windowCount / 2) }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1"
                      style={{
                        background: `linear-gradient(90deg, ${i % 3 === 0 ? "#2a2a2a" : "#e6f3ff"} 10%, ${i % 3 === 0 ? "#1a1a1a" : "#b3d9ff"} 90%)`,
                        opacity: 0.85,
                        border: "0.5px solid rgba(0,0,0,0.2)",
                      }}
                    />
                  ))}
                </div>
              )}
              {buildingStyle === 2 && (
                // Style 3: Mixed pattern
                <div className="h-full grid grid-cols-3 gap-0.5">
                  {Array.from({ length: windowCount }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        background: i % 4 === 0 ? `${buildingColor.accent}` : i % 7 === 0 ? "#1a1a1a" : "#fff8dc",
                        opacity: 0.75,
                        border: "0.5px solid rgba(0,0,0,0.25)",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Top face - rooftop */}
          <div
            className="absolute inset-0"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(90deg) translateZ(0px)`,
              transformOrigin: "top",
              background: `linear-gradient(135deg, ${buildingColor.dark}, ${buildingColor.accent})`,
              boxShadow: "inset 0 0 15px rgba(0,0,0,0.4)",
            }}
          />
        </>
      )}
    </div>
  );
}
