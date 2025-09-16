import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Field, VfmMapDB, VfmMapInput } from '@/types/indexedDb.type'

// モック
const mockIndexedDB = {
  createField: vi.fn(),
  readField: vi.fn(),
  readFieldByUuid: vi.fn(),
  readAllFields: vi.fn(),
  updateField: vi.fn(),
  deleteField: vi.fn(),
  deleteAllFields: vi.fn(),
  createVfmMap: vi.fn(),
  readVfmMap: vi.fn(),
  readVfmMapsByUuid: vi.fn(),
  readAllVfmMaps: vi.fn(),
  updateVfmMap: vi.fn(),
  deleteVfmMap: vi.fn(),
}

vi.mock('@/stores/indexedDbStore', () => ({
  default: () => mockIndexedDB,
}))

import { useStoreHandler } from '@/stores/indexedDbStoreHandler'

describe('useStoreHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createField', () => {
    const mockField: Field = {
      uuid: 'test-field-uuid',
      geometry_type: 'Polygon',
      geometry_coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ], // メモリ効率化のため最小限の座標
      area_are: 100,
      memo: 'テストフィールド',
    }

    beforeEach(() => {
      // 初期状態でフィールド数を0に設定
      mockIndexedDB.readAllFields.mockResolvedValue([])
    })

    it('フィールド作成成功時、voidを返し例外をスローしない', async () => {
      mockIndexedDB.createField.mockResolvedValue(undefined)

      const { createField } = useStoreHandler()

      await expect(createField(mockField)).resolves.toBeUndefined()
      expect(mockIndexedDB.createField).toHaveBeenCalledWith(mockField)
    })

    it('withDbヘルパーが適切に呼び出される', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockIndexedDB.createField.mockResolvedValue(undefined)

      const { createField } = useStoreHandler()
      await createField(mockField)

      // withDbが正常に動作（エラーログなし）
      expect(consoleErrorSpy).not.toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('上限(10筆)に達している場合、例外をスローする', async () => {
      // メモリ効率化のため配列長のみ設定
      const maxFields = Array(10)
        .fill(0)
        .map((_, i) => ({ id: i + 1, uuid: `field-${i + 1}` })) as Field[]
      mockIndexedDB.readAllFields.mockResolvedValue(maxFields)

      const { createField } = useStoreHandler()

      await expect(createField(mockField)).rejects.toThrow('圃場登録上限（10筆）に達してます')
      expect(mockIndexedDB.createField).not.toHaveBeenCalled()
    })

    it('上限時にindexedDB.createField()が呼ばれない', async () => {
      const maxFields = Array(10)
        .fill(0)
        .map((_, i) => ({ id: i + 1, uuid: `field-${i + 1}` })) as Field[]
      mockIndexedDB.readAllFields.mockResolvedValue(maxFields)

      const { createField } = useStoreHandler()

      try {
        await createField(mockField)
      } catch {
        // エラーは期待通り
      }

      expect(mockIndexedDB.createField).not.toHaveBeenCalled()
    })

    it('indexedDB.createField()がエラーの場合、例外が再スローされる', async () => {
      const testError = new Error('DB Create Error')
      mockIndexedDB.createField.mockRejectedValue(testError)

      const { createField } = useStoreHandler()

      await expect(createField(mockField)).rejects.toThrow('DB Create Error')
    })

    it('エラー発生時にwithDbからエラーログが出力される', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('DB Create Error')
      mockIndexedDB.createField.mockRejectedValue(testError)

      const { createField } = useStoreHandler()

      try {
        await createField(mockField)
      } catch {
        // エラーが期待通りスローされる
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('圃場作成に失敗しました:', testError)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('readField', () => {
    it('IDで圃場をFeature形式で取得できる', async () => {
      const mockFieldData: Field = {
        id: 1,
        uuid: 'test-uuid',
        geometry_type: 'Polygon',
        geometry_coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
        area_are: 100,
        memo: 'test',
      }
      mockIndexedDB.readField.mockResolvedValue(mockFieldData)

      const { readField } = useStoreHandler()
      const result = await readField(1)

      expect(result).toEqual({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
        properties: {
          id: 1,
          uuid: 'test-uuid',
          vfm_count: 0,
          area_are: 100,
          memo: 'test',
        },
      })
      expect(mockIndexedDB.readField).toHaveBeenCalledWith(1)
    })

    it('圃場が見つからない場合、例外をスローする', async () => {
      mockIndexedDB.readField.mockResolvedValue(null)

      const { readField } = useStoreHandler()

      await expect(readField(999)).rejects.toThrow('圃場が見つかりません: ID 999')
    })

    it('withDbエラーハンドリングが動作する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Read Field Error')
      mockIndexedDB.readField.mockRejectedValue(testError)

      const { readField } = useStoreHandler()

      await expect(readField(1)).rejects.toThrow('Read Field Error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('圃場読み込みに失敗しました:', testError)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('readFieldByUuid', () => {
    it('UUIDで圃場をFeature形式で取得できる', async () => {
      const mockFieldData: Field = {
        id: 1,
        uuid: 'test-uuid',
        geometry_type: 'Polygon',
        geometry_coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
        area_are: 100,
        memo: 'test',
      }
      mockIndexedDB.readFieldByUuid.mockResolvedValue(mockFieldData)

      const { readFieldByUuid } = useStoreHandler()
      const result = await readFieldByUuid('test-uuid')

      expect(result).toEqual({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
        properties: {
          id: 1,
          uuid: 'test-uuid',
          vfm_count: 0,
          area_are: 100,
          memo: 'test',
        },
      })
      expect(mockIndexedDB.readFieldByUuid).toHaveBeenCalledWith('test-uuid')
    })

    it('圃場が見つからない場合、例外をスローする', async () => {
      mockIndexedDB.readFieldByUuid.mockResolvedValue(null)

      const { readFieldByUuid } = useStoreHandler()

      await expect(readFieldByUuid('not-found-uuid')).rejects.toThrow(
        '圃場が見つかりません: UUID not-found-uuid',
      )
    })

    it('withDbエラーハンドリングが動作する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Read Field Error')
      mockIndexedDB.readFieldByUuid.mockRejectedValue(testError)

      const { readFieldByUuid } = useStoreHandler()

      await expect(readFieldByUuid('test-uuid')).rejects.toThrow('Read Field Error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('圃場読み込みに失敗しました:', testError)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('readAllFields', () => {
    it('全圃場リストをFeatureCollection形式で取得できる', async () => {
      // メモリ効率化のため軽量なテストデータを使用
      const mockFields: Field[] = [
        {
          id: 1,
          uuid: 'field-1',
          geometry_type: 'Polygon',
          geometry_coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
          area_are: 100,
          memo: 'test1',
        },
        {
          id: 2,
          uuid: 'field-2',
          geometry_type: 'Polygon',
          geometry_coordinates: [
            [
              [1, 1],
              [2, 1],
              [2, 2],
              [1, 2],
              [1, 1],
            ],
          ],
          area_are: 200,
          memo: 'test2',
        },
      ]
      mockIndexedDB.readAllFields.mockResolvedValue(mockFields)

      const { readAllFields } = useStoreHandler()
      const result = await readAllFields()

      expect(result).toEqual({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [0, 0],
                  [1, 0],
                  [1, 1],
                  [0, 1],
                  [0, 0],
                ],
              ],
            },
            properties: { id: 1, uuid: 'field-1', vfm_count: 0, area_are: 100, memo: 'test1' },
          },
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [1, 1],
                  [2, 1],
                  [2, 2],
                  [1, 2],
                  [1, 1],
                ],
              ],
            },
            properties: { id: 2, uuid: 'field-2', vfm_count: 0, area_are: 200, memo: 'test2' },
          },
        ],
      })
      expect(mockIndexedDB.readAllFields).toHaveBeenCalledTimes(1)
    })

    it('フィールドが見つからない場合、例外をスローする', async () => {
      mockIndexedDB.readAllFields.mockResolvedValue(null)

      const { readAllFields } = useStoreHandler()

      await expect(readAllFields()).rejects.toThrow('圃場が見つかりません')
    })

    it('withDbエラーハンドリングが動作する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Read All Fields Error')
      mockIndexedDB.readAllFields.mockRejectedValue(testError)

      const { readAllFields } = useStoreHandler()

      await expect(readAllFields()).rejects.toThrow('Read All Fields Error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('全圃場の読み込みに失敗しました:', testError)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('updateField', () => {
    const mockUpdateField = {
      uuid: 'update-field-uuid',
      geometry_type: 'Polygon' as const,
      geometry_coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
      area_are: 200,
      memo: '更新テストフィールド',
    }

    it('圃場更新が実行される', async () => {
      mockIndexedDB.updateField.mockResolvedValue(undefined)

      const { updateField } = useStoreHandler()
      await updateField(1, mockUpdateField)

      expect(mockIndexedDB.updateField).toHaveBeenCalledWith(1, mockUpdateField)
    })

    it('withDbエラーハンドリングが動作する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Update Field Error')
      mockIndexedDB.updateField.mockRejectedValue(testError)

      const { updateField } = useStoreHandler()

      await expect(updateField(1, mockUpdateField)).rejects.toThrow('Update Field Error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('圃場更新に失敗しました:', testError)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('deleteField', () => {
    it('圃場削除が実行される', async () => {
      mockIndexedDB.deleteField.mockResolvedValue(undefined)

      const { deleteField } = useStoreHandler()
      await deleteField(1)

      expect(mockIndexedDB.deleteField).toHaveBeenCalledWith(1)
    })

    it('withDbエラーハンドリングが動作する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Delete Field Error')
      mockIndexedDB.deleteField.mockRejectedValue(testError)

      const { deleteField } = useStoreHandler()

      await expect(deleteField(1)).rejects.toThrow('Delete Field Error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('圃場削除に失敗しました:', testError)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('createVfmMap', () => {
    const mockVfmMap: VfmMapInput = {
      uuid: 'test-vfm-uuid',
      vfm: { type: 'FeatureCollection', features: [] }, // GeoJSON FeatureCollection
      amount_10a: 50,
      total_amount: 500,
      area: 100,
      fertilization_range: 10,
      memo: 'テストVFマップ',
    }

    beforeEach(() => {
      // 初期状態でVFマップ数を0に設定
      mockIndexedDB.readAllVfmMaps.mockResolvedValue([])
    })

    it('VFマップ作成成功時、voidを返し例外をスローしない', async () => {
      mockIndexedDB.createVfmMap.mockResolvedValue(undefined)

      const { createVfmMap } = useStoreHandler()

      await expect(createVfmMap(mockVfmMap)).resolves.toBeUndefined()
      expect(mockIndexedDB.createVfmMap).toHaveBeenCalledWith(mockVfmMap)
    })

    it('上限(10筆)に達している場合、例外をスローする', async () => {
      // メモリ効率化のため配列長のみ設定
      const maxVfmMaps = Array(10)
        .fill(0)
        .map((_, i) => ({ id: i + 1, uuid: `vfm-${i + 1}` })) as VfmMapDB[]
      mockIndexedDB.readAllVfmMaps.mockResolvedValue(maxVfmMaps)

      const { createVfmMap } = useStoreHandler()

      await expect(createVfmMap(mockVfmMap)).rejects.toThrow(
        '可変施肥マップ登録上限（10筆）に達してます',
      )
      expect(mockIndexedDB.createVfmMap).not.toHaveBeenCalled()
    })

    it('withDbエラーハンドリングが動作する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Create VfmMap Error')
      mockIndexedDB.createVfmMap.mockRejectedValue(testError)

      const { createVfmMap } = useStoreHandler()

      await expect(createVfmMap(mockVfmMap)).rejects.toThrow('Create VfmMap Error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('VFマップ作成に失敗しました:', testError)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('readVfmMap', () => {
    it('IDでVFマップを取得できる', async () => {
      const mockVfmMap: VfmMapDB = {
        id: 1,
        uuid: 'test-uuid',
        vfm: JSON.stringify({ type: 'FeatureCollection', features: [] }),
        amount_10a: 50,
        total_amount: 500,
        area: 100,
        fertilization_range: 10,
        memo: 'テストVFマップ',
      }
      mockIndexedDB.readVfmMap.mockResolvedValue(mockVfmMap)

      const { readVfmMap } = useStoreHandler()
      const result = await readVfmMap(1)

      expect(result).toEqual(mockVfmMap)
      expect(mockIndexedDB.readVfmMap).toHaveBeenCalledWith(1)
    })

    it('withDbエラーハンドリングが動作する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Read VfmMap Error')
      mockIndexedDB.readVfmMap.mockRejectedValue(testError)

      const { readVfmMap } = useStoreHandler()

      await expect(readVfmMap(1)).rejects.toThrow('Read VfmMap Error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('VFマップ読み込みに失敗しました:', testError)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('readVfmMapsByUuid', () => {
    it('UUIDでVFマップリスト取得', async () => {
      // メモリ効率化のため軽量なテストデータを使用
      const mockVfmMaps: VfmMapDB[] = [
        {
          id: 1,
          uuid: 'test-uuid',
          vfm: JSON.stringify({ type: 'FeatureCollection', features: [] }),
          amount_10a: 50,
          total_amount: 500,
          area: 100,
          fertilization_range: 10,
          memo: 'テスト1',
        },
        {
          id: 2,
          uuid: 'test-uuid',
          vfm: JSON.stringify({ type: 'FeatureCollection', features: [] }),
          amount_10a: 60,
          total_amount: 600,
          area: 120,
          fertilization_range: 10,
          memo: 'テスト2',
        },
      ]
      mockIndexedDB.readVfmMapsByUuid.mockResolvedValue(mockVfmMaps)

      const { readVfmMapsByUuid } = useStoreHandler()
      const result = await readVfmMapsByUuid('test-uuid')

      expect(result).toEqual(mockVfmMaps)
      expect(mockIndexedDB.readVfmMapsByUuid).toHaveBeenCalledWith('test-uuid')
    })

    it('withDbエラーハンドリングが動作する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Read VfmMaps Error')
      mockIndexedDB.readVfmMapsByUuid.mockRejectedValue(testError)

      const { readVfmMapsByUuid } = useStoreHandler()

      await expect(readVfmMapsByUuid('test-uuid')).rejects.toThrow('Read VfmMaps Error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('VFマップ読み込みに失敗しました:', testError)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('readAllVfmMaps', () => {
    it('全VFマップリストを取得できる', async () => {
      const mockVfmMaps: VfmMapDB[] = [
        {
          id: 1,
          uuid: 'test-uuid-1',
          vfm: JSON.stringify({ type: 'FeatureCollection', features: [] }),
          amount_10a: 50,
          total_amount: 500,
          area: 100,
          fertilization_range: 10,
          memo: 'テスト1',
        },
        {
          id: 2,
          uuid: 'test-uuid-2',
          vfm: JSON.stringify({ type: 'FeatureCollection', features: [] }),
          amount_10a: 60,
          total_amount: 600,
          area: 120,
          fertilization_range: 10,
          memo: 'テスト2',
        },
      ]
      mockIndexedDB.readAllVfmMaps.mockResolvedValue(mockVfmMaps)

      const { readAllVfmMaps } = useStoreHandler()
      const result = await readAllVfmMaps()

      expect(result).toEqual(mockVfmMaps)
      expect(mockIndexedDB.readAllVfmMaps).toHaveBeenCalledTimes(1)
    })

    it('withDbエラーハンドリングが動作する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Read All VfmMaps Error')
      mockIndexedDB.readAllVfmMaps.mockRejectedValue(testError)

      const { readAllVfmMaps } = useStoreHandler()

      await expect(readAllVfmMaps()).rejects.toThrow('Read All VfmMaps Error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('VFマップ読み込みに失敗しました:', testError)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('updateVfmMap', () => {
    const mockVfmMapUpdate: Partial<VfmMapDB> = {
      vfm: JSON.stringify({ type: 'FeatureCollection', features: [] }),
      amount_10a: 75,
      memo: '更新されたVFマップ',
    }

    it('VFマップ更新が実行される', async () => {
      mockIndexedDB.updateVfmMap.mockResolvedValue(undefined)

      const { updateVfmMap } = useStoreHandler()
      await updateVfmMap(1, mockVfmMapUpdate)

      expect(mockIndexedDB.updateVfmMap).toHaveBeenCalledWith(1, mockVfmMapUpdate)
    })

    it('withDbエラーハンドリングが動作する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Update VfmMap Error')
      mockIndexedDB.updateVfmMap.mockRejectedValue(testError)

      const { updateVfmMap } = useStoreHandler()

      await expect(updateVfmMap(1, mockVfmMapUpdate)).rejects.toThrow('Update VfmMap Error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('VFマップ更新に失敗しました:', testError)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('deleteVfmMap', () => {
    it('VFマップ削除が実行される', async () => {
      mockIndexedDB.deleteVfmMap.mockResolvedValue(undefined)

      const { deleteVfmMap } = useStoreHandler()
      await deleteVfmMap(1)

      expect(mockIndexedDB.deleteVfmMap).toHaveBeenCalledWith(1)
    })

    it('withDbエラーハンドリングが動作する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Delete VfmMap Error')
      mockIndexedDB.deleteVfmMap.mockRejectedValue(testError)

      const { deleteVfmMap } = useStoreHandler()

      await expect(deleteVfmMap(1)).rejects.toThrow('Delete VfmMap Error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('VFマップ削除に失敗しました:', testError)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('allFieldsCount', () => {
    it('全フィールド数を取得できる', async () => {
      const mockFields: Field[] = [
        {
          id: 1,
          uuid: 'field-1',
          geometry_type: 'Polygon',
          geometry_coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
          area_are: 100,
          memo: 'test1',
        },
        {
          id: 2,
          uuid: 'field-2',
          geometry_type: 'Polygon',
          geometry_coordinates: [
            [
              [1, 1],
              [2, 1],
              [2, 2],
              [1, 2],
              [1, 1],
            ],
          ],
          area_are: 200,
          memo: 'test2',
        },
      ]
      mockIndexedDB.readAllFields.mockResolvedValue(mockFields)

      const { allFieldsCount } = useStoreHandler()
      const result = await allFieldsCount()

      expect(result).toBe(2)
      expect(mockIndexedDB.readAllFields).toHaveBeenCalledTimes(1)
    })

    it('フィールドが見つからない場合、例外をスローする', async () => {
      mockIndexedDB.readAllFields.mockResolvedValue(null)

      const { allFieldsCount } = useStoreHandler()

      await expect(allFieldsCount()).rejects.toThrow('圃場が見つかりません')
    })

    it('withDbエラーハンドリングが動作する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Read All Fields Error')
      mockIndexedDB.readAllFields.mockRejectedValue(testError)

      const { allFieldsCount } = useStoreHandler()

      await expect(allFieldsCount()).rejects.toThrow('Read All Fields Error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('全圃場の読み込みに失敗しました:', testError)

      consoleErrorSpy.mockRestore()
    })
  })
})
