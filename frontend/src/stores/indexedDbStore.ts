import Dexie from 'dexie'
import type {
  Field,
  VfmMapInput,
  VfmMapDB,
  UpdateField,
  VfmMapDBCreate,
} from '@/types/indexedDb.type'

class VFMakerDB extends Dexie {
  fields!: Dexie.Table<Field, number>
  vfmMaps!: Dexie.Table<VfmMapDB, number>

  constructor() {
    super('VFMakerDB')

    this.version(1).stores({
      // 圃場区画テーブル
      fields: `
        ++id,
        &uuid,
        geometry_type,
        geometry_coordinates,
        vfm_count,
        area_are,
        memo,
        createdAt,
        updatedAt
      `,
      // 可変施肥マップテーブル（fieldに対して1対多）
      vfmMaps: `
        ++id,
        uuid,
        vfm,
        amount_10a,
        total_amount,
        area,
        fertilization_range,
        memo,
        created_at,
        updated_at
      `,
    })

    this.version(2).upgrade(() => {
      // 将来: フィールド追加や既存データ加工をここに書く
    })
  }
}

const db = new VFMakerDB()

export default function useVFMakerDB() {
  // FieldのCRUD
  const createField = async (
    field: Omit<Field, 'id' | 'vfm_count' | 'createdAt' | 'updatedAt'>,
  ) => {
    const newField: Omit<Field, 'id'> = {
      ...field,
      vfm_count: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return db.fields.add(newField)
  }

  const readField = async (id: number): Promise<Field | undefined> => {
    return db.fields.get(id)
  }

  const readFieldByUuid = async (uuid: string): Promise<Field | undefined> => {
    return db.fields.where('uuid').equals(uuid).first()
  }

  const readAllFields = async (): Promise<Field[]> => {
    return db.fields.toArray()
  }

  const updateField = async (id: number, field: UpdateField) => {
    const updatedField: Partial<Field> = {
      ...field,
      updatedAt: new Date().toISOString(),
    }
    return db.fields.update(id, updatedField)
  }

  const deleteField = async (id: number): Promise<void> => {
    return db.transaction('rw', db.fields, db.vfmMaps, async () => {
      const current_field = await db.fields.get(id)
      if (!current_field) {
        throw new Error(`Field with id ${id} not found`)
      }

      await db.vfmMaps.where('uuid').equals(current_field.uuid).delete()
      await db.fields.delete(id)
    })
  }

  const deleteAllFields = async (): Promise<void> => {
    return await db.transaction('rw', db.fields, db.vfmMaps, async () => {
      await db.vfmMaps.clear()
      await db.fields.clear()
    })
  }

  // VfmMapのCRUD
  const createVfmMap = async (vfmMap: VfmMapInput) => {
    return await db.transaction('rw', db.fields, db.vfmMaps, async () => {
      const vfmMapData: VfmMapDBCreate = {
        ...vfmMap,
        vfm: JSON.stringify(vfmMap.vfm),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const newVfmMapId = await db.vfmMaps.add(vfmMapData as VfmMapDB) // VfmMapDBCreate型の代入後はidが自動採番
      const current_field = await db.fields.where('uuid').equals(vfmMap.uuid).first()
      if (!current_field?.id) {
        throw new Error(`Field with uuid ${vfmMap.uuid} not found`)
      }

      await db.fields.update(current_field.id, {
        vfm_count: (current_field.vfm_count || 0) + 1,
        updatedAt: new Date().toISOString(),
      })

      return newVfmMapId
    })
  }

  const readVfmMap = async (id: number): Promise<VfmMapDB | undefined> => {
    return await db.vfmMaps.get(id)
  }

  const readVfmMapsByUuid = async (uuid: string): Promise<VfmMapDB[]> => {
    return db.vfmMaps.where('uuid').equals(uuid).toArray()
  }

  const readAllVfmMaps = async () => {
    return await db.vfmMaps.toArray()
  }

  const updateVfmMap = async (
    id: number,
    vfmMap: Partial<Omit<VfmMapDB, 'id' | 'uuid' | 'created_at'>>,
  ) => {
    const updatedVfmMap: Partial<VfmMapDB> = {
      ...vfmMap,
      updated_at: new Date().toISOString(),
    }
    return await db.vfmMaps.update(id, updatedVfmMap)
  }

  const deleteVfmMap = async (id: number): Promise<void> => {
    return db.transaction('rw', db.fields, db.vfmMaps, async () => {
      const vfmMap = await db.vfmMaps.get(id)
      if (!vfmMap) {
        console.log(`VfmMap with id ${id} does not exist, skipping deletion`)
        return
      }

      await db.vfmMaps.delete(id)

      const field = await db.fields.where('uuid').equals(vfmMap.uuid).first()
      if (field?.id) {
        await db.fields.update(field.id, {
          vfm_count: Math.max(0, (field.vfm_count || 0) - 1),
          updatedAt: new Date().toISOString(),
        })
      }
    })
  }

  const deleteAllVfmMaps = async (): Promise<void> => {
    return db.transaction('rw', db.fields, db.vfmMaps, async () => {
      await db.vfmMaps.clear()

      const fields = await db.fields.toArray()
      await Promise.all(
        fields.map((field) =>
          db.fields.update(field.id!, {
            vfm_count: 0,
            updatedAt: new Date().toISOString(),
          }),
        ),
      )
    })
  }

  return {
    // FieldのCRUD
    createField,
    readField,
    readFieldByUuid,
    readAllFields,
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
    deleteAllVfmMaps,
  }
}
