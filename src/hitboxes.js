import * as THREE from 'three'
import config from './config.js'

export function makeWireBox(w, h, d, color) {
  const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d))
  const mat = new THREE.LineBasicMaterial({ color, depthTest: false })
  const mesh = new THREE.LineSegments(geo, mat)
  mesh.renderOrder = 999
  mesh.visible = false
  return mesh
}

export function createPlayerHitboxHelpers() {
  const upperH = config.PLAYER_HEIGHT - config.KICK_HIP_Y
  const upper = makeWireBox(config.PLAYER_WIDTH, upperH, config.PLAYER_WIDTH, 0x00ff00)
  const lower = makeWireBox(config.PLAYER_WIDTH, config.KICK_HIP_Y, config.PLAYER_WIDTH, 0x44ff44)
  return { upper, lower }
}

export function updatePlayerHitboxPositions(helpers, playerPos) {
  const upperH = config.PLAYER_HEIGHT - config.KICK_HIP_Y
  helpers.upper.position.set(playerPos.x, playerPos.y + config.KICK_HIP_Y + upperH / 2, playerPos.z)
  helpers.lower.position.set(playerPos.x, playerPos.y + config.KICK_HIP_Y / 2, playerPos.z)
}

export function rebuildPlayerHitboxHelpers(scene, helpers) {
  if (helpers.upper) scene.remove(helpers.upper)
  if (helpers.lower) scene.remove(helpers.lower)
  const newHelpers = createPlayerHitboxHelpers()
  scene.add(newHelpers.upper)
  scene.add(newHelpers.lower)
  return newHelpers
}

export function buildPlatformAABBs(mainMesh) {
  const aabb = new THREE.Box3().setFromObject(mainMesh)
  const ledgeAABB = aabb.clone()
  ledgeAABB.max.z += config.LEDGE_GRAB_EXTEND
  return { aabb, ledgeAABB }
}

export function createObstacleHitboxHelper(aabb, color = 0xffffff) {
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  aabb.getSize(size)
  aabb.getCenter(center)
  const h = makeWireBox(size.x, size.y, size.z, color)
  h.position.copy(center)
  return h
}
