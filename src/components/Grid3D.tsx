import { MutableRefObject, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import TWEEN from "@tweenjs/tween.js";
import { MAX_COLS, MAX_ROWS } from "../utils/constants";
import { isEqual } from "../utils/helpers";
import { useTile } from "../hooks/useTile";

interface Tile3D {
  row: number;
  col: number;
  isStart: boolean;
  isEnd: boolean;
  isWall: boolean;
  isPath: boolean;
  isTraversed: boolean;
  distance: number;
  parent: Tile3D | null;
}

// Local version of getUntraversedNeighbors for Tile3D
const getUntraversedNeighbors3D = (grid: Tile3D[][], tile: Tile3D) => {
  const { row, col } = tile;
  const neighbors = [];

  if (row > 0) {
    neighbors.push(grid[row - 1][col]);
  }
  if (row < MAX_ROWS - 1) {
    neighbors.push(grid[row + 1][col]);
  }
  if (col > 0) {
    neighbors.push(grid[row][col - 1]);
  }
  if (col < MAX_COLS - 1) {
    neighbors.push(grid[row][col + 1]);
  }
  return neighbors.filter((neighbor) => !neighbor.isTraversed);
};

export function Grid3D({
  isVisualizationRunningRef,
}: {
  isVisualizationRunningRef: MutableRefObject<boolean>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groundRef = useRef<THREE.Mesh | null>(null);
  const wallsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const startMarkerRef = useRef<THREE.Mesh | null>(null);
  const endMarkerRef = useRef<THREE.Mesh | null>(null);
  const pathLineRef = useRef<THREE.Line | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  
  const { startTile, endTile } = useTile();
  
  const [placingStart, setPlacingStart] = useState(false);
  const [placingEnd, setPlacingEnd] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [grid3D, setGrid3D] = useState<Tile3D[][]>([]);
  const [startPos, setStartPos] = useState<{ row: number; col: number }>({ row: 1, col: 1 });
  const [endPos, setEndPos] = useState<{ row: number; col: number }>({ row: MAX_ROWS - 2, col: MAX_COLS - 2 });
  
  const grid3DRef = useRef(grid3D);
  useEffect(() => {
    grid3DRef.current = grid3D;
  }, [grid3D]);

  // Sync start/end positions with 2D grid
  useEffect(() => {
    if (startTile) {
      setStartPos({ row: startTile.row, col: startTile.col });
    }
  }, [startTile]);

  useEffect(() => {
    if (endTile) {
      setEndPos({ row: endTile.row, col: endTile.col });
    }
  }, [endTile]);

  // Initialize grid3D
  useEffect(() => {
    const newGrid: Tile3D[][] = [];
    for (let row = 0; row < MAX_ROWS; row++) {
      const currentRow: Tile3D[] = [];
      for (let col = 0; col < MAX_COLS; col++) {
        currentRow.push({
          row,
          col,
          isStart: row === 1 && col === 1,
          isEnd: row === MAX_ROWS - 2 && col === MAX_COLS - 2,
          isWall: false,
          isPath: false,
          isTraversed: false,
          distance: Infinity,
          parent: null,
        });
      }
      newGrid.push(currentRow);
    }
    setGrid3D(newGrid);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 0, 500);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
    camera.position.set(0, 120, 120);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.camera.far = 300;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Ground
    const tileSize = 3;
    const gridWidth = MAX_COLS * tileSize;
    const gridHeight = MAX_ROWS * tileSize;
    
    const groundGeometry = new THREE.PlaneGeometry(gridWidth, gridHeight, MAX_COLS, MAX_ROWS);
    groundGeometry.rotateX(-Math.PI / 2);
    
    // Color the ground faces based on grid state
    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0xeeeeee,
      side: THREE.FrontSide,
      vertexColors: true,
    });

    const colors: number[] = [];
    const color = new THREE.Color();
    
    for (let i = 0; i < groundGeometry.attributes.position.count; i++) {
      color.setHex(0xeeeeee);
      colors.push(color.r, color.g, color.b);
    }
    
    groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.receiveShadow = true;
    scene.add(ground);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 50;
    controls.maxDistance = 300;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    groundRef.current = ground;

    // Create start marker (green circle)
    const startGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 32);
    const startMaterial = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x10b981,
      metalness: 0.3,
      roughness: 0.4,
    });
    const startMarker = new THREE.Mesh(startGeometry, startMaterial);
    startMarker.position.y = 0.25;
    scene.add(startMarker);
    startMarkerRef.current = startMarker;

    // Create end marker (red circle)
    const endGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 32);
    const endMaterial = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      metalness: 0.3,
      roughness: 0.4,
    });
    const endMarker = new THREE.Mesh(endGeometry, endMaterial);
    endMarker.position.y = 0.25;
    scene.add(endMarker);
    endMarkerRef.current = endMarker;

    // Update marker positions
    updateMarkerPositions();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      TWEEN.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  // Helper function to update marker positions
  const updateMarkerPositions = () => {
    if (!startMarkerRef.current || !endMarkerRef.current) return;
    
    const tileSize = 3;
    const startX = (startPos.col - MAX_COLS / 2) * tileSize + tileSize / 2;
    const startZ = (startPos.row - MAX_ROWS / 2) * tileSize + tileSize / 2;
    startMarkerRef.current.position.set(startX, 0.25, startZ);

    const endX = (endPos.col - MAX_COLS / 2) * tileSize + tileSize / 2;
    const endZ = (endPos.row - MAX_ROWS / 2) * tileSize + tileSize / 2;
    endMarkerRef.current.position.set(endX, 0.25, endZ);
  };

  // Update marker positions when start/end change
  useEffect(() => {
    updateMarkerPositions();
  }, [startPos, endPos]);

  // Update ground colors based on grid state
  useEffect(() => {
    if (!groundRef.current) return;

    const geometry = groundRef.current.geometry as THREE.PlaneGeometry;
    const colors = geometry.attributes.color;

    grid3D.forEach((row, rIdx) => {
      row.forEach((tile, cIdx) => {
        const faceIndex = rIdx * MAX_COLS * 2 + cIdx * 2;
        const color = new THREE.Color();

        if (tile.isStart) {
          color.setHex(0x22c55e);
        } else if (tile.isEnd) {
          color.setHex(0xef4444);
        } else if (tile.isPath) {
          color.setHex(0xfbbf24);
        } else if (tile.isTraversed) {
          color.setHex(0x8b5cf6);
        } else if (tile.isWall) {
          color.setHex(0x1e40af);
        } else {
          color.setHex(0xdddddd);
        }

        // Update both triangles of the face
        for (let i = 0; i < 6; i++) {
          const vertexIndex = (faceIndex * 3 + i) % colors.count;
          colors.setXYZ(vertexIndex, color.r, color.g, color.b);
        }
      });
    });

    colors.needsUpdate = true;
  }, [grid3D]);

  // Handle walls
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const tileSize = 3;

    grid3D.forEach((row, rIdx) => {
      row.forEach((tile, cIdx) => {
        const key = `${rIdx}-${cIdx}`;
        const x = (cIdx - MAX_COLS / 2) * tileSize + tileSize / 2;
        const z = (rIdx - MAX_ROWS / 2) * tileSize + tileSize / 2;

        if (tile.isWall) {
          if (!wallsRef.current.has(key)) {
            const height = 2 + ((rIdx * 53 + cIdx * 97) % 200) / 100;
            const wallGeometry = new THREE.BoxGeometry(tileSize, height * 5, tileSize);
            const wallMaterial = new THREE.MeshLambertMaterial({
              color: 0x475569,
              emissive: 0x1e293b,
            });
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(x, height * 2.5, z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            
            // Animate wall appearing
            wall.scale.y = 0;
            new TWEEN.Tween(wall.scale)
              .to({ y: 1 }, 500)
              .easing(TWEEN.Easing.Bounce.Out)
              .start();

            scene.add(wall);
            wallsRef.current.set(key, wall);
          }
        } else {
          if (wallsRef.current.has(key)) {
            const wall = wallsRef.current.get(key)!;
            new TWEEN.Tween(wall.scale)
              .to({ y: 0 }, 300)
              .easing(TWEEN.Easing.Cubic.In)
              .onComplete(() => {
                scene.remove(wall);
                wallsRef.current.delete(key);
              })
              .start();
          }
        }
      });
    });
  }, [grid3D]);

  // Handle mouse interactions
  const handleMouseDown = (event: React.MouseEvent) => {
    setIsMouseDown(true);
    handleMouseEvent(event);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isMouseDown) return;
    handleMouseEvent(event);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseEvent = (event: React.MouseEvent) => {
    if (!rendererRef.current || !cameraRef.current || !groundRef.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(groundRef.current);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const tileSize = 3;
      const col = Math.floor((point.x + (MAX_COLS * tileSize) / 2) / tileSize);
      const row = Math.floor((point.z + (MAX_ROWS * tileSize) / 2) / tileSize);

      if (row >= 0 && row < MAX_ROWS && col >= 0 && col < MAX_COLS) {
        if (placingStart) {
          placeStartNode(row, col);
        } else if (placingEnd) {
          placeEndNode(row, col);
        } else if (!isVisualizationRunningRef.current) {
          handleTileClick(row, col);
        }
      }
    }
  };

  const placeStartNode = (row: number, col: number) => {
    const baseGrid = grid3DRef.current;
    const newGrid = baseGrid.map((r) =>
      r.map((tile) => {
        if (tile.isStart) return { ...tile, isStart: false };
        if (tile.row === row && tile.col === col) return { ...tile, isStart: true, isWall: false };
        return tile;
      })
    );
    setGrid3D(newGrid);
    setStartPos({ row, col });
    setPlacingStart(false);
  };

  const placeEndNode = (row: number, col: number) => {
    const baseGrid = grid3DRef.current;
    const newGrid = baseGrid.map((r) =>
      r.map((tile) => {
        if (tile.isEnd) return { ...tile, isEnd: false };
        if (tile.row === row && tile.col === col) return { ...tile, isEnd: true, isWall: false };
        return tile;
      })
    );
    setGrid3D(newGrid);
    setEndPos({ row, col });
    setPlacingEnd(false);
  };

  const handleTileClick = (row: number, col: number) => {
    const baseGrid = grid3DRef.current;
    const tile = baseGrid[row][col];
    
    if (tile.isStart || tile.isEnd) return;

    const newGrid = baseGrid.map((r) =>
      r.map((t) => {
        if (t.row === row && t.col === col) {
          return { ...t, isWall: !t.isWall };
        }
        return t;
      })
    );
    setGrid3D(newGrid);
  };

  const generateRandomBuildings = () => {
    const newGrid = grid3DRef.current.map((row) =>
      row.map((tile) => {
        if (tile.isStart || tile.isEnd) return tile;
        const shouldBeWall = Math.random() < 0.25;
        return { ...tile, isWall: shouldBeWall };
      })
    );
    setGrid3D(newGrid);
  };

  const runPathfinding = () => {
    if (isVisualizationRunningRef.current) return;
    
    // Clear previous visualization
    const clearedGrid = grid3DRef.current.map((row) =>
      row.map((tile) => ({
        ...tile,
        isTraversed: false,
        isPath: false,
        distance: Infinity,
        parent: null,
      }))
    );
    setGrid3D(clearedGrid);

    // Remove previous path line
    if (pathLineRef.current && sceneRef.current) {
      sceneRef.current.remove(pathLineRef.current);
      pathLineRef.current = null;
    }

    setTimeout(() => {
      const grid = clearedGrid.map((row) =>
        row.map((tile) => ({ ...tile }))
      );
      
      const startTile = grid[startPos.row][startPos.col];
      const endTile = grid[endPos.row][endPos.col];

      const traversedTiles: Tile3D[] = [];
      const base = grid[startTile.row][startTile.col];
      base.distance = 0;
      base.isTraversed = true;
      const untraversedTiles: Tile3D[] = [base];

      while (untraversedTiles.length > 0) {
        untraversedTiles.sort((a, b) => a.distance - b.distance);
        const currentTile = untraversedTiles.shift();
        if (currentTile) {
          if (currentTile.isWall) continue;
          if (currentTile.distance === Infinity) break;
          currentTile.isTraversed = true;
          traversedTiles.push(currentTile);
          if (isEqual(currentTile, endTile)) break;
          const neighbors = getUntraversedNeighbors3D(grid, currentTile);
          for (let i = 0; i < neighbors.length; i += 1) {
            if (currentTile.distance + 1 < neighbors[i].distance) {
              neighbors[i].distance = currentTile.distance + 1;
              neighbors[i].parent = currentTile;
              untraversedTiles.push(neighbors[i]);
            }
          }
        }
      }

      const path: Tile3D[] = [];
      let current = grid[endTile.row][endTile.col];
      while (current !== null && current.parent !== null) {
        current.isPath = true;
        path.unshift(current);
        current = current.parent;
      }
      if (current) {
        current.isPath = true;
        path.unshift(current);
      }

      // Animate traversed tiles (fast)
      isVisualizationRunningRef.current = true;
      traversedTiles.forEach((tile, index) => {
        setTimeout(() => {
          setGrid3D((prevGrid) =>
            prevGrid.map((row) =>
              row.map((t) => {
                if (t.row === tile.row && t.col === tile.col) {
                  return { ...t, isTraversed: true };
                }
                return t;
              })
            )
          );
        }, index * 5); // Fast animation
      });

      // Animate path with yellow line
      setTimeout(() => {
        if (path.length > 0 && sceneRef.current) {
          const tileSize = 3;
          const points: THREE.Vector3[] = [];
          
          path.forEach((tile) => {
            const x = (tile.col - MAX_COLS / 2) * tileSize + tileSize / 2;
            const z = (tile.row - MAX_ROWS / 2) * tileSize + tileSize / 2;
            points.push(new THREE.Vector3(x, 1, z));
          });

          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({
            color: 0xfbbf24,
            linewidth: 5,
          });
          const line = new THREE.Line(geometry, material);
          sceneRef.current.add(line);
          pathLineRef.current = line;

          // Update grid to show path (fast)
          path.forEach((tile, index) => {
            setTimeout(() => {
              setGrid3D((prevGrid) =>
                prevGrid.map((row) =>
                  row.map((t) => {
                    if (t.row === tile.row && t.col === tile.col) {
                      return { ...t, isPath: true };
                    }
                    return t;
                  })
                )
              );

              if (index === path.length - 1) {
                isVisualizationRunningRef.current = false;
              }
            }, index * 10); // Fast animation
          });
        } else {
          isVisualizationRunningRef.current = false;
        }
      }, traversedTiles.length * 5 + 50);
    }, 50);
  };



  return (
    <div className="flex items-center flex-col justify-center mt-10">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setPlacingStart((p) => !p);
            setPlacingEnd(false);
          }}
          className={`px-3 py-1 rounded border ${
            placingStart ? "bg-sky-600 text-white" : "bg-sky-400 text-white"
          }`}
        >
          {placingStart ? "Placing Start (click)" : "Place Start"}
        </button>

        <button
          type="button"
          onClick={() => {
            setPlacingEnd((p) => !p);
            setPlacingStart(false);
          }}
          className={`px-3 py-1 rounded border ${
            placingEnd ? "bg-sky-600 text-white" : "bg-sky-400 text-white"
          }`}
        >
          {placingEnd ? "Placing End (click)" : "Place End"}
        </button>

        <button
          type="button"
          onClick={generateRandomBuildings}
          disabled={isVisualizationRunningRef.current}
          className="px-3 py-1 rounded border bg-purple-500 text-white hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Add Buildings
        </button>
        <button
          onClick={runPathfinding}
          disabled={isVisualizationRunningRef.current}
          className="px-3 py-1 rounded border bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Run Visualizer
        </button>
      </div>

      <div
        ref={containerRef}
        className="w-full rounded shadow-lg"
        style={{ height: "600px" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
