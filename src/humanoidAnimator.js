import {
  ANIM_IDLE_BOB_SPEED, ANIM_IDLE_BOB_AMOUNT, ANIM_IDLE_ARM_ANGLE,
  ANIM_RUN_LEG_AMPLITUDE, ANIM_RUN_ARM_AMPLITUDE, ANIM_RUN_FREQ_SCALE,
  ANIM_LANDING_DURATION, ANIM_PULLUP_DURATION,
  MOVE_SPEED,
} from './config.js'

const ANIM_STATE = {
  IDLE:       'idle',
  RUNNING:    'running',
  JUMPING:    'jumping',
  FALLING:    'falling',
  LANDING:    'landing',
  HANGING:    'hanging',
  PULL_UP:    'pullUp',
}

export class HumanoidAnimator {
  constructor(joints, physics) {
    this._joints = joints
    this._physics = physics
    this._state = ANIM_STATE.IDLE
    this._time = 0
    this._stateTimer = 0
    this._airborneTimer = 0

    this._bodyBaseY = joints.body.position.y

    // Camera offset — applied by cameraController
    this.cameraYOffset = 0

    physics.onLand = () => {
      if (this._airborneTimer < 0.1) return
      this._setState(ANIM_STATE.LANDING)
    }
    physics.onGrab = () => {
      this._setState(ANIM_STATE.HANGING)
    }
    physics.onPullUp = () => {
      this._setState(ANIM_STATE.PULL_UP)
    }
    physics.onDoubleJump = null
  }

  _setState(state) {
    if (this._state === state) return
    this._state = state
    this._stateTimer = 0
  }

  update(delta) {
    this._time += delta
    this._stateTimer += delta

    const phys = this._physics
    const hSpeed = phys.horizontalSpeed

    if (phys.state === 'airborne' || phys.state === 'hanging') {
      this._airborneTimer += delta
    } else {
      this._airborneTimer = 0
    }

    // Timed state transitions
    if (this._state === ANIM_STATE.LANDING) {
      if (this._stateTimer >= ANIM_LANDING_DURATION) {
        this._setState(hSpeed > 0.5 ? ANIM_STATE.RUNNING : ANIM_STATE.IDLE)
      }
    } else if (this._state === ANIM_STATE.PULL_UP) {
      if (this._stateTimer >= ANIM_PULLUP_DURATION) {
        this._setState(ANIM_STATE.IDLE)
      }
    } else if (this._state !== ANIM_STATE.HANGING) {
      if (phys.state === 'grounded') {
        if (hSpeed > 0.5) {
          this._setState(ANIM_STATE.RUNNING)
        } else if (this._state !== ANIM_STATE.LANDING) {
          this._setState(ANIM_STATE.IDLE)
        }
      } else if (phys.state === 'airborne') {
        if (phys.velocity.y > 0) {
          this._setState(ANIM_STATE.JUMPING)
        } else if (this._airborneTimer > 0.05) {
          this._setState(ANIM_STATE.FALLING)
        }
      }
    }

    this.cameraYOffset = 0

    switch (this._state) {
      case ANIM_STATE.IDLE:     this._poseIdle(); break
      case ANIM_STATE.RUNNING:  this._poseRunning(); break
      case ANIM_STATE.JUMPING:  this._poseJumping(); break
      case ANIM_STATE.FALLING:  this._poseFalling(); break
      case ANIM_STATE.LANDING:  this._poseLanding(); break
      case ANIM_STATE.HANGING:  this._poseHanging(); break
      case ANIM_STATE.PULL_UP:  this._posePullUp(); break
    }
  }

  _resetLimbs() {
    const j = this._joints
    j.shoulderL.rotation.set(0, 0, 0)
    j.shoulderR.rotation.set(0, 0, 0)
    j.hipL.rotation.set(0, 0, 0)
    j.hipR.rotation.set(0, 0, 0)
    j.root.rotation.set(0, 0, 0)
    j.body.position.y = this._bodyBaseY
    j.head.position.y = 1.75
  }

  _poseIdle() {
    this._resetLimbs()
    const j = this._joints
    const bob = Math.sin(this._time * ANIM_IDLE_BOB_SPEED) * ANIM_IDLE_BOB_AMOUNT
    j.shoulderL.rotation.z = ANIM_IDLE_ARM_ANGLE
    j.shoulderR.rotation.z = -ANIM_IDLE_ARM_ANGLE
    this.cameraYOffset = bob
  }

  _poseRunning() {
    this._resetLimbs()
    const j = this._joints
    const freq = this._physics.horizontalSpeed * ANIM_RUN_FREQ_SCALE
    const phase = this._time * freq

    j.hipL.rotation.x = Math.sin(phase) * ANIM_RUN_LEG_AMPLITUDE
    j.hipR.rotation.x = Math.sin(phase + Math.PI) * ANIM_RUN_LEG_AMPLITUDE
    j.shoulderL.rotation.x = Math.sin(phase + Math.PI) * ANIM_RUN_ARM_AMPLITUDE
    j.shoulderR.rotation.x = Math.sin(phase) * ANIM_RUN_ARM_AMPLITUDE

    // View bob — vertical sway synced to footsteps
    const viewBob = Math.abs(Math.sin(phase)) * 0.04
    const speedFactor = Math.min(this._physics.horizontalSpeed / MOVE_SPEED, 1)
    this.cameraYOffset = viewBob * speedFactor
  }

  _poseJumping() {
    this._resetLimbs()
    const j = this._joints
    j.shoulderL.rotation.x = -1.2
    j.shoulderR.rotation.x = -1.2
    j.shoulderL.rotation.z = 0.3
    j.shoulderR.rotation.z = -0.3
    j.hipL.rotation.x = -0.2
    j.hipR.rotation.x = -0.2
  }

  _poseFalling() {
    this._resetLimbs()
    const j = this._joints
    j.shoulderL.rotation.x = -0.4
    j.shoulderR.rotation.x = -0.4
    j.shoulderL.rotation.z = 0.8
    j.shoulderR.rotation.z = -0.8
    j.hipL.rotation.x = 0.1
    j.hipR.rotation.x = 0.1
  }

  _poseLanding() {
    this._resetLimbs()
    const j = this._joints
    const t = this._stateTimer / ANIM_LANDING_DURATION
    const crouch = Math.sin(t * Math.PI) * 0.15

    j.hipL.rotation.x = crouch * 2
    j.hipR.rotation.x = crouch * 2
    j.shoulderL.rotation.x = crouch
    j.shoulderR.rotation.x = crouch

    // Camera dip on landing
    this.cameraYOffset = -crouch
  }

  _poseHanging() {
    this._resetLimbs()
    const j = this._joints
    j.shoulderL.rotation.x = -Math.PI
    j.shoulderR.rotation.x = -Math.PI
    j.shoulderL.rotation.z = 0.2
    j.shoulderR.rotation.z = -0.2
    j.hipL.rotation.x = 0.15
    j.hipR.rotation.x = 0.15
  }

  _posePullUp() {
    this._resetLimbs()
    const j = this._joints
    const t = Math.min(this._stateTimer / ANIM_PULLUP_DURATION, 1)

    j.shoulderL.rotation.x = -Math.PI * (1 - t)
    j.shoulderR.rotation.x = -Math.PI * (1 - t)
    j.shoulderL.rotation.z = 0.2 * (1 - t)
    j.shoulderR.rotation.z = -0.2 * (1 - t)

    j.hipL.rotation.x = 0.5 * Math.sin(t * Math.PI)
    j.hipR.rotation.x = 0.3 * Math.sin(t * Math.PI)
  }
}
