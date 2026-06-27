# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Three.js experimentation/playground repository. There is no build toolchain committed yet — projects here are typically self-contained experiments using Three.js r160+ via CDN or a bundler set up per-experiment.

## Three.js Skills

This repo ships a curated set of Claude Code skill files in `.claude/skills/`. These are automatically loaded when relevant context is detected. Skills cover:

| Skill | Trigger context |
|---|---|
| `threejs-fundamentals` | Scene setup, cameras, renderer, animation loop |
| `threejs-geometry` | Shapes, BufferGeometry, instancing |
| `threejs-materials` | PBR, standard, phong, shader materials |
| `threejs-lighting` | Lights, shadows, environment lighting |
| `threejs-textures` | Texture types, UV mapping, render targets |
| `threejs-animation` | Keyframe, skeletal, morph targets, mixer |
| `threejs-loaders` | GLTF/GLB, Draco, async patterns |
| `threejs-shaders` | GLSL, ShaderMaterial, uniforms |
| `threejs-postprocessing` | EffectComposer, bloom, DOF, custom passes |
| `threejs-interaction` | Raycasting, camera controls, mouse/touch |

All skills are verified against the Three.js r160+ API. Import addons using the `three/addons/` path format.

## Three.js Import Convention

Use the `three/addons/` path for all add-ons (not the legacy `three/examples/jsm/`):

```js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
```
