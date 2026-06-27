import * as THREE from 'three'

const BILLBOARD_VERT = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main(){
    vUv = uv;
    vWorldPos = (modelMatrix * vec4(position,1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`

const BILLBOARD_FRAG = `
  uniform float time;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  float hash(vec2 p){
    return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);
  }

  void main(){
    // Dark metal base
    vec3 baseMetal = vec3(0.08, 0.08, 0.1);
    float grain = hash(floor(vWorldPos.xz * 20.0)) * 0.03;
    vec3 color = baseMetal + grain;

    // Diagonal caution chevrons — yellow/black
    float chevronScale = 3.0;
    float diag = vUv.x * chevronScale + vUv.y * chevronScale;
    float chevron = step(0.5, fract(diag));

    // Restrict chevrons to horizontal bands
    float bandY = fract(vUv.y * 4.0);
    float inBand = step(0.7, bandY);

    float chevronMask = chevron * inBand;
    vec3 cautionYellow = vec3(1.0, 0.75, 0.0);
    vec3 cautionBlack = vec3(0.02, 0.02, 0.02);
    vec3 chevronColor = mix(cautionBlack, cautionYellow, chevronMask);

    // Blend chevron bands onto base
    color = mix(color, chevronColor, inBand * 0.9);

    // Neon edge strips — top and bottom glow
    float edgeDist = min(vUv.y, 1.0 - vUv.y);
    float edgeGlow = smoothstep(0.05, 0.0, edgeDist);
    float pulse = sin(time * 3.0) * 0.3 + 0.7;
    vec3 neonOrange = vec3(1.0, 0.3, 0.0);
    color += neonOrange * edgeGlow * pulse * 2.0;

    // Horizontal neon strip at center
    float centerDist = abs(vUv.y - 0.5);
    float centerGlow = smoothstep(0.03, 0.0, centerDist);
    vec3 neonRed = vec3(1.0, 0.1, 0.05);
    float centerPulse = sin(time * 2.0 + 1.5) * 0.25 + 0.75;
    color += neonRed * centerGlow * centerPulse * 1.5;

    // Hazard triangle symbol in each band gap
    float gapY = fract(vUv.y * 4.0);
    float inGap = 1.0 - inBand;
    float gapCenterY = (gapY - 0.35) / 0.35;
    float gapCenterX = (fract(vUv.x * 2.0) - 0.5) * 2.0;
    float triDist = max(abs(gapCenterX) - (1.0 - gapCenterY) * 0.5, -gapCenterY);
    float triMask = smoothstep(0.02, 0.0, triDist) * step(0.0, gapCenterY) * inGap;
    vec3 warnRed = vec3(1.0, 0.15, 0.0);
    float triPulse = sin(time * 1.5 + vWorldPos.z * 0.3) * 0.2 + 0.8;
    color += warnRed * triMask * triPulse * 0.8;

    // Scanline effect
    float scanline = sin(vWorldPos.y * 40.0 + time * 5.0) * 0.5 + 0.5;
    color *= 0.9 + scanline * 0.1;

    gl_FragColor = vec4(color, 1.0);
  }
`

const billboardMat = new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 } },
  vertexShader: BILLBOARD_VERT,
  fragmentShader: BILLBOARD_FRAG,
})

const frameMat = new THREE.MeshStandardMaterial({
  color: 0x222222, roughness: 0.6, metalness: 0.9,
})

const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1)

export function createBillboardMeshes(bb, config) {
  const meshes = []
  const bbH = config.BILLBOARD_HEIGHT
  const bbW = config.BILLBOARD_WIDTH
  const bbD = config.BILLBOARD_DEPTH
  const bbY = bb.y + bbH / 2

  // Main billboard slab
  const main = new THREE.Mesh(unitBoxGeo, billboardMat)
  main.scale.set(bbW, bbH, bbD)
  main.position.set(bb.x, bbY, bb.z)
  meshes.push(main)

  // Metal frame edges — top and bottom
  const frameH = 0.15
  for (const ySign of [1, -1]) {
    const frame = new THREE.Mesh(unitBoxGeo, frameMat)
    frame.scale.set(bbW + 0.1, frameH, bbD + 0.1)
    frame.position.set(bb.x, bbY + ySign * (bbH / 2 + frameH / 2), bb.z)
    meshes.push(frame)
  }

  return { meshes, mainMesh: main }
}

export function updateBillboardMaterials(time) {
  billboardMat.uniforms.time.value = time
}
