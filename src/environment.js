import * as THREE from 'three'
import config from './config.js'

// ── Lava Rocks ──────────────────────────────────────────────────────────────

const rockGeo = new THREE.IcosahedronGeometry(1, 1)
const rockMat = new THREE.MeshStandardMaterial({
  color: 0x2a1a0a,
  roughness: 0.9,
  emissive: 0xff4400,
  emissiveIntensity: 0.4,
})

const trailMat = new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 } },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    varying vec2 vUv;
    void main() {
      float fade = 1.0 - vUv.y;
      fade = pow(fade, 1.5);
      float flicker = sin(vUv.y * 15.0 - time * 8.0) * 0.3 + 0.7;
      float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
      vec3 fire = mix(vec3(1.0, 0.8, 0.1), vec3(1.0, 0.2, 0.0), vUv.y);
      fire = mix(fire, vec3(0.3, 0.05, 0.0), vUv.y * vUv.y);
      float alpha = fade * flicker * edge;
      gl_FragColor = vec4(fire * 2.0, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
})

const trailGeo = new THREE.PlaneGeometry(1, 1, 1, 8)

const rocks = []
let eruptTimer = 0
let globalTime = 0

function createRock() {
  const mesh = new THREE.Mesh(rockGeo, rockMat.clone())
  mesh.visible = false

  const trail = new THREE.Mesh(trailGeo, trailMat)
  trail.visible = false
  mesh.add(trail)

  return {
    mesh,
    trail,
    velocity: new THREE.Vector3(),
    spin: new THREE.Vector3(),
    active: false,
    isHazard: false,
    hazardTimer: 0,
    landed: false,
    landedOnPlatform: null,
  }
}

export function createRocks(scene) {
  for (let i = 0; i < config.ROCK_POOL_SIZE; i++) {
    const rock = createRock()
    rocks.push(rock)
    scene.add(rock.mesh)
  }
}

function eruptRock(playerX, playerZ) {
  const rock = rocks.find(r => !r.active)
  if (!rock) return

  const angle = Math.random() * Math.PI * 2
  const dist = 5 + Math.random() * config.ROCK_ERUPT_RADIUS
  const x = playerX + Math.cos(angle) * dist
  const z = playerZ + Math.sin(angle) * dist

  const size = config.ROCK_MIN_SIZE + Math.random() * (config.ROCK_MAX_SIZE - config.ROCK_MIN_SIZE)
  rock.mesh.scale.setScalar(size)
  rock.mesh.position.set(x, -0.1, z)
  rock.mesh.visible = true
  rock.mesh.material.emissiveIntensity = 0.4

  rock.trail.visible = true
  rock.trail.scale.set(size * 0.8, size * 3, 1)
  rock.trail.position.set(0, -size * 1.5, 0)

  const speed = config.ROCK_ERUPT_SPEED_MIN + Math.random() * (config.ROCK_ERUPT_SPEED_MAX - config.ROCK_ERUPT_SPEED_MIN)
  rock.velocity.set(
    (Math.random() - 0.5) * config.ROCK_LATERAL_SPEED,
    speed,
    (Math.random() - 0.5) * config.ROCK_LATERAL_SPEED
  )
  rock.spin.set(
    (Math.random() - 0.5) * config.ROCK_SPIN_SPEED,
    (Math.random() - 0.5) * config.ROCK_SPIN_SPEED,
    (Math.random() - 0.5) * config.ROCK_SPIN_SPEED
  )

  rock.active = true
  rock.landed = false
  rock.isHazard = Math.random() < config.ROCK_HAZARD_CHANCE
  rock.hazardTimer = 0
  rock.landedOnPlatform = null
}

export function updateRocks(delta, time, playerX, playerZ, obstacles) {
  globalTime = time
  trailMat.uniforms.time.value = time

  eruptTimer += delta
  while (eruptTimer >= config.ROCK_ERUPT_INTERVAL) {
    eruptTimer -= config.ROCK_ERUPT_INTERVAL
    eruptRock(playerX, playerZ)
  }

  for (const rock of rocks) {
    if (!rock.active) continue

    if (!rock.landed) {
      rock.velocity.y -= config.GRAVITY * delta
      rock.mesh.position.x += rock.velocity.x * delta
      rock.mesh.position.y += rock.velocity.y * delta
      rock.mesh.position.z += rock.velocity.z * delta
      rock.mesh.rotation.x += rock.spin.x * delta
      rock.mesh.rotation.y += rock.spin.y * delta
      rock.mesh.rotation.z += rock.spin.z * delta

      // Trail always faces up (billboard-style relative to rock rotation)
      rock.trail.rotation.set(-rock.mesh.rotation.x, -rock.mesh.rotation.y, -rock.mesh.rotation.z)

      // Emissive fades as rock rises and cools
      const heightFade = Math.max(0, 1.0 - rock.mesh.position.y / 15)
      rock.mesh.material.emissiveIntensity = 0.3 + heightFade * 0.5

      // Trail shrinks as velocity decreases
      const speed = rock.velocity.length()
      const trailScale = Math.min(1, speed / 10)
      const s = rock.mesh.scale.x
      rock.trail.scale.set(s * 0.8 * trailScale, s * 3 * trailScale, 1)
      rock.trail.visible = trailScale > 0.1

      if (rock.isHazard && rock.velocity.y < 0) {
        for (const obs of obstacles) {
          if (obs.isBillboard || obs.isSpawn) continue
          const rp = rock.mesh.position
          if (rp.x >= obs.aabb.min.x && rp.x <= obs.aabb.max.x &&
              rp.z >= obs.aabb.min.z && rp.z <= obs.aabb.max.z &&
              rp.y <= obs.aabb.max.y + 0.1 && rp.y >= obs.aabb.max.y - 0.5) {
            rock.landed = true
            rock.mesh.position.y = obs.aabb.max.y + rock.mesh.scale.x * 0.5
            rock.landedOnPlatform = obs
            rock.velocity.set(0, 0, 0)
            rock.spin.set(0, 0, 0)
            rock.mesh.material.emissiveIntensity = 0.8
            rock.trail.visible = false
            break
          }
        }
      }

      if (rock.mesh.position.y < -1) {
        rock.active = false
        rock.mesh.visible = false
        rock.trail.visible = false
      }
    } else {
      rock.hazardTimer += delta
      const pulse = 0.5 + 0.5 * Math.sin(rock.hazardTimer * 6)
      rock.mesh.material.emissiveIntensity = 0.4 + pulse * 0.6
      if (rock.hazardTimer >= config.ROCK_HAZARD_LIFETIME) {
        rock.active = false
        rock.mesh.visible = false
        rock.trail.visible = false
        rock.landed = false
      }
    }
  }
}

export function getRockHazards() {
  return rocks.filter(r => r.active && r.landed && r.isHazard)
}

// ── Distant Mountains ───────────────────────────────────────────────────────

const MOUNTAIN_VERTEX = `
  attribute float heightFrac;
  varying float vHeightFrac;

  void main() {
    vHeightFrac = heightFrac;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const MOUNTAIN_FRAGMENT = `
  uniform vec3 baseColor;
  varying float vHeightFrac;

  void main() {
    float heightNorm = clamp(vHeightFrac, 0.0, 1.0);
    vec3 color = baseColor * (0.3 + 0.7 * (1.0 - heightNorm));
    float alpha = smoothstep(0.0, 0.02, heightNorm);
    gl_FragColor = vec4(color, alpha);
  }
`

const mountainLayers = []

export function createMountains(scene) {
  const baseColors = [
    new THREE.Vector3(0.08, 0.03, 0.015),
    new THREE.Vector3(0.1, 0.04, 0.02),
    new THREE.Vector3(0.12, 0.05, 0.025),
  ]

  for (let i = 0; i < config.MOUNTAIN_LAYER_COUNT; i++) {
    const radius = config.MOUNTAIN_RADIUS_INNER + i * config.MOUNTAIN_RADIUS_STEP
    const segments = config.MOUNTAIN_SEGMENTS
    const heightScale = config.MOUNTAIN_HEIGHT_MIN + (i / (config.MOUNTAIN_LAYER_COUNT - 1)) * (config.MOUNTAIN_HEIGHT_MAX - config.MOUNTAIN_HEIGHT_MIN)

    const geo = new THREE.CylinderGeometry(radius, radius * 1.05, heightScale, segments, 24, true)
    const positions = geo.attributes.position
    const heightFracArr = new Float32Array(positions.count)

    for (let v = 0; v < positions.count; v++) {
      const x = positions.getX(v)
      const y = positions.getY(v)
      const z = positions.getZ(v)

      const angle = Math.atan2(x, z)
      const normalizedY = (y + heightScale / 2) / heightScale

      if (normalizedY < 0.01) {
        positions.setY(v, -2)
        heightFracArr[v] = 0
        continue
      }

      let mountainProfile = 0
      mountainProfile += Math.sin(angle * 3 + i * 2) * 0.3
      mountainProfile += Math.sin(angle * 7 + i * 5) * 0.15
      mountainProfile += Math.sin(angle * 13 + i * 3) * 0.08
      mountainProfile += Math.sin(angle * 19 + i * 7) * 0.04
      mountainProfile += Math.sin(angle * 31 + i * 11) * 0.03
      mountainProfile = (mountainProfile + 1) * 0.5

      const peakVariation = Math.pow(Math.sin(angle * 5 + i * 1.7) * 0.5 + 0.5, 1.5)
      const peakHeight = heightScale * (0.3 + 0.7 * mountainProfile) * (0.5 + 0.5 * peakVariation)

      const taper = Math.pow(normalizedY, 0.6)
      const finalHeight = -2 + normalizedY * peakHeight

      const radialShrink = 1.0 - taper * 0.15
      positions.setX(v, x * radialShrink)
      positions.setZ(v, z * radialShrink)
      positions.setY(v, finalHeight)

      heightFracArr[v] = normalizedY
    }

    positions.needsUpdate = true
    geo.setAttribute('heightFrac', new THREE.BufferAttribute(heightFracArr, 1))
    geo.computeVertexNormals()

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: baseColors[i] },
      },
      vertexShader: MOUNTAIN_VERTEX,
      fragmentShader: MOUNTAIN_FRAGMENT,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      fog: false,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = -10 + i
    scene.add(mesh)
    mountainLayers.push({ mesh, mat })
  }
}

export function updateMountains(time, playerX, playerZ) {
  for (let i = 0; i < mountainLayers.length; i++) {
    const layer = mountainLayers[i]
    const parallax = 1.0 - i * 0.1
    layer.mesh.position.set(playerX, 0, playerZ)
  }
}
