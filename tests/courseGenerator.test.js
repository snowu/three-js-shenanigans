import { describe, it, expect } from 'vitest'
import { generateSegmentPlatforms, validateSegment } from '../src/courseGenerator.js'

const RUNS = 50

describe('segment generation', () => {
  it('produces no platform-platform overlaps across many runs', () => {
    const allIssues = []
    for (let run = 0; run < RUNS; run++) {
      let prevPlat = null
      let counter = 0
      let lastBillboardZ = null
      for (let seg = 0; seg < 3; seg++) {
        const startZ = -seg * 120
        const { platforms, billboards, lastPlatform, platformCounter, lastBillboardZ: lbz } =
          generateSegmentPlatforms(prevPlat, startZ, 'medium', seg === 0, counter, null, lastBillboardZ)
        prevPlat = lastPlatform
        counter = platformCounter
        lastBillboardZ = lbz

        const issues = validateSegment(platforms, billboards)
        const overlaps = issues.filter(i => i.type === 'overlap')
        for (const o of overlaps) {
          allIssues.push({ run, seg, ...o })
        }
      }
    }
    expect(allIssues, `Found ${allIssues.length} overlaps:\n${allIssues.map(i => `  run ${i.run} seg ${i.seg}: ${i.msg}`).join('\n')}`).toHaveLength(0)
  })

  it('produces no platform-billboard clips across many runs', () => {
    const allIssues = []
    for (let run = 0; run < RUNS; run++) {
      let prevPlat = null
      let counter = 0
      let lastBillboardZ = null
      for (let seg = 0; seg < 3; seg++) {
        const startZ = -seg * 120
        const { platforms, billboards, lastPlatform, platformCounter, lastBillboardZ: lbz } =
          generateSegmentPlatforms(prevPlat, startZ, 'medium', seg === 0, counter, null, lastBillboardZ)
        prevPlat = lastPlatform
        counter = platformCounter
        lastBillboardZ = lbz

        const issues = validateSegment(platforms, billboards)
        const clips = issues.filter(i => i.type === 'clip')
        for (const c of clips) {
          allIssues.push({ run, seg, ...c })
        }
      }
    }
    expect(allIssues, `Found ${allIssues.length} clips:\n${allIssues.map(i => `  run ${i.run} seg ${i.seg}: ${i.msg}`).join('\n')}`).toHaveLength(0)
  })

  it('generates expected platform count per segment', () => {
    for (let run = 0; run < RUNS; run++) {
      const { platforms } = generateSegmentPlatforms(null, 0, 'medium', true, 0, null, null)
      expect(platforms.length).toBeGreaterThanOrEqual(2)
      expect(platforms.length).toBeLessThanOrEqual(25)
    }
  })
})
