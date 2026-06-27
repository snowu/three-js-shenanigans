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
  vec3 x2=2.0*fract(p*C.www)-1.0;vec3 h=abs(x2)-0.5;
  vec3 ox=floor(x2+0.5);vec3 a0=x2-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
`

const BILLBOARD_FRAG = `
  ${SNOISE_GLSL}
  uniform float time;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main(){
    // Rusty metal base
    float rust = snoise(vWorldPos.xz * 3.0) * 0.5 + 0.5;
    vec3 darkMetal = vec3(0.06, 0.05, 0.05);
    vec3 rustColor = vec3(0.15, 0.07, 0.03);
    vec3 base = mix(darkMetal, rustColor, rust * 0.4);

    // Neon warning stripe at 70% height
    float stripeDist = abs(vUv.y - 0.7);
    float neonStripe = smoothstep(0.02, 0.0, stripeDist);
    float pulse = sin(time * 2.5 + vWorldPos.z * 0.5) * 0.15 + 0.85;
    vec3 neonColor = vec3(1.0, 0.35, 0.0);
    vec3 color = base + neonColor * neonStripe * pulse * 1.8;

    // Thin accent line at 30%
    float accent = smoothstep(0.01, 0.0, abs(vUv.y - 0.3));
    color += vec3(0.8, 0.15, 0.0) * accent * 0.6;

    // Corner rivets
    vec2 rivetUV = fract(vUv * vec2(2.0, 6.0)) - 0.5;
    float rivet = smoothstep(0.08, 0.05, length(rivetUV));
    float rivetGrid = step(0.9, fract(vUv.x * 2.0)) * step(0.85, fract(vUv.y * 6.0));
    color += vec3(0.3) * rivet * rivetGrid;

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
