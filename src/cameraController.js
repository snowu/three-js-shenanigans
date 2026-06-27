import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const MODES = ['third-person', 'first-person', 'free']

export class CameraController {
  constructor(camera, domElement, humanoid) {
    this._camera = camera
    this._domElement = domElement
    this._humanoid = humanoid
    this._modeIndex = 0
    this._yaw = 0
    this._pitch = 0
    this._prevMouseX = null
    this._prevMouseY = null
    this._skipWarpEvent = false

    // Set a valid initial camera position before constructing OrbitControls.
    // OrbitControls calls update() internally during construction; if the camera
    // is at the origin (same as its default target) it corrupts camera.up,
    // causing a rolled view on first load.
    camera.position.set(0, 3, 5)
    camera.lookAt(0, 1, 0)

    this._orbit = new OrbitControls(camera, domElement)
    this._orbit.enableDamping = true
    this._orbit.enabled = false

    domElement.addEventListener('mousedown', () => this._requestLock())
    document.addEventListener('mousemove', (e) => this._onMouseMove(e))
    document.addEventListener('pointerlockchange', () => {
      if (this._isLocked) {
        this._skipWarpEvent = true
      } else {
        this._prevMouseX = null
        this._prevMouseY = null
      }
    })
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF') this._cycleMode()
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) && this.mode !== 'free') {
        this._requestLock()
      }
    })
  }

  get mode() { return MODES[this._modeIndex] }

  get cameraYaw() { return this._yaw }

  get _isLocked() { return document.pointerLockElement === this._domElement }

  _requestLock() {
    if (this.mode !== 'free') this._domElement.requestPointerLock()
  }

  _cycleMode() {
    this._modeIndex = (this._modeIndex + 1) % MODES.length
    this._yaw = 0
    this._pitch = 0
    this._prevMouseX = null
    this._prevMouseY = null
    if (this.mode === 'free') {
      document.exitPointerLock()
      this._orbit.enabled = true
      this._orbit.target.set(
        this._humanoid.position.x,
        this._humanoid.position.y + 1,
        this._humanoid.position.z
      )
    } else {
      this._orbit.enabled = false
      this._requestLock()
    }
  }

  _onMouseMove(e) {
    if (this.mode === 'free') return

    const sensitivity = 0.002

    if (this._isLocked) {
      if (this._skipWarpEvent) { this._skipWarpEvent = false; return }
      this._yaw -= e.movementX * sensitivity
      this._pitch -= e.movementY * sensitivity
    } else if (this.mode === 'third-person') {
      // No lock: delta from previous clientX position
      if (this._prevMouseX !== null) {
        this._yaw -= (e.clientX - this._prevMouseX) * sensitivity
        this._pitch -= (e.clientY - this._prevMouseY) * sensitivity
      }
      this._prevMouseX = e.clientX
      this._prevMouseY = e.clientY
    }
    // first-person without lock: no-op — pointer must be locked

    this._pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this._pitch))
  }

  update() {
    const h = this._humanoid

    if (this.mode === 'third-person') {
      this._camera.up.set(0, 1, 0)
      this._camera.position.set(
        h.position.x + 5 * Math.sin(this._yaw),
        h.position.y + 3,
        h.position.z + 5 * Math.cos(this._yaw)
      )
      this._camera.lookAt(h.position.x, h.position.y + 1, h.position.z)
      h.rotation.y = this._yaw

    } else if (this.mode === 'first-person') {
      this._camera.position.set(h.position.x, h.position.y + 1.75, h.position.z)
      this._camera.rotation.order = 'YXZ'
      this._camera.rotation.set(this._pitch, this._yaw, 0)
      h.rotation.y = this._yaw

    } else {
      this._orbit.update()
    }
  }
}
