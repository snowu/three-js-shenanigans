import { MOVE_SPEED } from './physics.js'

const GRAVITY    = 20
const JUMP_SPEED = 8

const SINGLE_JUMP_HEIGHT = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY)
const SINGLE_JUMP_TIME   = (2 * JUMP_SPEED) / GRAVITY
const DOUBLE_JUMP_HEIGHT = SINGLE_JUMP_HEIGHT * 2
const DOUBLE_JUMP_TIME   = SINGLE_JUMP_TIME * 2
const MAX_H_RANGE_SINGLE = MOVE_SPEED * SINGLE_JUMP_TIME
const MAX_H_RANGE_DOUBLE = MOVE_SPEED * DOUBLE_JUMP_TIME
const MAX_DROP = 8

const CORRIDOR_WIDTH  = 14
const CORRIDOR_HEIGHT = 12
const SEGMENT_DEPTH   = 40
const WALL_THICKNESS  = 0.5
const GENERATE_TIME_AHEAD = 15  // seconds of travel to keep generated ahead
const FOG_START        = 60
const FOG_END          = 100
const MIN_PLATFORM_SPACING = 1.5

const DIFFICULTY = {
  easy:   { heightFraction: 0.5, rangeFraction: 0.5, minGap: 2, maxGap: 4, doubleJumpChance: 0,   platformsPerSegment: [4, 7] },
  medium: { heightFraction: 0.7, rangeFraction: 0.7, minGap: 3, maxGap: 6, doubleJumpChance: 0.2, platformsPerSegment: [5, 8] },
  hard:   { heightFraction: 0.9, rangeFraction: 0.9, minGap: 4, maxGap: 8, doubleJumpChance: 0.4, platformsPerSegment: [6, 10] },
}

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1))
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function nudgeAwayFromAll(plat, allPlatforms, halfW) {
  for (let pass = 0; pass < 3; pass++) {
    for (const other of allPlatforms) {
      const gapX = Math.max(0, Math.abs(plat.x - other.x) - plat.w / 2 - other.w / 2)
      const gapZ = Math.max(0, Math.abs(plat.z - other.z) - plat.d / 2 - other.d / 2)
      const gapY = Math.max(0, Math.abs(plat.y - other.y) - plat.h / 2 - other.h / 2)
      const dist = Math.sqrt(gapX * gapX + gapZ * gapZ + gapY * gapY)
      if (dist < MIN_PLATFORM_SPACING) {
        const push = MIN_PLATFORM_SPACING - dist + 0.5
        // Push forward (-z) and laterally away
        plat.z = Math.round((plat.z - push * 0.7) * 10) / 10
        const lateralDir = plat.x >= other.x ? 1 : -1
        plat.x = Math.round(clamp(plat.x + lateralDir * push * 0.5, -halfW, halfW) * 10) / 10
        plat.y = Math.round(clamp(plat.y + push * 0.3, plat.h / 2 + 0.5, CORRIDOR_HEIGHT - 2) * 10) / 10
      }
    }
  }
}

function generateSegmentPlatforms(prevPlatform, segmentStartZ, difficulty = 'medium') {
  const diff = DIFFICULTY[difficulty] || DIFFICULTY.medium
  const count = randInt(diff.platformsPerSegment[0], diff.platformsPerSegment[1])
  const platforms = []

  const halfW = CORRIDOR_WIDTH / 2 - 1
  const segmentEndZ = segmentStartZ - SEGMENT_DEPTH

  let prev = prevPlatform
  if (!prev) {
    prev = { w: 3, h: 1, d: 3, x: 0, y: 0.5, z: segmentStartZ - 3 }
    platforms.push(prev)
  }

  // Distribute z positions evenly across this segment, with jitter
  const slotDepth = SEGMENT_DEPTH / count
  for (let i = 0; i < count; i++) {
    const prevTopY = prev.y + prev.h / 2

    const needsDoubleJump = Math.random() < diff.doubleJumpChance
    const maxHeight = needsDoubleJump ? DOUBLE_JUMP_HEIGHT : SINGLE_JUMP_HEIGHT

    const maxUp   = maxHeight * diff.heightFraction
    const maxDown = Math.min(MAX_DROP, prevTopY - 0.5)

    const heightRoll = Math.random()
    let dy
    if (heightRoll < 0.3) {
      dy = rand(-maxDown * 0.5, -maxDown * 0.1)
    } else if (heightRoll < 0.7) {
      dy = rand(maxUp * 0.2, maxUp * 0.7)
    } else {
      dy = rand(maxUp * 0.7, maxUp)
    }

    const sizeScale = needsDoubleJump ? 0.8 : 1.0
    const w = rand(1.5, 3) * sizeScale
    const h = rand(0.5, 2)
    const d = rand(1.5, 3) * sizeScale

    // Z: evenly spaced slot with random jitter within slot
    const slotStart = segmentStartZ - i * slotDepth
    const slotEnd = segmentStartZ - (i + 1) * slotDepth
    const pz = rand(slotEnd + d / 2 + 0.5, slotStart - d / 2 - 0.5)

    // X: lateral offset from prev, clamped to corridor
    const lateralRange = Math.min(6, CORRIDOR_WIDTH / 2 - 1)
    const px = clamp(prev.x + rand(-lateralRange, lateralRange), -halfW + w / 2, halfW - w / 2)

    const newTopY = prevTopY + dy
    const py = clamp(Math.max(h / 2, newTopY), h / 2 + 0.5, CORRIDOR_HEIGHT - h / 2 - 1)

    const plat = {
      w: Math.round(w * 10) / 10,
      h: Math.round(h * 10) / 10,
      d: Math.round(d * 10) / 10,
      x: Math.round(px * 10) / 10,
      y: Math.round(py * 10) / 10,
      z: Math.round(pz * 10) / 10,
    }

    // Height reachability check
    const platTopY = plat.y + plat.h / 2
    const heightDiff = platTopY - prevTopY
    const maxReachHeight = (needsDoubleJump ? DOUBLE_JUMP_HEIGHT : SINGLE_JUMP_HEIGHT) * diff.heightFraction
    if (heightDiff > maxReachHeight) {
      plat.y = Math.round(clamp(prevTopY + maxReachHeight * 0.8, h / 2 + 0.5, CORRIDOR_HEIGHT - 2) * 10) / 10
    }

    // Nudge away from overlapping platforms
    nudgeAwayFromAll(plat, platforms, halfW)

    platforms.push(plat)
    prev = plat
  }

  return { platforms, lastPlatform: prev }
}

export class CourseManager {
  constructor(difficulty = 'medium') {
    this._difficulty = difficulty
    this._segments = []
    this._nextSegmentIndex = 0
    this._lastPlatform = null
    this._furthestZ = 0
  }

  get allObstacles() {
    const out = []
    for (const seg of this._segments) {
      for (const obs of seg.obstacles) out.push(obs)
    }
    return out
  }

  get allWallAABBs() {
    const out = []
    for (const seg of this._segments) {
      for (const w of seg.wallAABBs) out.push(w)
    }
    return out
  }

  update(playerZ, currentSpeed, scene, THREE) {
    if (playerZ < this._furthestZ) this._furthestZ = playerZ

    // Generate distance scales with player speed
    const speed = Math.max(currentSpeed, MOVE_SPEED)
    const generateDist = speed * GENERATE_TIME_AHEAD
    const targetZ = this._furthestZ - generateDist

    const targetSegment = Math.floor(-targetZ / SEGMENT_DEPTH)
    const added = []

    while (this._nextSegmentIndex <= targetSegment) {
      const seg = this._createSegment(THREE)
      this._segments.push(seg)
      for (const m of seg.meshes) { scene.add(m); added.push(m) }
      for (const m of seg.walls) { scene.add(m); added.push(m) }
    }

    return { added, removed: [] }
  }

  static get FOG_START() { return FOG_START }
  static get FOG_END() { return FOG_END }

  _createSegment(THREE) {
    const index = this._nextSegmentIndex++
    const startZ = -index * SEGMENT_DEPTH

    const { platforms, lastPlatform } = generateSegmentPlatforms(
      this._lastPlatform, startZ, this._difficulty
    )
    this._lastPlatform = lastPlatform

    const PALETTE = [0x4fc3f7, 0x81c784, 0xff8a65, 0xffd54f, 0xce93d8]
    const meshes = []
    const obstacles = []

    platforms.forEach((b, i) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, b.h, b.d),
        new THREE.MeshStandardMaterial({ color: PALETTE[i % PALETTE.length] })
      )
      mesh.position.set(b.x, b.y, b.z)
      const aabb = new THREE.Box3().setFromObject(mesh)
      meshes.push(mesh)
      obstacles.push({ mesh, aabb })
    })

    const walls = []
    const wallAABBs = []
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.9 })
    const midZ = startZ - SEGMENT_DEPTH / 2

    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_THICKNESS, CORRIDOR_HEIGHT, SEGMENT_DEPTH),
      wallMat
    )
    leftWall.position.set(-CORRIDOR_WIDTH / 2 - WALL_THICKNESS / 2, CORRIDOR_HEIGHT / 2, midZ)
    walls.push(leftWall)
    wallAABBs.push(new THREE.Box3().setFromObject(leftWall))

    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_THICKNESS, CORRIDOR_HEIGHT, SEGMENT_DEPTH),
      wallMat
    )
    rightWall.position.set(CORRIDOR_WIDTH / 2 + WALL_THICKNESS / 2, CORRIDOR_HEIGHT / 2, midZ)
    walls.push(rightWall)
    wallAABBs.push(new THREE.Box3().setFromObject(rightWall))

    if (index === 0) {
      const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(CORRIDOR_WIDTH + WALL_THICKNESS * 2, CORRIDOR_HEIGHT, WALL_THICKNESS),
        wallMat
      )
      backWall.position.set(0, CORRIDOR_HEIGHT / 2, startZ + 8 + WALL_THICKNESS / 2)
      backWall.visible = false
      walls.push(backWall)
      wallAABBs.push(new THREE.Box3().setFromObject(backWall))
    }

    return { index, startZ, platforms, meshes, walls, wallAABBs, obstacles }
  }

  getSpawnPosition() {
    return { x: 0, y: 1, z: -3 }
  }
}
