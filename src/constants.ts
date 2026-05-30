import { Vec3 } from "./types";

// Camera setup. Initial y sits just above voxel sea level so the first
// frame lands above water; PlayerController re-locks to surface height
// within one frame after that.
export const CAMERA_FOV = 75;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 700;
export const CAMERA_INITIAL_POSITION: Vec3 = [0, 70, 0];

// Player movement — units per second so motion is framerate-independent.
// Minecraft's walking speed is ~4.3 m/s; we run a touch faster because
// our voxels are 1 unit per cube and exploration feels sluggish at 4.
export const PLAYER_MOVE_SPEED = 6;
export const PLAYER_JUMP_SPEED = 8;
export const PLAYER_GRAVITY = 22;
// Eye height above the player's feet (feet sit at surface+1).
export const PLAYER_EYE_HEIGHT = 1.6;

// Distance from origin used to position the directional light along its arc.
// Just needs to be large enough that the light reads as a parallel source.
export const SUN_DISTANCE = 200;
