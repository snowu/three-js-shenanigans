import * as THREE from 'three'
import { scene, camera, renderer, timer } from './scene.js'
import { createGround } from './ground.js'
import { createHumanoid } from './humanoid.js'
import { Movement } from './movement.js'
import { CameraController } from './cameraController.js'
import { createObstacles } from './obstacles.js'
import { Physics } from './physics.js'

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(ambientLight)

const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)

// Scene objects
const ground = createGround()
scene.add(ground)

const { meshes: obstacleMeshes, obstacles } = createObstacles()
obstacleMeshes.forEach(m => scene.add(m))

const humanoid = createHumanoid()
scene.add(humanoid)

// Controllers
const movement = new Movement()
const physics  = new Physics()
const cameraController = new CameraController(camera, renderer.domElement, humanoid)

// Debug hitboxes — toggle with H
// Must stay in sync with PLAYER_WIDTH / PLAYER_HEIGHT in physics.js
const HITBOX_W = 0.4
const HITBOX_H = 2.0

function makeWireBox(w, h, d, color) {
  const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d))
  const mat = new THREE.LineBasicMaterial({ color, depthTest: false })
  const mesh = new THREE.LineSegments(geo, mat)
  mesh.renderOrder = 999
  mesh.visible = false
  return mesh
}

const obstacleHelpers = obstacles.map(({ aabb }) => {
  const size   = new THREE.Vector3()
  const center = new THREE.Vector3()
  aabb.getSize(size)
  aabb.getCenter(center)
  const h = makeWireBox(size.x, size.y, size.z, 0xffffff)
  h.position.copy(center)
  scene.add(h)
  return h
})

const playerHelper = makeWireBox(HITBOX_W, HITBOX_H, HITBOX_W, 0x00ff00)
scene.add(playerHelper)

let hitboxesVisible = false
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyH' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
    hitboxesVisible = !hitboxesVisible
    obstacleHelpers.forEach(h => { h.visible = hitboxesVisible })
    playerHelper.visible = hitboxesVisible
  }
})

function animate(timestamp) {
  requestAnimationFrame(animate)
  timer.update(timestamp)
  const delta = timer.getDelta()

  const moveDir     = movement.getMoveDir(cameraController.cameraYaw)
  const jumpPressed = movement.jumpPressed
  movement.clearJump()

  physics.update(humanoid, moveDir, movement.wDown, jumpPressed, delta, obstacles)
  cameraController.update()

  // Update player hitbox position every frame (centre is at feet + half height)
  playerHelper.position.set(
    humanoid.position.x,
    humanoid.position.y + HITBOX_H / 2,
    humanoid.position.z
  )

  renderer.render(scene, camera)
}
animate()
