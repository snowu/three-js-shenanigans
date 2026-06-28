import * as THREE from 'three'

// ── Shared simplex noise GLSL ──────────────────────────────────────────────
const SNOISE_GLSL = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m;m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;
  vec3 ox=floor(x+0.5);vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
float fbm(vec2 p,float oct){float v=0.0,a=0.5,f=1.0;for(int i=0;i<5;i++){if(float(i)>=oct)break;v+=a*snoise(p*f);f*=2.0;a*=0.5;}return v;}
`

// ── Shared geometries ─────────────────────────────────────────────────────
const blobGeo = new THREE.SphereGeometry(0.06, 6, 6)
const debrisGeo = new THREE.IcosahedronGeometry(0.08, 0)
const rivetGeo = new THREE.SphereGeometry(0.04, 6, 6)
const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1)
const unitPlaneGeo = new THREE.PlaneGeometry(1, 1)
const unitCylinderGeo = new THREE.CylinderGeometry(0.3, 1, 1, 6)
const thinCylinderGeo = new THREE.CylinderGeometry(0.2, 1, 1, 6)

// ── Volcanic Rock ──────────────────────────────────────────────────────────

const VOLCANIC_VERT = `
  ${SNOISE_GLSL}
  uniform float time;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  void main(){
    vNormal = normalize(normalMatrix * normal);
    vec3 pos = position;
    float n = snoise(pos.xz * 1.5) * 0.03;
    pos += normal * n;
    vWorldPos = (modelMatrix * vec4(pos,1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
  }
`

const VOLCANIC_FRAG = `
  ${SNOISE_GLSL}
  uniform float time;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  void main(){
    vec2 uv = vWorldPos.xz * 0.6;
    float t = time * 0.15;
    float rockNoise = fbm(uv * 1.0, 3.0);
    vec3 darkRock = vec3(0.07, 0.04, 0.025);
    vec3 lightRock = vec3(0.14, 0.08, 0.05);
    vec3 rock = mix(darkRock, lightRock, rockNoise * 0.5 + 0.5);
    float crack = abs(snoise(uv * 1.0 + t * 0.08));
    float crackMask = 1.0 - smoothstep(0.0, 0.22, crack);
    crackMask = pow(crackMask, 1.5) * 0.7;
    float heat = snoise(uv * 0.7 + t * 0.2) * 0.5 + 0.5;
    vec3 crackColor = mix(vec3(0.8, 0.15, 0.0), vec3(1.0, 0.5, 0.05), heat);
    float pulse = sin(time * 1.0 + snoise(uv * 0.5) * 3.0) * 0.15 + 0.85;
    crackMask *= pulse;
    vec3 color = mix(rock, crackColor * 2.0, crackMask);
    vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
    float diff = max(dot(vNormal, lightDir), 0.0) * 0.5 + 0.5;
    vec3 glow = crackColor * crackMask * 1.2;
    gl_FragColor = vec4(color * diff + glow, 1.0);
  }
`

// Single shared volcanic ShaderMaterial — worldPos gives per-instance variation
const volcanicMat = new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 } },
  vertexShader: VOLCANIC_VERT,
  fragmentShader: VOLCANIC_FRAG,
})
// Low-subdivision box for volcanic displacement — shared, scaled per platform
const volcanicBoxGeo = new THREE.BoxGeometry(1, 1, 1, 8, 2, 8)

const volcanicDripMat = new THREE.MeshStandardMaterial({
  color: 0xff4400, emissive: 0xff3300, emissiveIntensity: 4,
  roughness: 0.3, transparent: true, opacity: 0.9,
})
const volcanicBlobMat = new THREE.MeshStandardMaterial({
  color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 5,
  roughness: 0.2, transparent: true, opacity: 0.8,
})
const volcanicDebrisMat = new THREE.MeshStandardMaterial({
  color: 0x2a1a0e, roughness: 0.9, emissive: 0xff3300, emissiveIntensity: 0.4,
})

function buildVolcanic(b) {
  const meshes = []

  const mainMesh = new THREE.Mesh(volcanicBoxGeo, volcanicMat)
  mainMesh.scale.set(b.w, b.h, b.d)
  mainMesh.position.set(b.x, b.y, b.z)
  meshes.push(mainMesh)

  const botY = b.y - b.h / 2

  const dripOffsets = [
    [-b.w * 0.25, b.d * 0.15, 0.5],
    [b.w * 0.2, -b.d * 0.25, 0.7],
    [-b.w * 0.1, -b.d * 0.1, 0.4],
    [b.w * 0.35, b.d * 0.05, 0.55],
  ]
  for (const [dx, dz, h] of dripOffsets) {
    const r = 0.04 + Math.abs(dx) * 0.02
    const drip = new THREE.Mesh(unitCylinderGeo, volcanicDripMat)
    drip.scale.set(r, h, r)
    drip.position.set(b.x + dx, botY - h / 2, b.z + dz)
    meshes.push(drip)

    const blob = new THREE.Mesh(blobGeo, volcanicBlobMat)
    blob.position.set(b.x + dx, botY - h, b.z + dz)
    meshes.push(blob)
  }

  const topY = b.y + b.h / 2
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + b.x * 0.5
    const dist = Math.max(b.w, b.d) * 0.5 + 0.1 + (Math.sin(i * 7.3 + b.z) * 0.5 + 0.5) * 0.3
    const debris = new THREE.Mesh(debrisGeo, volcanicDebrisMat)
    debris.position.set(
      b.x + Math.cos(angle) * dist * (b.w / b.d),
      topY + (Math.sin(i * 3.1 + b.x) * 0.5 + 0.5) * 0.05,
      b.z + Math.sin(angle) * dist * (b.d / b.w)
    )
    debris.rotation.set(i * 1.1, i * 0.7, i * 0.5)
    const s = 0.6 + (Math.sin(i * 5.3) * 0.5 + 0.5) * 0.8
    debris.scale.setScalar(s)
    meshes.push(debris)
  }

  return { meshes, mainMesh, update: null }
}

// ── Ancient Stone Ruins ────────────────────────────────────────────────────

const ruinsStoneMat = new THREE.MeshStandardMaterial({ color: 0x6b6355, roughness: 0.92, metalness: 0.02 })
const ruinsCharredMat = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.95 })
const ruinsMossMat = new THREE.MeshStandardMaterial({ color: 0x3d5c3a, roughness: 0.9 })
const ruinsGoldTrimMat = new THREE.MeshStandardMaterial({
  color: 0x9a8860, roughness: 0.5, metalness: 0.6, emissive: 0x4a3820, emissiveIntensity: 0.2,
})
const ruinsCrackMat = new THREE.MeshStandardMaterial({ color: 0x111008, roughness: 1 })
const ruinsRubbleMat = new THREE.MeshStandardMaterial({ color: 0x8a7d6b, roughness: 0.9 })

function buildRuins(b) {
  const meshes = []
  const halfW = b.w / 2, halfD = b.d / 2

  const mainMesh = new THREE.Mesh(unitBoxGeo, ruinsStoneMat)
  mainMesh.scale.set(b.w, b.h, b.d)
  mainMesh.position.set(b.x, b.y, b.z)
  meshes.push(mainMesh)

  const topY = b.y + b.h / 2
  const trimH = 0.04
  const trimInset = 0.06

  for (const zSign of [1, -1]) {
    const trim = new THREE.Mesh(unitBoxGeo, ruinsGoldTrimMat)
    trim.scale.set(b.w - trimInset * 2, trimH, trimInset)
    trim.position.set(b.x, topY + trimH / 2, b.z + zSign * (halfD - trimInset / 2))
    meshes.push(trim)
  }
  for (const xSign of [1, -1]) {
    const trim = new THREE.Mesh(unitBoxGeo, ruinsGoldTrimMat)
    trim.scale.set(trimInset, trimH, b.d - trimInset * 2)
    trim.position.set(b.x + xSign * (halfW - trimInset / 2), topY + trimH / 2, b.z)
    meshes.push(trim)
  }

  const mossData = [
    [0.2 * b.w, 0.25 * b.d, 0.15 * b.w, 0.12 * b.d],
    [-0.25 * b.w, -0.15 * b.d, 0.12 * b.w, 0.1 * b.d],
    [0.05 * b.w, -0.35 * b.d, 0.1 * b.w, 0.08 * b.d],
  ]
  for (const [dx, dz, mw, md] of mossData) {
    const moss = new THREE.Mesh(unitBoxGeo, ruinsMossMat)
    moss.scale.set(mw, 0.03, md)
    moss.position.set(b.x + dx, topY + 0.015, b.z + dz)
    meshes.push(moss)
  }

  const crack1 = new THREE.Mesh(unitBoxGeo, ruinsCrackMat)
  crack1.scale.set(0.02, b.h + 0.02, b.d * 0.8)
  crack1.position.set(b.x + b.w * 0.13, b.y, b.z)
  crack1.rotation.y = 0.15
  meshes.push(crack1)
  const crack2 = new THREE.Mesh(unitBoxGeo, ruinsCrackMat)
  crack2.scale.set(0.02, b.h + 0.02, b.d * 0.3)
  crack2.position.set(b.x + b.w * 0.2, b.y, b.z + b.d * 0.15)
  crack2.rotation.y = -0.8
  meshes.push(crack2)

  for (const [dx, dz] of [[-0.15 * b.w, 0.15 * b.d], [0.25 * b.w, -0.2 * b.d]]) {
    const scorch = new THREE.Mesh(unitBoxGeo, ruinsCharredMat)
    scorch.scale.set(b.w * 0.25, 0.05, b.d * 0.2)
    scorch.position.set(b.x + dx, b.y - b.h / 2 + 0.025, b.z + dz)
    meshes.push(scorch)
  }

  const rubbleData = [
    [halfW + 0.15, 0.4 * halfD, 25],
    [halfW + 0.05, 0.25 * halfD, -15],
    [halfW + 0.2, 0.15 * halfD, 40],
    [-halfW - 0.1, -0.3 * halfD, -20],
    [-halfW - 0.05, -0.4 * halfD, 35],
  ]
  for (const [dx, dz, rotDeg] of rubbleData) {
    const s = 0.08 + Math.abs(Math.sin(dx * 10 + dz * 7)) * 0.12
    const rubble = new THREE.Mesh(unitBoxGeo, ruinsRubbleMat)
    rubble.scale.set(s, s * 0.7, s * 0.9)
    rubble.position.set(b.x + dx, s * 0.35, b.z + dz)
    rubble.rotation.y = rotDeg * Math.PI / 180
    rubble.rotation.z = (Math.sin(dx * 5) * 0.5) * 0.3
    meshes.push(rubble)
  }

  return { meshes, mainMesh, update: null }
}

// ── Metal / Industrial ─────────────────────────────────────────────────────

const metalPlatMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.45, metalness: 0.85 })
const metalFrameMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.9 })
const metalRivetMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.9 })
const metalGrateMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.5 })
const metalRustMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9, metalness: 0.3 })
const metalToxicDripMat = new THREE.MeshStandardMaterial({
  color: 0x2aaa10, emissive: 0x1a8808, emissiveIntensity: 1.5,
  roughness: 0.4, transparent: true, opacity: 0.75,
})
const metalToxicBlobMat = new THREE.MeshStandardMaterial({
  color: 0x33aa15, emissive: 0x1a8808, emissiveIntensity: 2.5,
  transparent: true, opacity: 0.7,
})

const PUDDLE_VERT = `
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const PUDDLE_FRAG = `
  ${SNOISE_GLSL}
  uniform float time;
  uniform float seed;
  varying vec2 vUv;
  void main(){
    vec2 centered = (vUv - 0.5) * 2.0;
    float dist = length(centered);
    float angle = atan(centered.y, centered.x);
    float wobble = snoise(vec2(angle * 2.0 + seed, seed * 3.0)) * 0.25;
    wobble += snoise(vec2(angle * 5.0 + seed * 2.0, seed)) * 0.12;
    float edge = 0.7 + wobble;
    float mask = 1.0 - smoothstep(edge - 0.15, edge, dist);
    float n1 = snoise(vUv * 6.0 + time * 0.3 + seed) * 0.5 + 0.5;
    float n2 = snoise(vUv * 10.0 - time * 0.2 + seed * 2.0) * 0.5 + 0.5;
    vec3 darkGreen = vec3(0.1, 0.35, 0.05);
    vec3 toxicGreen = vec3(0.25, 0.85, 0.1);
    vec3 sickYellow = vec3(0.6, 0.7, 0.05);
    vec3 murky = vec3(0.15, 0.25, 0.02);
    vec3 color = mix(darkGreen, toxicGreen, n1);
    color = mix(color, sickYellow, n2 * 0.4);
    color = mix(color, murky, pow(n1 * n2, 2.0) * 0.5);
    float bubble = pow(max(0.0, snoise(vUv * 15.0 + time * 0.8 + seed)), 4.0);
    color += vec3(0.3, 0.9, 0.1) * bubble * 0.8;
    float glow = 0.8 + sin(time * 2.0 + n1 * 4.0) * 0.2;
    float alpha = mask * 0.75;
    gl_FragColor = vec4(color * glow, alpha);
  }
`

// Pool of puddle materials — reuse by index to avoid shader recompilation
const PUDDLE_POOL_SIZE = 6
const puddlePool = []
for (let i = 0; i < PUDDLE_POOL_SIZE; i++) {
  puddlePool.push(new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, seed: { value: i * 7.13 + 3.7 } },
    vertexShader: PUDDLE_VERT,
    fragmentShader: PUDDLE_FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }))
}

function buildMetal(b, globalIndex) {
  const meshes = []
  const halfW = b.w / 2, halfD = b.d / 2
  const topY = b.y + b.h / 2

  const mainMesh = new THREE.Mesh(unitBoxGeo, metalPlatMat)
  mainMesh.scale.set(b.w, b.h, b.d)
  mainMesh.position.set(b.x, b.y, b.z)
  meshes.push(mainMesh)

  const fh = 0.08, fw = 0.1
  for (const zSign of [1, -1]) {
    const f = new THREE.Mesh(unitBoxGeo, metalFrameMat)
    f.scale.set(b.w, fh, fw)
    f.position.set(b.x, topY + fh / 2, b.z + zSign * halfD)
    meshes.push(f)
  }
  for (const xSign of [1, -1]) {
    const f = new THREE.Mesh(unitBoxGeo, metalFrameMat)
    f.scale.set(fw, fh, b.d)
    f.position.set(b.x + xSign * halfW, topY + fh / 2, b.z)
    meshes.push(f)
  }

  const rivetY = topY + fh
  const rivetPositions = [
    [-halfW, rivetY, halfD], [halfW, rivetY, halfD],
    [-halfW, rivetY, -halfD], [halfW, rivetY, -halfD],
    [0, rivetY, halfD], [0, rivetY, -halfD],
    [-halfW, rivetY, 0], [halfW, rivetY, 0],
  ]
  for (const [rx, ry, rz] of rivetPositions) {
    const rivet = new THREE.Mesh(rivetGeo, metalRivetMat)
    rivet.position.set(b.x + rx, ry, b.z + rz)
    meshes.push(rivet)
  }

  const grateCount = Math.max(3, Math.floor(b.d / 0.35))
  const grateSpacing = b.d / (grateCount + 1)
  for (let i = 1; i <= grateCount; i++) {
    const grate = new THREE.Mesh(unitBoxGeo, metalGrateMat)
    grate.scale.set(b.w * 0.85, 0.02, 0.03)
    grate.position.set(b.x, topY + 0.01, b.z - halfD + i * grateSpacing)
    meshes.push(grate)
  }

  const rustData = [
    [-0.2 * b.w, 0.2 * b.d, 0.15 * b.w],
    [0.25 * b.w, -0.15 * b.d, 0.12 * b.w],
    [0.1 * b.w, 0.3 * b.d, 0.1 * b.w],
  ]
  for (const [dx, dz, s] of rustData) {
    const rust = new THREE.Mesh(unitBoxGeo, metalRustMat)
    rust.scale.set(s, 0.01, s * 0.8)
    rust.position.set(b.x + dx, topY + 0.005, b.z + dz)
    meshes.push(rust)
  }

  // Puddles — pick from pool by global index
  const puddleData = [
    { dx: 0.15 * b.w, dz: 0.1 * b.d, scale: Math.min(b.w, b.d) * 0.25 },
    { dx: -0.2 * b.w, dz: -0.15 * b.d, scale: Math.min(b.w, b.d) * 0.18 },
  ]
  for (let pi = 0; pi < puddleData.length; pi++) {
    const pd = puddleData[pi]
    const mat = puddlePool[(globalIndex * 2 + pi) % PUDDLE_POOL_SIZE]
    const mesh = new THREE.Mesh(unitPlaneGeo, mat)
    mesh.scale.set(pd.scale, pd.scale, 1)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(b.x + pd.dx, topY + 0.015, b.z + pd.dz)
    meshes.push(mesh)
  }

  // Toxic drips
  const dripData = [
    [0.15 * b.w, halfD, 0.04, 0.5],
    [-0.2 * b.w, -halfD, 0.03, 0.6],
    [0.35 * b.w, 0.25 * b.d, 0.03, 0.35],
  ]
  for (const [dx, dz, r, h] of dripData) {
    const drip = new THREE.Mesh(thinCylinderGeo, metalToxicDripMat)
    drip.scale.set(r, h, r)
    drip.position.set(b.x + dx, b.y - b.h / 2 - h / 2, b.z + dz)
    meshes.push(drip)

    const blob = new THREE.Mesh(blobGeo, metalToxicBlobMat)
    blob.scale.setScalar(r * 2 / 0.06)
    blob.position.set(b.x + dx, b.y - b.h / 2 - h - r, b.z + dz)
    meshes.push(blob)
  }

  return { meshes, mainMesh, update: null }
}

// ── Global update for all animated materials ──────────────────────────────
export function updatePlatformMaterials(time) {
  volcanicMat.uniforms.time.value = time
  for (const m of puddlePool) m.uniforms.time.value = time
}

// ── Factory ────────────────────────────────────────────────────────────────

const builders = [buildVolcanic, buildRuins, buildMetal]

export function createPlatformMeshes(b, index) {
  const style = ((index % 3) + 3) % 3
  if (style === 2) return builders[style](b, index)
  return builders[style](b)
}
