import { Vec3 } from "./types";

export const KEYBOARD_MOVE_SPEED = 0.12;
export const KEYBOARD_TURN_SPEED = 0.01;

// Camera setup. Initial y sits just above voxel sea level so the first
// frame lands above water; GizmoMovement re-locks to character height
// within one frame after that.
export const CAMERA_FOV = 60;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 700;
export const CAMERA_INITIAL_POSITION: Vec3 = [0, 70, 18];

// Orbit constraints
export const ORBIT_MIN_DISTANCE = 2;
export const ORBIT_MAX_DISTANCE = 80;
export const ORBIT_DAMPING_FACTOR = 0.06;
export const ORBIT_MIN_POLAR_ANGLE = Math.PI / 8;
export const ORBIT_MAX_POLAR_ANGLE = Math.PI / 3;

// Height of the orbit target above terrain (roughly character eye level)
export const CAMERA_TARGET_HEIGHT = 0.75;

// Distance from origin used to position the directional light along its arc.
// Just needs to be large enough that the light reads as a parallel source.
export const SUN_DISTANCE = 200;
