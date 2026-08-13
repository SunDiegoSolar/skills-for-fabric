export const STORIES = [
  {
    id: "matrix-chase",
    name: "Matrix chase",
    duration: 20,
    cues: [
      { at: 0, fn: "scene/matrix/screen" },
      { at: 0.2, fn: "cast/clear" },
      { at: 1, fn: "physics/gravity/off" },
      { at: 1.1, fn: "spawn/neo/bounce" },
      { at: 3, fn: "spawn/agent/gravity" },
      { at: 3.1, fn: "physics/gravity/on" },
      { at: 6, fn: "spawn/trinity/chase" },
      { at: 8, fn: "kaleido/8/matrix" },
      { at: 12, fn: "look/kaleido/0" },
      { at: 14, fn: "cast/scatter" },
      { at: 18, fn: "spawn/spark/rain" },
    ],
  },
  {
    id: "porch-visitors",
    name: "Porch visitors",
    duration: 18,
    cues: [
      { at: 0, fn: "scene/fire/quad" },
      { at: 0.2, fn: "cast/clear" },
      { at: 1, fn: "spawn/pumpkin/gravity" },
      { at: 2.5, fn: "spawn/cat/bounce" },
      { at: 4, fn: "spawn/ghost/float" },
      { at: 6, fn: "spawn/bat/rain" },
      { at: 9, fn: "scene/aurora/circle" },
      { at: 12, fn: "spawn/witch/orbit" },
      { at: 15, fn: "cast/explode" },
    ],
  },
  {
    id: "bounce-cast",
    name: "Bounce cast",
    duration: 16,
    cues: [
      { at: 0, fn: "shape/grid" },
      { at: 0.1, fn: "cast/clear" },
      { at: 0.2, fn: "physics/gravity/off" },
      { at: 0.4, fn: "spawn/ball/bounce" },
      { at: 0.6, fn: "spawn/heart/bounce" },
      { at: 0.8, fn: "spawn/drone/bounce" },
      { at: 1, fn: "spawn/robot/bounce" },
      { at: 2, fn: "physics/faces/on" },
      { at: 6, fn: "physics/wind/left" },
      { at: 9, fn: "physics/wind/right" },
      { at: 12, fn: "physics/wind/off" },
      { at: 14, fn: "cast/scatter" },
    ],
  },
  {
    id: "kaleido-night",
    name: "Kaleido night",
    duration: 16,
    cues: [
      { at: 0, fn: "kaleido/8/aurora" },
      { at: 0.2, fn: "cast/clear" },
      { at: 2, fn: "spawn/moth/float" },
      { at: 3, fn: "spawn/spark/orbit" },
      { at: 6, fn: "kaleido/12/stars" },
      { at: 10, fn: "spawn/raven/bounce" },
      { at: 13, fn: "look/kaleido/6" },
    ],
  },
];

export function findStory(id) {
  return STORIES.find((s) => s.id === id) || STORIES[0];
}
