import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { twMerge } from "tailwind-merge";
import { useTile } from "../hooks/useTile";
import { MAX_ROWS, MAX_COLS } from "../utils/constants";

export function MapGrid() {
  const { setStartTile, setEndTile } = useTile();
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  
  const [enable3DMove, setEnable3DMove] = useState(false);
  const [placingStart, setPlacingStart] = useState(false);
  const [placingEnd, setPlacingEnd] = useState(false);

  // Camera controls for 3D mode
  const cameraAngleRef = useRef({
    theta: Math.PI / 4,
    phi: Math.PI / 3.5,
    radius: 50,
  });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [40.7128, -74.0060], // New York City - fixed location
      zoom: 17,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    });

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Handle map clicks for placing start/end
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (enable3DMove) return;

      const { lat, lng } = e.latlng;

      if (placingStart) {
        // Remove old start marker
        if (startMarkerRef.current) {
          startMarkerRef.current.remove();
        }

        // Create start marker
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: "custom-marker",
            html: '<div style="background-color: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white;"></div>',
            iconSize: [24, 24],
          }),
        }).addTo(map);

        startMarkerRef.current = marker;
        setStartTile({ row: 0, col: 0, isStart: true, isEnd: false, isWall: false, isPath: false, isTraversed: false, distance: Infinity, parent: null });
        setPlacingStart(false);
      } else if (placingEnd) {
        // Remove old end marker
        if (endMarkerRef.current) {
          endMarkerRef.current.remove();
        }

        // Create end marker
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: "custom-marker",
            html: '<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white;"></div>',
            iconSize: [24, 24],
          }),
        }).addTo(map);

        endMarkerRef.current = marker;
        setEndTile({ row: 0, col: 0, isStart: false, isEnd: true, isWall: false, isPath: false, isTraversed: false, distance: Infinity, parent: null });
        setPlacingEnd(false);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [placingStart, placingEnd, enable3DMove, setStartTile, setEndTile]);

  // 3D camera controls
  useEffect(() => {
    if (!enable3DMove || !mapContainerRef.current) return;

    const container = mapContainerRef.current;

    const updateCameraPosition = () => {
      const { theta, phi, radius } = cameraAngleRef.current;
      const rotX = (phi * 180) / Math.PI - 90;
      const rotY = (theta * 180) / Math.PI;
      const scale = Math.max(0.3, 1 / (radius / 40));
      const translateZ = -radius * 5;

      const mapEl = container.querySelector(".leaflet-container") as HTMLElement;
      if (mapEl) {
        mapEl.style.transformStyle = "preserve-3d";
        mapEl.style.transform = `translateZ(${translateZ}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;
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
        cameraAngleRef.current.radius = Math.max(20, Math.min(100, cameraAngleRef.current.radius - dy * 0.15));
      } else {
        cameraAngleRef.current.theta += dx * 0.005;
        cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngleRef.current.phi + dy * 0.005));
      }

      updateCameraPosition();
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(20, Math.min(100, cameraAngleRef.current.radius + e.deltaY * 0.02));
      updateCameraPosition();
    };

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });

    container.style.cursor = "grab";
    container.style.touchAction = "none";

    updateCameraPosition();

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("wheel", onWheel);
    };
  }, [enable3DMove]);

  const tileSize = 15; // pixels per tile
  const containerWidth = MAX_COLS * tileSize;
  const containerHeight = MAX_ROWS * tileSize;

  return (
    <div className="flex items-center flex-col justify-center mt-10">
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            setPlacingStart((p) => !p);
            setPlacingEnd(false);
          }}
          className={twMerge(
            "px-3 py-1 rounded border",
            placingStart ? "bg-sky-600 text-white" : "bg-sky-400 text-white"
          )}
        >
          {placingStart ? "Placing Start (click map)" : "Place Start"}
        </button>

        <button
          type="button"
          onClick={() => {
            setPlacingEnd((p) => !p);
            setPlacingStart(false);
          }}
          className={twMerge(
            "px-3 py-1 rounded border",
            placingEnd ? "bg-sky-600 text-white" : "bg-sky-400 text-white"
          )}
        >
          {placingEnd ? "Placing End (click map)" : "Place End"}
        </button>

        <button
          type="button"
          onClick={() => setEnable3DMove((v) => !v)}
          className={twMerge(
            "px-3 py-1 rounded border",
            enable3DMove ? "bg-indigo-600 text-white" : "bg-indigo-300 text-white"
          )}
        >
          {enable3DMove ? "3D Move: On" : "3D Move: Off"}
        </button>
      </div>

      <div
        ref={mapContainerRef}
        className="rounded shadow-lg border border-gray-700"
        style={{
          width: `${containerWidth}px`,
          height: `${containerHeight}px`,
          perspective: enable3DMove ? "1200px" : "none",
          overflow: "hidden",
        }}
      />
    </div>
  );
}
