declare module 'three/examples/jsm/controls/OrbitControls' {
	import { Camera, EventDispatcher, MOUSE, TOUCH } from 'three';
	export class OrbitControls extends EventDispatcher {
    enableDamping: boolean;
    dampingFactor: number;
    minDistance: number;
    maxDistance: number;
		constructor(object: Camera, domElement?: HTMLElement);
		enabled: boolean;
		target: import('three').Vector3;
		enableZoom: boolean;
		enableRotate: boolean;
		enablePan: boolean;
		update(): void;
		dispose(): void;
		saveState(): void;
		reset(): void;
		mouseButtons: { LEFT: MOUSE; MIDDLE: MOUSE; RIGHT: MOUSE };
		touches: { ONE: TOUCH; TWO: TOUCH };
	}
	export { OrbitControls };
}
