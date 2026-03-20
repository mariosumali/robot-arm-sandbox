import type { Camera } from 'three';

let _camera: Camera | null = null;
let _canvas: HTMLCanvasElement | null = null;

export function setViewportRefs(camera: Camera, canvas: HTMLCanvasElement) {
  _camera = camera;
  _canvas = canvas;
}

export function getViewportCamera() {
  return _camera;
}

export function getViewportCanvas() {
  return _canvas;
}
