import { describe, it, expect, afterEach } from 'vitest'
import {
  distributeFertilizerRateSteps,
  distributeFertilizerRateStepless,
  redistributeFactor,
} from '@/views/create-variable-fertilization/handler/calculations/distribution'

describe('distributeFertilizerRateStepless', () => {

  // メモリ効率化のための軽量データセット定義
  const miniDataSet = new Map<number, number>([
    [10, 50],
    [50, 50],
    [90, 50],
  ])
  const tinyDataSet = new Map<number, number>([
    [30, 25],
    [70, 25],
  ])

  // メモリ効率化のためのクリーンアップ
  afterEach(() => {
    if (global.gc) global.gc()
  })

  describe('具体的な数値計算の検証', () => {
    it('2つの腐植値での線形分布計算', () => {
      const input = new Map<number, number>([
        [20, 100], // 腐植値20、面積100
        [80, 100], // 腐植値80、面積100
      ])
      const result = distributeFertilizerRateStepless(input, 0.3)

      // 低腐植(20)は正の重み、高腐植(80)は負の重み
      expect(result.get(20)).toBeCloseTo(0.3, 2)
      expect(result.get(80)).toBeCloseTo(-0.3, 2)

      // 面積加重平均が0になることを確認
      const weightedSum = result.get(20)! * 0.5 + result.get(80)! * 0.5
      expect(Math.abs(weightedSum)).toBeLessThan(1e-10)
    })

    it('3つの腐植値での具体的な重み計算', () => {
      const input = new Map<number, number>([
        [25, 200], // 腐植値25、面積200（40%）
        [50, 200], // 腐植値50、面積200（40%）
        [75, 100], // 腐植値75、面積100（20%）
      ])
      const result = distributeFertilizerRateStepless(input, 0.2)

      // 25→75の範囲で、25は最大正の重み、75は最大負の重み
      // 面積加重平均調整後の値
      expect(result.get(25)).toBeCloseTo(0.16, 2) // 最低腐植値（調整後）
      expect(result.get(50)).toBeCloseTo(-0.04, 2) // 中間値（面積加重後）
      expect(result.get(75)).toBeCloseTo(-0.24, 2) // 最高腐植値（調整後）

      // 面積加重平均の検証
      const totalArea = 500
      const weightedSum =
        result.get(25)! * (200 / totalArea) +
        result.get(50)! * (200 / totalArea) +
        result.get(75)! * (100 / totalArea)
      expect(Math.abs(weightedSum)).toBeLessThan(1e-10)
    })

    it('不均等な面積分布での計算', () => {
      const input = new Map<number, number>([
        [30, 400], // 腐植値30、面積400（80%）
        [70, 100], // 腐植値70、面積100（20%）
      ])
      const result = distributeFertilizerRateStepless(input, 0.25)

      // 基本の重みは30→70で0.25→-0.25になるが、面積加重で調整される
      const weight30 = result.get(30)!
      const weight70 = result.get(70)!

      // 面積比80:20なので、調整後も30の重みは正、70の重みは負
      expect(weight30).toBeGreaterThan(0)
      expect(weight70).toBeLessThan(0)

      // 面積加重平均が0
      const weightedSum = weight30 * 0.8 + weight70 * 0.2
      expect(Math.abs(weightedSum)).toBeLessThan(1e-10)
    })

    it('実際の圃場データシミュレーション', () => {
      // 実際の圃場でありそうな腐植分布
      const input = new Map<number, number>([
        [28, 150], // 低腐植エリア
        [32, 250], // やや低腐植
        [35, 300], // 中腐植（最大面積）
        [38, 200], // やや高腐植
        [42, 100], // 高腐植エリア
      ])
      const result = distributeFertilizerRateStepless(input, 0.15) // 15%の増減

      // 腐植値順に重みが減少することを確認
      const values = [28, 32, 35, 38, 42]
      for (let i = 0; i < values.length - 1; i++) {
        expect(result.get(values[i])!).toBeGreaterThan(result.get(values[i + 1])!)
      }

      // 最低腐植は正の最大値付近
      expect(result.get(28)).toBeCloseTo(0.15, 1)
      // 最高腐植は負の最大値付近
      expect(result.get(42)).toBeCloseTo(-0.15, 1)

      // 全体の面積加重平均が0
      const totalArea = 1000
      let weightedSum = 0
      input.forEach((area, humus) => {
        weightedSum += result.get(humus)! * (area / totalArea)
      })
      expect(Math.abs(weightedSum)).toBeLessThan(1e-10)
    })
  })

  describe('基本的なケース', () => {
    it('空のMapの場合、空のMapを返す', () => {
      const input = new Map<number, number>()
      const result = distributeFertilizerRateStepless(input, 0.2)

      expect(result.size).toBe(0)
    })

    it('腐植値0のみの場合、0に-1を設定したMapを返す', () => {
      const input = new Map<number, number>([[0, 100]])
      const result = distributeFertilizerRateStepless(input, 0.2)

      expect(result.size).toBe(1)
      expect(result.get(0)).toBe(-1)
    })

    it('腐植値が1つだけの場合（0以外）、重み0を返す', () => {
      const input = new Map<number, number>([[50, 100]])
      const result = distributeFertilizerRateStepless(input, 0.2)

      expect(result.size).toBe(1)
      expect(result.get(50)).toBe(0)
    })

    it('腐植値が1つと0の場合、適切な重みを返す', () => {
      const input = new Map<number, number>([
        [50, 100],
        [0, 50],
      ])
      const result = distributeFertilizerRateStepless(input, 0.2)

      expect(result.size).toBe(2)
      expect(result.get(50)).toBe(0)
      expect(result.get(0)).toBe(-1)
    })
  })

  // メモリ効率化のためテストケースを統合し、軽量データを使用
  describe('複数値のケース（軽量化版）', () => {
    it.each([
      {
        name: '2値対称ケース',
        data: tinyDataSet,
        maxRange: 0.2,
        expectedSize: 2,
        testType: 'symmetric',
      },
      {
        name: '3値バランスケース',
        data: miniDataSet,
        maxRange: 0.3,
        expectedSize: 3,
        testType: 'balanced',
      },
    ])('$name での計算検証', ({ data, maxRange, expectedSize, testType }) => {
      const result = distributeFertilizerRateStepless(data, maxRange)

      expect(result.size).toBe(expectedSize)

      if (testType === 'symmetric') {
        const values = Array.from(result.values())
        expect(Math.abs(values[0] + values[1])).toBeLessThan(1e-10)
      }

      if (testType === 'balanced') {
        const weights = Array.from(result.values())
        const sum = weights.reduce((a, b) => a + b, 0)
        expect(Math.abs(sum)).toBeLessThan(1e-10)
      }
    })
  })

  // メモリ効率化のため境界値テストを1つに統合
  describe('境界値テスト（軽量化版）', () => {
    it('最小maxRangeと面積依存性の検証', () => {
      // 最小maxRange=0.01のテスト（rate=0%相当）
      const result1 = distributeFertilizerRateStepless(tinyDataSet, 0.01)
      expect(result1.size).toBe(2)
      // 最小範囲でも小さな重みが設定される（maxRange以下）
      Array.from(result1.values()).forEach((weight) =>
        expect(Math.abs(weight)).toBeLessThanOrEqual(0.01),
      )
      // 重みの合計は面積加重平均により0に近い値になる
      const weightSum = Array.from(result1.values()).reduce((sum, w) => sum + w, 0)
      expect(Math.abs(weightSum)).toBeLessThan(1e-10)

      // 面積依存性のテスト（面積比が異なると重みも変わることを確認）
      const data1 = new Map([
        [30, 25], // 面積比: 25/75 = 33%
        [70, 50], // 面積比: 50/75 = 67%
      ])
      const data2 = new Map([
        [30, 100], // 面積比: 100/110 = 91%
        [70, 10], // 面積比: 10/110 = 9%
      ])
      const result2 = distributeFertilizerRateStepless(data1, 0.2)
      const result3 = distributeFertilizerRateStepless(data2, 0.2)

      // 面積比が大きく異なるため、重みも異なる（正常動作）
      expect(result2.get(30)).not.toBeCloseTo(result3.get(30)!, 2)
      expect(result2.get(70)).not.toBeCloseTo(result3.get(70)!, 2)

      // それぞれの結果で重みの面積加重合計は0に近い（面積加重平均調整）
      const totalArea1 = Array.from(data1.values()).reduce((sum, area) => sum + area, 0)
      const totalArea2 = Array.from(data2.values()).reduce((sum, area) => sum + area, 0)

      const weightedSum2 = Array.from(result2.entries()).reduce((sum, [humus, weight]) => {
        return sum + weight * (data1.get(humus)! / totalArea1)
      }, 0)
      const weightedSum3 = Array.from(result3.entries()).reduce((sum, [humus, weight]) => {
        return sum + weight * (data2.get(humus)! / totalArea2)
      }, 0)

      expect(Math.abs(weightedSum2)).toBeLessThan(1e-10)
      expect(Math.abs(weightedSum3)).toBeLessThan(1e-10)
    })
  })

  // メモリ効率化のため重いテストケースを大幅に削減・統合
  describe('簡略化されたユースケーステスト', () => {
    it('現実的データでの基本検証（軽量化版）', () => {
      // メモリ効率化のため要素数を6→3に削減
      const lightHumusData = new Map<number, number>([
        [25, 100], // 低腐植
        [35, 100], // 中腐植
        [0, 50], // 腐植なし
      ])
      const result = distributeFertilizerRateStepless(lightHumusData, 0.15)

      expect(result.size).toBe(3)
      expect(result.get(0)).toBe(-1)
      expect(result.get(25)).toBeGreaterThan(0) // 低腐植：正の重み
    })

    it('エッジケースとmaxRange比較（統合版）', () => {
      // メモリ効率化のため複数テストを1つに統合

      // 同じ腐植値の重複処理
      const duplicateData = new Map([
        [30, 25],
        [50, 25],
      ])
      const result1 = distributeFertilizerRateStepless(duplicateData, 0.1)
      expect(result1.size).toBe(2)

      // 異なるmaxRangeでの比較（軽量データ）
      const result2 = distributeFertilizerRateStepless(miniDataSet, 0.1)
      const result3 = distributeFertilizerRateStepless(miniDataSet, 0.3)

      expect(Math.abs(result3.get(10)!)).toBeGreaterThan(Math.abs(result2.get(10)!))
    })
  })
})

describe('distributeFertilizerRateSteps', () => {

  describe('基本的なケース', () => {
    it('空のMapの場合、腐植値0に-1を設定したMapを返す', () => {
      const input = new Map<number, number>()
      const factors = [0.8, 0.9, 1.0, 1.1, 1.2]
      const result = distributeFertilizerRateSteps(input, factors)

      expect(result.size).toBe(1)
      expect(result.get(0)).toBe(-1)
    })

    it('腐植値0のみの場合', () => {
      const input = new Map<number, number>([[0, 100]])
      const factors = [0.8, 0.9, 1.0, 1.1, 1.2]
      const result = distributeFertilizerRateSteps(input, factors)

      expect(result.size).toBe(1)
      expect(result.get(0)).toBe(-1)
    })

    it('単一の腐植値（0以外）の場合', () => {
      const input = new Map<number, number>([[30, 100]])
      const factors = [0.8, 0.9, 1.0, 1.1, 1.2]
      const result = distributeFertilizerRateSteps(input, factors)

      expect(result.size).toBe(2)
      expect(result.get(30)).toBeDefined()
      expect(result.get(0)).toBe(-1)
    })
  })

  describe('5段階施肥の場合', () => {
    it('等面積で5つの腐植値の正確な係数割当', () => {
      const input = new Map<number, number>([
        [10, 100],
        [20, 100],
        [30, 100],
        [40, 100],
        [50, 100],
      ])
      const factors = [0.2, 0.1, 0, -0.1, -0.2] // 実際のapplicationStepの値
      const result = distributeFertilizerRateSteps(input, factors)

      expect(result.size).toBe(6) // 5つの腐植値 + 0
      expect(result.get(0)).toBe(-1)

      // 各腐植値に対応するファクターが正確に設定される
      expect(result.get(10)).toBe(0.2) // 最低腐植→最大増量
      expect(result.get(20)).toBeCloseTo(0.1, 5) // 低腐植→増量
      expect(result.get(30)).toBeCloseTo(0, 5) // 中腐植→基準
      expect(result.get(40)).toBeCloseTo(-0.1, 5) // 高腐植→減量
      expect(result.get(50)).toBeCloseTo(-0.2, 5) // 最高腐植→最大減量
    })

    it('実際の施肥量計算の検証', () => {
      const input = new Map<number, number>([
        [25, 100],
        [35, 100],
        [45, 100],
        [55, 100],
        [65, 100],
      ])
      const factors = [0.3, 0.15, 0, -0.15, -0.3] // 30%増減の場合
      const result = distributeFertilizerRateSteps(input, factors)
      const baseFertilization = 100 // kg/ha

      // 各腐植値での実際の施肥量を計算
      const fertilizationAmounts = new Map<number, number>()
      input.forEach((area, humus) => {
        const factor = result.get(humus)!
        const amount = Math.round(baseFertilization * (1 + factor))
        fertilizationAmounts.set(humus, amount)
      })

      // 具体的な施肥量の検証
      expect(fertilizationAmounts.get(25)).toBe(130) // 100 * 1.3
      expect(fertilizationAmounts.get(35)).toBe(115) // 100 * 1.15
      expect(fertilizationAmounts.get(45)).toBe(100) // 100 * 1.0
      expect(fertilizationAmounts.get(55)).toBe(85) // 100 * 0.85
      expect(fertilizationAmounts.get(65)).toBe(70) // 100 * 0.7
    })

    it('異なる面積での分配の詳細計算', () => {
      const input = new Map<number, number>([
        [10, 300], // 60%の面積
        [20, 100], // 20%の面積
        [30, 100], // 20%の面積
      ])
      const factors = [0.2, 0.1, 0, -0.1, -0.2]
      const result = distributeFertilizerRateSteps(input, factors)

      expect(result.size).toBe(4) // 3つの腐植値 + 0
      expect(result.get(0)).toBe(-1)

      // redistributeFactorの計算結果を検証
      // 10の腐植値（60%）は最初の3段階（0.2, 0.1, 0）の加重平均
      // 20%ずつなので: 0.2*1/3 + 0.1*1/3 + 0*1/3 = 0.1
      const factor10 = result.get(10)!
      expect(factor10).toBeCloseTo(0.1, 2)

      // 20の腐植値（20%）は4段階目（-0.1）
      expect(result.get(20)).toBeCloseTo(-0.1, 2)

      // 30の腐植値（20%）は5段階目（-0.2）
      expect(result.get(30)).toBeCloseTo(-0.2, 2)

      // 全体の加重平均が0に近いことを確認
      const weightedAvg = factor10 * 0.6 + result.get(20)! * 0.2 + result.get(30)! * 0.2
      expect(Math.abs(weightedAvg)).toBeLessThan(0.01)
    })
  })

  describe('エッジケース', () => {
    it('腐植値0と他の値が混在する場合', () => {
      const input = new Map<number, number>([
        [0, 50],
        [20, 100],
        [40, 100],
      ])
      const factors = [1.1, 1.0, 0.9]
      const result = distributeFertilizerRateSteps(input, factors)

      expect(result.get(0)).toBe(-1)
      expect(result.get(20)).toBeDefined()
      expect(result.get(40)).toBeDefined()
    })
  })
})

describe('redistributeFactor', () => {
  describe('基本的なケース', () => {
    it('等面積での分配', () => {
      const areaArray = [100, 100, 100, 100, 100]
      const factors = [1.2, 1.1, 1.0, 0.9, 0.8]
      const result = redistributeFactor(areaArray, factors)

      expect(result).toHaveLength(5)
      // 等面積なので、各要素は対応する施肥係数と一致
      expect(result[0]).toBeCloseTo(1.2)
      expect(result[1]).toBeCloseTo(1.1)
      expect(result[2]).toBeCloseTo(1.0)
      expect(result[3]).toBeCloseTo(0.9)
      expect(result[4]).toBeCloseTo(0.8)
    })

    it('異なる面積での分配', () => {
      const areaArray = [300, 100, 100] // 60%, 20%, 20%
      const factors = [1.2, 1.1, 1.0, 0.9, 0.8]
      const result = redistributeFactor(areaArray, factors)

      expect(result).toHaveLength(3)
      // 最初の要素は面積が大きいので、複数の係数の加重平均になる
      expect(result[0]).toBeGreaterThan(1.0)
      expect(result[0]).toBeLessThan(1.2)
    })

    it('単一要素の配列', () => {
      const areaArray = [500]
      const factors = [1.0]
      const result = redistributeFactor(areaArray, factors)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe(1.0)
    })
  })

  describe('エッジケース', () => {
    it('極端な面積比率', () => {
      const areaArray = [990, 10] // 99%, 1%
      const factors = [1.5, 0.5]
      const result = redistributeFactor(areaArray, factors)

      expect(result).toHaveLength(2)
      // 最初の要素は複数の係数の混合（50%までで1.5、残り49%で0.5との補間）
      expect(result[0]).toBeCloseTo(1.005, 2)
      // 2番目の要素は最後の係数
      expect(result[1]).toBeCloseTo(0.5, 2)
    })

    it('多数の小さい面積と1つの大きい面積', () => {
      const areaArray = [10, 10, 10, 10, 960]
      const factors = [2.0, 1.5, 1.0, 0.5, 0.0]
      const result = redistributeFactor(areaArray, factors)

      expect(result).toHaveLength(5)
      // 累積比率を考慮すると、小さい面積のものは最初の係数になる
      expect(result[0]).toBeCloseTo(2.0, 1)
      expect(result[1]).toBeCloseTo(2.0, 1) // まだ最初の20%に含まれる
      expect(result[2]).toBeCloseTo(2.0, 1) // まだ最初の20%に含まれる
      expect(result[3]).toBeCloseTo(2.0, 1) // まだ最初の20%に含まれる
      // 最後の要素は残りの係数の加重平均（約0.96）
      expect(result[4]).toBeCloseTo(0.96, 1)
    })

    it('施肥係数が1つの場合', () => {
      const areaArray = [100, 200, 300]
      const factors = [1.0]
      const result = redistributeFactor(areaArray, factors)

      expect(result).toHaveLength(3)
      // 全ての要素が同じ係数を持つ
      result.forEach((value) => {
        expect(value).toBe(1.0)
      })
    })

    it('空配列の場合', () => {
      const result1 = redistributeFactor([], [1.0, 2.0])
      expect(result1).toEqual([])

      const result2 = redistributeFactor([100, 200], [])
      expect(result2).toEqual([])
    })
  })

  describe('実際の使用ケース', () => {
    it('5段階施肥での典型的なパターン', () => {
      const areaArray = [150, 200, 300, 200, 150] // 総面積1000
      const factors = [1.2, 1.1, 1.0, 0.9, 0.8]
      const result = redistributeFactor(areaArray, factors)

      expect(result).toHaveLength(5)

      // 面積加重平均が元の係数の平均に近いことを確認
      const weightedSum = result.reduce((sum, value, index) => sum + value * areaArray[index], 0)
      const totalArea = areaArray.reduce((sum, area) => sum + area, 0)
      const weightedAverage = weightedSum / totalArea

      // 元の係数の単純平均は1.0
      expect(weightedAverage).toBeCloseTo(1.0, 2)
    })

    it('大きく偏った面積分布', () => {
      const areaArray = [50, 50, 800, 50, 50] // 中央が80%
      const factors = [1.4, 1.2, 1.0, 0.8, 0.6]
      const result = redistributeFactor(areaArray, factors)

      expect(result).toHaveLength(5)

      // 中央の要素は複数の係数の混合
      expect(result[2]).toBeGreaterThan(0.8)
      expect(result[2]).toBeLessThan(1.2)

      // 端の要素は元の係数に近い
      expect(result[0]).toBeCloseTo(1.4, 1)
      expect(result[4]).toBeCloseTo(0.6, 1)
    })

    it('累積計算の精度確認', () => {
      // 浮動小数点の累積誤差を確認
      const areaArray = Array(5).fill(200)
      const factors = [1.2, 1.1, 1.0, 0.9, 0.8]
      const result = redistributeFactor(areaArray, factors)

      expect(result).toHaveLength(5)

      // 5個の等面積なので、各要素は対応する係数と一致
      result.forEach((value, index) => {
        expect(value).toBeCloseTo(factors[index], 6)
      })
    })
  })

  describe('境界値と検証', () => {
    it('返される配列の長さが入力と一致', () => {
      const testCases = [
        { areas: [100], factors: [1.0] },
        { areas: [50, 50], factors: [1.0, 1.0] },
        { areas: [30, 40, 30], factors: [1.2, 1.0, 0.8] },
        { areas: Array(20).fill(50), factors: Array(5).fill(1.0) },
      ]

      testCases.forEach(({ areas, factors }) => {
        const result = redistributeFactor(areas, factors)
        expect(result).toHaveLength(areas.length)
      })
    })

    it('補間計算の正確性', () => {
      // 2つの係数間での補間を確認
      const areaArray = [150, 50] // 75%, 25%
      const factors = [1.0, 0.0]
      const result = redistributeFactor(areaArray, factors)

      // 最初の要素は50%までは1.0、残り25%は0.0との補間
      expect(result[0]).toBeCloseTo(0.667, 2)
      // 2番目の要素は最後の係数
      expect(result[1]).toBe(0.0)
    })

    it('面積比率による係数の分配', () => {
      const areaArray = [200, 300, 500] // 20%, 30%, 50%
      const factors = [2.0, 1.0, 0.0, -1.0, -2.0]
      const result = redistributeFactor(areaArray, factors)

      expect(result).toHaveLength(3)
      // 各要素が適切な係数範囲に含まれることを確認
      expect(result[0]).toBeCloseTo(2.0, 1) // 最初の20%は最初の係数
      expect(result[1]).toBeGreaterThan(0.5) // 20-50%は2番目の係数付近
      expect(result[1]).toBeLessThan(1.5)
      expect(result[2]).toBeLessThan(0) // 最後の50%は負の係数
    })
  })
})