import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStore } from '@/stores/store'

describe('useStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初期状態', () => {
    it('初期値が正しく設定されている', () => {
      const store = useStore()
      
      expect(store.alertMessage).toEqual({
        alertType: '',
        message: '',
      })
      expect(store.currentPage).toBe(0)
      expect(store.mapLoaded).toBe(false)
      expect(store.mapStyleIndex).toBe(0)
      expect(store.isLoading).toBe(false)
    })
  })

  describe('setMessage', () => {
    it('エラーメッセージを設定できる', () => {
      const store = useStore()
      
      store.setMessage('Error', 'エラーが発生しました')
      
      expect(store.alertMessage.alertType).toBe('Error')
      expect(store.alertMessage.message).toBe('エラーが発生しました')
    })

    it('情報メッセージを設定できる', () => {
      const store = useStore()
      
      store.setMessage('Info', '処理が完了しました')
      
      expect(store.alertMessage.alertType).toBe('Info')
      expect(store.alertMessage.message).toBe('処理が完了しました')
    })

    it('メッセージをクリアできる', () => {
      const store = useStore()
      
      // まずメッセージを設定
      store.setMessage('Error', 'エラーメッセージ')
      expect(store.alertMessage.alertType).toBe('Error')
      
      // クリア
      store.setMessage('', '')
      
      expect(store.alertMessage.alertType).toBe('')
      expect(store.alertMessage.message).toBe('')
    })
  })

  describe('状態の更新', () => {
    it('mapLoadedを更新できる', () => {
      const store = useStore()
      
      expect(store.mapLoaded).toBe(false)
      
      store.mapLoaded = true
      expect(store.mapLoaded).toBe(true)
    })

    it('currentPageを更新できる', () => {
      const store = useStore()
      
      expect(store.currentPage).toBe(0)
      
      store.currentPage = 2
      expect(store.currentPage).toBe(2)
    })

    it('mapStyleIndexを更新できる', () => {
      const store = useStore()
      
      expect(store.mapStyleIndex).toBe(0)
      
      store.mapStyleIndex = 1
      expect(store.mapStyleIndex).toBe(1)
    })

    it('isLoadingを更新できる', () => {
      const store = useStore()
      
      expect(store.isLoading).toBe(false)
      
      store.isLoading = true
      expect(store.isLoading).toBe(true)
    })
  })

  describe('複数インスタンスの動作', () => {
    it('同じストアインスタンスを返す', () => {
      const store1 = useStore()
      const store2 = useStore()
      
      store1.setMessage('Error', 'テストメッセージ')
      
      expect(store2.alertMessage.message).toBe('テストメッセージ')
      expect(store1).toBe(store2)
    })
  })
})