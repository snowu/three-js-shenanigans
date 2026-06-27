import * as THREE from 'three'

export function createHumanoid() {
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff })

  // Head — sphere, centre at y=1.75
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), mat)
  head.position.y = 1.75
  group.add(head)

  // Body — tall box, centre at y=1.125
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), mat)
  body.position.y = 1.125
  group.add(body)

  // Left arm — centre at y=1.1, offset left
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), mat)
  leftArm.position.set(-0.35, 1.1, 0)
  group.add(leftArm)

  // Right arm
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), mat)
  rightArm.position.set(0.35, 1.1, 0)
  group.add(rightArm)

  // Left leg — centre at y=0.35, bottom at y=0 (ground level)
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), mat)
  leftLeg.position.set(-0.15, 0.35, 0)
  group.add(leftLeg)

  // Right leg
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), mat)
  rightLeg.position.set(0.15, 0.35, 0)
  group.add(rightLeg)

  return group
}
