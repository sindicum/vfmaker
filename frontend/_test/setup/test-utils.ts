import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import { cleanupHeavyObjects } from './cleanup'

// グローバル設定
config.global.stubs = {
  teleport: true,
  transition: true,
}

// Piniaのセットアップヘルパー
export function setupTestPinia() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

// MapLibre GLのモック
export function mockMapLibre() {
  vi.mock('maplibre-gl', () => ({
    Map: vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      removeSource: vi.fn(),
      getSource: vi.fn(),
      getLayer: vi.fn(),
      setLayoutProperty: vi.fn(),
      setPaintProperty: vi.fn(),
      resize: vi.fn(),
      remove: vi.fn(),
      flyTo: vi.fn(),
      getZoom: vi.fn(),
      getCenter: vi.fn(() => ({ lng: 0, lat: 0 })),
    })),
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
  }))
}

// ネットワーク関連のモック
export function mockNetworkAPIs() {
  // Fetch API
  global.fetch = vi.fn()
  
  // Navigator
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    configurable: true,
    value: true,
  })
}

// LocalStorageのモック
export function mockLocalStorage() {
  const storage: Record<string, string> = {}
  
  global.localStorage = {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key]
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key])
    }),
    length: 0,
    key: vi.fn(),
  }
}

// エラーファクトリのヘルパー
export function createMockError(type: string = 'TEST_ERROR', message: string = 'Test error') {
  return {
    id: '123',
    timestamp: Date.now(),
    code: type,
    message,
    category: 'UNKNOWN' as const,
    severity: 'medium' as const,
  }
}

// 待機ヘルパー
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Vue Router のモック
export function mockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    currentRoute: {
      value: {
        name: 'home',
        path: '/',
        params: {},
        query: {},
      },
    },
  }
}

// メモリ効率化のためのグローバルクリーンアップエクスポート
export { cleanupHeavyObjects, clearMapObjects, clearArrayObjects, clearImageData, cleanupAllHeavyResources } from './cleanup'

// メモリ効率化のためのテスト全体設定
export function setupMemoryEfficientTesting() {
  // グローバルクリーンアップをafterEachに設定
  if (typeof globalThis.afterEach === 'function') {
    globalThis.afterEach(cleanupHeavyObjects)
  }
}