import * as THREE from 'three'

export class Movement {
  constructor() {
    this._keys = { w: false, a: false, s: false, d: false }
    this.speed = 10

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW') this._keys.w = true
      if (e.code === 'KeyA') this._keys.a = true
      if (e.code === 'KeyS') this._keys.s = true
      if (e.code === 'KeyD') this._keys.d = true
    })

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW') this._keys.w = false
      if (e.code === 'KeyA') this._keys.a = false
      if (e.code === 'KeyS') this._keys.s = false
      if (e.code === 'KeyD') this._keys.d = false
    })
  }

  update(humanoid, cameraYaw, delta) {
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw))
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw))
    const move = new THREE.Vector3()

    if (this._keys.w) move.add(forward)
    if (this._keys.s) move.sub(forward)
    if (this._keys.d) move.add(right)
    if (this._keys.a) move.sub(right)

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(this.speed * delta)
      humanoid.position.add(move)
    }
  }
}
