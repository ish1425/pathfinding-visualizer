# Pathfinding Visualizer

### React + TypeScript + Tailwind

#### [Deployed app](https://pathfinding-visualizer-nu.vercel.app/)

![app-demo](./src/assets/pathfinding-visualizer.gif)

### Get Started From Scratch

```
❯ npm create vite@latest pathfinding-visualizer -- --template react-ts
❯ npm install -D tailwindcss postcss autoprefixer
❯ npx tailwindcss init -p
❯ npm i
❯ npm run dev
```

### New: 3D Map routing (MapLibre + FastAPI)

This branch adds a simple FastAPI backend that computes routes using OpenStreetMap (via `osmnx`) and a `Map3D` React component using MapLibre GL to display a 3D map and animated route.

Quick start

1) Frontend

- Install dependencies:

```powershell
npm install
```

- Start frontend dev server:

```powershell
npm start
```

2) Backend (recommended to use `conda` on Windows)

- Create and activate conda env (example):

```powershell
conda create -n pf3d python=3.11 -y
conda activate pf3d
pip install -r backend/requirements.txt
```

- Run the backend:

```powershell
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

Usage

- Open the frontend (Vite prints the URL). The app shows the 2D grid on the left and a 3D MapLibre view on the right.
- In the map panel: click `Select Start`, click a point on the map, then `Select End` and click another point. Press `Compute Route` to request the backend and see the animated route.

Notes

- Installing `osmnx` and `geopandas` on Windows commonly requires system libraries (GDAL/GEOS). Use conda if you run into installation issues.
- The backend uses a small bounding box around the start/end points to download OSM data; for larger areas or production use consider caching or a pre-downloaded graph.

````
# Pathfinding Visualizer

### React + TypeScript + Tailwind

#### [Deployed app](https://pathfinding-visualizer-nu.vercel.app/)

![app-demo](./src/assets/pathfinding-visualizer.gif)

### Get Started From Scratch

```
❯ npm create vite@latest pathfinding-visualizer -- --template react-ts
❯ npm install -D tailwindcss postcss autoprefixer
❯ npx tailwindcss init -p
❯ npm i
❯ npm run dev
```
