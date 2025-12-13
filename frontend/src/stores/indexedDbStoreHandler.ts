import useVFMakerDB from './indexedDbStore'
import type { Field, UpdateField, VfmMapDB, VfmMapInput } from '@/types/indexedDb.type'
import type { FieldPolygonFeature, FieldPolygonFeatureCollection } from '@/types/fieldpolygon.type'

// データベース操作のエラーハンドリング
const withDb = async <T>(label: string, fn: () => Promise<T>) => {
  try {
    return await fn()
  } catch (error) {
    console.error(`${label}に失敗しました:`, error)
    throw error
  }
}

export const useStoreHandler = () => {
  const maxFields = 10
  const maxVfmMaps = 10

  const indexedDB = useVFMakerDB()

  const fieldToFeature = (field: Field): FieldPolygonFeature => ({
    type: 'Feature',
    geometry: {
      type: field.geometry_type,
      coordinates: field.geometry_coordinates,
    },
    properties: {
      id: field.id ?? 0,
      uuid: field.uuid,
      vfm_count: field.vfm_count ?? 0,
      area_are: field.area_are,
      memo: field.memo,
    },
  })

  const readField = async (id: number): Promise<FieldPolygonFeature> => {
    return withDb('圃場読み込み', async () => {
      const res = await indexedDB.readField(id)
      if (!res) {
        throw new Error(`圃場が見つかりません: ID ${id}`)
      }
      return fieldToFeature(res)
    })
  }

  const readFieldByUuid = async (uuid: string): Promise<FieldPolygonFeature> => {
    return withDb('圃場読み込み', async () => {
      const res = await indexedDB.readFieldByUuid(uuid)
      if (!res) {
        throw new Error(`圃場が見つかりません: UUID ${uuid}`)
      }
      return fieldToFeature(res)
    })
  }

  const readAllFields = async (): Promise<FieldPolygonFeatureCollection> => {
    return withDb('全圃場の読み込み', async () => {
      const res = await indexedDB.readAllFields()
      if (!res) {
        throw new Error(`圃場が見つかりません`)
      }
      const fc: FieldPolygonFeatureCollection = {
        type: 'FeatureCollection' as const,
        features: res.map(fieldToFeature) ?? [],
      }
      return fc
    })
  }

  const createField = async (field: Field) => {
    const allFields = await readAllFields()
    if (allFields.features.length >= maxFields) {
      throw new Error(`圃場登録上限（${maxFields}筆）に達してます`)
    }

    await withDb('圃場作成', async () => {
      await indexedDB.createField(field)
    })
  }

  const updateField = async (id: number, field: UpdateField) => {
    await withDb('圃場更新', async () => {
      await indexedDB.updateField(id, field)
    })
  }

  const deleteField = async (id: number) => {
    await withDb('圃場削除', async () => {
      await indexedDB.deleteField(id)
    })
  }

  const deleteAllFields = async () => {
    await withDb('全圃場削除', async () => {
      await indexedDB.deleteAllFields()
    })
  }

  // 親のマップ数を変更
  const createVfmMap = async (vfmMap: VfmMapInput) => {
    const allVfmMaps = await readAllVfmMaps()
    if (allVfmMaps.length >= maxVfmMaps) {
      throw new Error(`可変施肥マップ登録上限（${maxVfmMaps}筆）に達してます`)
    }

    await withDb('VFマップ作成', async () => {
      await indexedDB.createVfmMap(vfmMap)
    })
  }

  const readVfmMap = async (id: number): Promise<VfmMapDB | undefined> => {
    return withDb('VFマップ読み込み', async () => {
      const res = await indexedDB.readVfmMap(id)
      return res
    })
  }

  const readVfmMapsByUuid = async (uuid: string): Promise<VfmMapDB[]> => {
    return withDb('VFマップ読み込み', async () => {
      const res = await indexedDB.readVfmMapsByUuid(uuid)
      return res
    })
  }

  const readAllVfmMaps = async () => {
    return withDb('VFマップ読み込み', async (): Promise<VfmMapDB[]> => {
      const res = await indexedDB.readAllVfmMaps()
      return res
    })
  }

  const updateVfmMap = async (id: number, vfmMap: Partial<VfmMapDB>) => {
    await withDb('VFマップ更新', async () => {
      await indexedDB.updateVfmMap(id, vfmMap)
    })
  }

  const deleteVfmMap = async (id: number) => {
    await withDb('VFマップ削除', async () => {
      await indexedDB.deleteVfmMap(id)
    })
  }

  const allFieldsCount = async (): Promise<number> => {
    return withDb('全圃場の読み込み', async () => {
      const res = await indexedDB.readAllFields()
      if (!res) {
        throw new Error(`圃場が見つかりません`)
      }
      const f = res.map(fieldToFeature) ?? []
      return f.length
    })
  }

  return {
    maxFields,
    maxVfmMaps,
    // FieldのCRUD
    createField,
    readFieldByUuid,
    readAllFields,
    readField,
    updateField,
    deleteField,
    deleteAllFields,
    // VfmMasのCRUD
    createVfmMap,
    readVfmMap,
    readVfmMapsByUuid,
    readAllVfmMaps,
    updateVfmMap,
    deleteVfmMap,
    // Utility関数
    allFieldsCount,
  }
}
