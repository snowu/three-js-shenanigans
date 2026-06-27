import * as THREE from 'three'
import { scene, camera, renderer, timer } from './scene.js'
import { createGround } from './ground.js'
import { createHumanoid } from './humanoid.js'
import { Movement } from './movement.js'
import { CameraController } from './cameraController.js'

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(ambientLight)

const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)

// Scene objects
const ground = createGround()
scene.add(ground)

const humanoid = createHumanoid()
scene.add(humanoid)

// Controllers
const movement = new Movement()
const cameraController = new CameraController(camera, renderer.domElement, humanoid)

function animate(timestamp) {
  requestAnimationFrame(animate)
  timer.update(timestamp)
  const delta = timer.getDelta()
  movement.update(humanoid, cameraController.cameraYaw, delta)
  cameraController.update()
  renderer.render(scene, camera)
}
animate()
