import { describe, it, expect } from 'vitest'
import { distributeFertilizerRateSteps } from '@/views/create-vfm/handler/calculations/distribution'

describe('distributeFertilizerRateSteps()のテスト', () => {
  describe('可変施肥率5段階、施肥量増減20%', () => {
    const fertilizationFactor = [0.2, 0.1, 0, -0.1, -0.2]

    it('空のMapの場合、腐植値0に-1を設定したMapを返す', () => {
      const humusMeanAreaMap = new Map<number, number>()
      const result = distributeFertilizerRateSteps(humusMeanAreaMap, fertilizationFactor)

      expect(result.size).toBe(1)
      expect(result.get(0)).toBe(-1)
    })

    it('腐植値0のみの場合', () => {
      const humusMeanAreaMap = new Map<number, number>([[0, 100]])
      const result = distributeFertilizerRateSteps(humusMeanAreaMap, fertilizationFactor)

      expect(result.size).toBe(1)
      expect(result.get(0)).toBe(-1)
    })

    it('', () => {
      // 腐植値、面積
      const humusMeanAreaMap = new Map<number, number>([
        [25, 100],
        [35, 100],
        [45, 100],
        [55, 100],
        [65, 100],
      ])

      const result = distributeFertilizerRateSteps(humusMeanAreaMap, fertilizationFactor)

      expect(result.get(25)).toBeCloseTo(0.2)
      expect(result.get(35)).toBeCloseTo(0.1)
      expect(result.get(45)).toBeCloseTo(0)
      expect(result.get(55)).toBeCloseTo(-0.1)
      expect(result.get(65)).toBeCloseTo(-0.2)
    })
  })
  // describe('可変施肥率5段階、施肥量増減20%', () => {
  //   const fertilizationFactor = [0.4, 0.3, 0.2, 0.1, 0, -0.1, -0.2, -0.3, -0.4]

  //   it('空のMapの場合、腐植値0に-1を設定したMapを返す', () => {
  //     const humusMeanAreaMap = new Map<number, number>()
  //     const result = distributeFertilizerRateSteps(humusMeanAreaMap, fertilizationFactor)

  //     expect(result.size).toBe(1)
  //     expect(result.get(0)).toBe(-1)
  //   })

  //   it('腐植値0のみの場合', () => {
  //     const humusMeanAreaMap = new Map<number, number>([[0, 100]])
  //     const result = distributeFertilizerRateSteps(humusMeanAreaMap, fertilizationFactor)

  //     expect(result.size).toBe(1)
  //     expect(result.get(0)).toBe(-1)
  //   })

  //   it('', () => {
  //     // 腐植値、面積
  //     const humusMeanAreaMap = new Map<number, number>([
  //       [25, 100],
  //       [35, 100],
  //       [45, 100],
  //       [55, 100],
  //       [65, 100],
  //     ])

  //     const result = distributeFertilizerRateSteps(humusMeanAreaMap, fertilizationFactorArray)

  //     expect(result.get(25)).toBeCloseTo(0.2)
  //     expect(result.get(35)).toBeCloseTo(0.1)
  //     expect(result.get(45)).toBeCloseTo(0)
  //     expect(result.get(55)).toBeCloseTo(-0.1)
  //     expect(result.get(65)).toBeCloseTo(-0.2)
  //   })
  // })
})
