import * as THREE from 'three'

// Curated palette — reads well against the dark ground
const PALETTE = [0x4fc3f7, 0x81c784, 0xff8a65, 0xffd54f, 0xce93d8]

// Each entry: size (w, h, d) and centre position (x, y, z).
// y is set to h/2 so the bottom face sits flush with the ground.
const BOX_DEFS = [
  { w: 3,   h: 1,   d: 3,  x:  5,  y: 0.5,  z: -5  },
  { w: 2,   h: 2,   d: 2,  x:  8,  y: 1,    z: -8  },
  { w: 2,   h: 4,   d: 2,  x:  3,  y: 2,    z: -12 },
  { w: 6,   h: 1.5, d: 2,  x: -4,  y: 0.75, z: -8  },
  { w: 2,   h: 3,   d: 2,  x: -6,  y: 1.5,  z: -14 },
]

export function createObstacles() {
  const meshes = []
  const obstacles = []

  BOX_DEFS.forEach((b, i) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, b.h, b.d),
      new THREE.MeshStandardMaterial({ color: PALETTE[i % PALETTE.length] })
    )
    mesh.position.set(b.x, b.y, b.z)

    // Compute AABB once — boxes are static, no need to recompute each frame
    const aabb = new THREE.Box3().setFromObject(mesh)

    meshes.push(mesh)
    obstacles.push({ mesh, aabb })
  })

  return { meshes, obstacles }
}
