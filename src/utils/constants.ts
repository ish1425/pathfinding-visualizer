import { AlgorithmSelectType, MazeSelectType, SpeedSelectType } from "./types";

export const MAX_ROWS = 39;
export const MAX_COLS = 49;

export const START_TILE_CONFIGURATION = {
  row: 1,
  col: 1,
  isEnd: false,
  isWall: false,
  isPath: false,
  distance: 0,
  isStart: true,
  isTraversed: false,
  parent: null,
};

export const END_TILE_CONFIGURATION = {
  row: MAX_ROWS - 2,
  col: MAX_COLS - 2,
  isEnd: true,
  isWall: false,
  isPath: false,
  distance: 0,
  isStart: false,
  isTraversed: false,
  parent: null,
};

export const TILE_STYLE =
  "lg:w-[14px] md:w-[12px] xs:w-[6px] w-[5px] lg:h-[14px] md:h-[12px] xs:h-[6px] h-[5px] border-t border-r border-black";
export const TRAVERSED_TILE_STYLE = TILE_STYLE + " bg-cyan-500";
export const START_TILE_STYLE = TILE_STYLE + " bg-green-500";
export const END_TILE_STYLE = TILE_STYLE + " bg-red-600";
export const WALL_TILE_STYLE = TILE_STYLE + " bg-gray-200";
export const PATH_TILE_STYLE = TILE_STYLE + " bg-green-600";

export const MAZES: MazeSelectType[] = [
  { name: "No Maze", value: "NONE" },
  { name: "Binary Tree", value: "BINARY_TREE" },
  { name: "Recursive Division", value: "RECURSIVE_DIVISION" },
];

export const PATHFINDING_ALGORITHMS: AlgorithmSelectType[] = [
  { name: "Dijkstra", value: "DIJKSTRA" },
  { name: "A-Star", value: "A_STAR" }
  ];

export const SPEEDS: SpeedSelectType[] = [
  { name: "Slow", value: 2 },
  { name: "Medium", value: 1 },
  { name: "Fast", value: 0.5 },
];

export const SLEEP_TIME = 8;
export const EXTENDED_SLEEP_TIME = 30;
