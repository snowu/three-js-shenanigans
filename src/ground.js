import * as THREE from 'three'

export function createGround() {
  const group = new THREE.Group()

  // Lava/death floor — visible but deadly
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 2000),
    new THREE.MeshStandardMaterial({ color: 0x441111, roughness: 1, emissive: 0x220000 })
  )
  plane.rotation.x = -Math.PI / 2
  plane.position.set(0, -0.1, -500)
  group.add(plane)

  return group
}
