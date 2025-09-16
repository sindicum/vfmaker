import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { ref, type ShallowRef } from 'vue'
import type { MaplibreMap } from '@/types/maplibre'

// maplibre-glのモック
vi.mock('maplibre-gl', () => ({
  addProtocol: vi.fn(),
}))

// メモリ効率化のための軽量モック - fast-pngの重いエンコード処理を最小化
vi.mock('fast-png', () => ({
  encode: vi.fn().mockReturnValue(new Uint8Array([137, 80, 78, 71])), // PNG識別子のみ
}))

// メモリ効率化のための軽量モック - geotiffのPoolとリーダーを軽量化
vi.mock('geotiff', () => ({
  Pool: vi.fn().mockImplementation(() => ({})), // Poolインスタンス生成を無効化
  fromUrl: vi.fn().mockResolvedValue({
    readRasters: vi.fn().mockResolvedValue([new Uint8Array(16)]), // 4x4の最小サイズ
  }),
}))

// メモリ効率化のための軽量ImageDataモック（Node.js環境では利用できないため）
global.ImageData = vi.fn().mockImplementation((data, width, height) => ({
  data: data || new Uint8ClampedArray(width * height * 4), // 最小サイズに制限
  width: width || 4,
  height: height || 4,
}))

// URLコンストラクタのモック
global.URL = vi.fn().mockImplementation((url) => ({
  host: 'example.com',
  pathname: '/cog.tif',
  toString: () => url,
})) as any

// 各テストで新しいモジュールインスタンスを使用
let useHumusCog: typeof import('@/composables/useHumusCog').useHumusCog

describe('useHumusCog', () => {
  let mockMap: ShallowRef<MaplibreMap | null>
  let mockMapInstance: {
    getLayer: Mock
    removeLayer: Mock
    getSource: Mock
    removeSource: Mock
    addSource: Mock
    addLayer: Mock
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_OM_MAP_URL', 'https://example.com/cog.tif')

    // モジュールを動的にインポートして、isProtocolAddedフラグをリセット
    vi.resetModules()
    const module = await import('@/composables/useHumusCog')
    useHumusCog = module.useHumusCog

    mockMapInstance = {
      getLayer: vi.fn(),
      removeLayer: vi.fn(),
      getSource: vi.fn(),
      removeSource: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
    }
    mockMap = ref(mockMapInstance as unknown as MaplibreMap) as ShallowRef<MaplibreMap | null>
  })

  // メモリ効率化のためのクリーンアップ
  afterEach(() => {
    if (global.gc) global.gc()
  })

  describe('addCog', () => {
    it('COGレイヤーを正常に追加する', async () => {
      const { addCog } = useHumusCog(mockMap)

      mockMapInstance.getLayer.mockReturnValue(null)
      mockMapInstance.getSource.mockReturnValue(null)

      await addCog()

      // COGソースとレイヤーが追加される
      expect(mockMapInstance.addSource).toHaveBeenCalledWith('cogSource', {
        type: 'raster',
        tiles: ['cog://example.com/cog.tif/{z}/{x}/{y}'],
        tileSize: 256,
        minzoom: 8,
        maxzoom: 17,
      })

      expect(mockMapInstance.addLayer).toHaveBeenCalledWith({
        id: 'cogLayer',
        type: 'raster',
        source: 'cogSource',
      })

      // プロトコルが追加される
      const { addProtocol } = await import('maplibre-gl')
      expect(addProtocol).toHaveBeenCalledWith('cog', expect.any(Function))
    })

    it('既存のレイヤーとソースを削除してから追加する', async () => {
      const { addCog } = useHumusCog(mockMap)

      mockMapInstance.getLayer.mockReturnValue({})
      mockMapInstance.getSource.mockReturnValue({})

      await addCog()

      // 既存のレイヤーとソースが削除される
      expect(mockMapInstance.removeLayer).toHaveBeenCalledWith('cogLayer')
      expect(mockMapInstance.removeSource).toHaveBeenCalledWith('cogSource')

      // 新しいソースとレイヤーが追加される
      expect(mockMapInstance.addSource).toHaveBeenCalled()
      expect(mockMapInstance.addLayer).toHaveBeenCalled()
    })

    it('mapがnullの場合は何もしない', async () => {
      mockMap.value = null
      const { addCog } = useHumusCog(mockMap)

      await addCog()

      expect(mockMapInstance.addSource).not.toHaveBeenCalled()
      expect(mockMapInstance.addLayer).not.toHaveBeenCalled()
    })

    it('プロトコルは一度だけ追加される', async () => {
      const { addCog } = useHumusCog(mockMap)

      mockMapInstance.getLayer.mockReturnValue(null)
      mockMapInstance.getSource.mockReturnValue(null)

      await addCog()
      await addCog()

      // addProtocolは一度だけ呼ばれる
      const { addProtocol } = await import('maplibre-gl')
      expect(addProtocol).toHaveBeenCalledTimes(1)
    })
  })

  // メモリ効率化のためCOGプロトコルハンドラーのテストを軽量化
  describe('COGプロトコルハンドラー（軽量化版）', () => {
    it('タイルリクエストでCOGタイルを生成する', async () => {
      const { addCog } = useHumusCog(mockMap)
      const { fromUrl } = await import('geotiff')
      const { addProtocol } = await import('maplibre-gl')

      // メモリ効率化のため256x256→4x4にピクセルデータを大幅縮小（99%削減）
      const pixelCount = 4 * 4
      const mockRasterData = new Array(pixelCount).fill(0).map((_, i) => 
        [50, 100, 0, 150][i % 4] // 固定パターンでメモリ使用量最小化
      )

      const mockReadRasters = vi.fn().mockResolvedValue(mockRasterData)

      ;(fromUrl as Mock).mockResolvedValue({
        readRasters: mockReadRasters,
      })

      mockMapInstance.getLayer.mockReturnValue(null)
      mockMapInstance.getSource.mockReturnValue(null)

      await addCog()

      // プロトコルハンドラーを取得して実行
      const handler = (addProtocol as Mock).mock.calls[0][1]
      const result = await handler({
        url: 'cog://example.com/cog.tif/10/512/256',
      })

      expect(mockReadRasters).toHaveBeenCalled()
      expect(result.data).toBeInstanceOf(Uint8Array)
      
      // メモリ効率化のため即座にオブジェクトを削除
      mockRasterData.length = 0
    })
  })
})
