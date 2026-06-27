import * as THREE from 'three'

export function createGround() {
  const group = new THREE.Group()

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 })
  )
  plane.rotation.x = -Math.PI / 2
  group.add(plane)

  const grid = new THREE.GridHelper(2000, 2000, 0x555555, 0x333333)
  group.add(grid)

  return group
}
