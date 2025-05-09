import { addProtocol } from 'maplibre-gl'
import { encode } from 'fast-png'
import { Pool, fromUrl } from 'geotiff'

import type { ShallowRef } from 'vue'
import type { MaplibreMap, RasterSourceSpecification } from '@/types/maplibre'
import type { GeoTIFF } from 'geotiff'

let isProtocolAdded = false

export function useHumusCog(map: ShallowRef<MaplibreMap | null> | undefined) {
  // RGB Color
  const red: [number, number, number] = [215, 25, 28]
  const orange: [number, number, number] = [253, 174, 97]
  const yellow: [number, number, number] = [255, 255, 191]
  const green: [number, number, number] = [171, 221, 164]
  const blue: [number, number, number] = [42, 131, 186]
  const pallet: [number, number, number][] = [red, orange, yellow, green, blue]

  // COGデータ範囲
  const maxNumber = 150
  const minNumber = 0

  const tileSize = 256
  const minZoom = 8
  const maxZoom = 17

  const cogUrl = import.meta.env.VITE_OM_MAP_URL

  const tileToMercatorBBox = (x: number, y: number, z: number): number[] => {
    const GEO_R = 6378137
    const orgX = -1 * ((2 * GEO_R * Math.PI) / 2)
    const orgY = (2 * GEO_R * Math.PI) / 2
    const unit = (2 * GEO_R * Math.PI) / Math.pow(2, z)
    const minX = orgX + x * unit
    const maxX = orgX + (x + 1) * unit
    const minY = orgY - (y + 1) * unit
    const maxY = orgY - y * unit
    return [minX, minY, maxX, maxY]
  }

  const CalculateColorFromIndex = (
    pallet: [number, number, number][],
    inputNumber: number,
    minNumber: number,
    maxNumber: number,
  ): [number, number, number] => {
    const rate = (inputNumber * (pallet.length - 1)) / (maxNumber - minNumber)
    const rateIntegerPart = Math.trunc(rate)
    const rateFractionalPart = rate % 1

    // 入力値が下限値以下はカラーパレットの初期値
    if (inputNumber <= minNumber) return pallet[0]
    // 入力値が上限値以上はカラーパレットの最大値
    if (inputNumber >= maxNumber) return pallet[pallet.length - 1]

    // 入力値が範囲内の場合は線形補間
    const first = pallet[rateIntegerPart]
    const second = pallet[Math.min(rateIntegerPart + 1, pallet.length - 1)]
    return first.map((f, i) => Math.trunc(f + rateFractionalPart * (second[i] - f))) as [
      number,
      number,
      number,
    ]
  }

  const generateCogSource = async (url: string): Promise<RasterSourceSpecification | null> => {
    try {
      const cleanUrl = url.startsWith('http') ? new URL(url).host + new URL(url).pathname : url
      const source: RasterSourceSpecification = {
        type: 'raster',
        tiles: [`cog://${cleanUrl}/{z}/{x}/{y}`],
        tileSize: tileSize,
        minzoom: minZoom,
        maxzoom: maxZoom,
      }

      return source
    } catch (error) {
      console.error('Failed to process COG URL:', error)
      return null
    }
  }

  const addProtocolCog = (tiff: GeoTIFF) => {
    const pool = new Pool()

    addProtocol('cog', async (params) => {
      try {
        if (!params.url) throw new Error('Invalid COG URL')

        const segments = params.url.split('/')
        if (segments.length < 3) throw new Error('Invalid tile request format')

        const [z, x, y] = segments.slice(segments.length - 3).map((v) => parseInt(v, 10))
        if (isNaN(z) || isNaN(x) || isNaN(y)) throw new Error('Invalid tile coordinates')

        const bbox = tileToMercatorBBox(x, y, z)

        const cogData = await tiff.readRasters({
          bbox,
          samples: [0], // 取得するバンドを指定
          width: tileSize,
          height: tileSize,
          interleave: true,
          pool,
        })

        const rgbaData = []

        const rasterArray = cogData as { length: number; [index: number]: number }
        for (let i = 0; i < rasterArray.length; i++) {
          const value = rasterArray[i]
          const color = CalculateColorFromIndex(pallet, value, minNumber, maxNumber)
          if (value === 0) {
            rgbaData.push(0, 0, 0, 0)
          } else {
            rgbaData.push(...color, 255)
          }
        }

        const img = new ImageData(new Uint8ClampedArray(rgbaData), tileSize, tileSize)

        const png = encode(img)

        return { data: png }
      } catch (error) {
        console.error('Failed to addProtocol:', error)
        return { data: new Uint8Array(4 * tileSize * tileSize) }
      }
    })
  }

  const addCog = async () => {
    try {
      if (!isProtocolAdded) {
        isProtocolAdded = true
        const tiff = await fromUrl(cogUrl)
        addProtocolCog(tiff)
      }

      const source = await generateCogSource(cogUrl)

      if (!source) {
        console.error('Failed to generate COG source')
        return
      }

      if (map?.value) {
        if (map.value.getLayer('cogLayer')) {
          map.value.removeLayer('cogLayer')
        }
        if (map.value.getSource('cogSource')) {
          map.value.removeSource('cogSource')
        }

        map.value.addSource('cogSource', source)
        map.value.addLayer({
          id: 'cogLayer',
          type: 'raster',
          source: 'cogSource',
        })
      }
    } catch (error) {
      console.error('Failed to initialize COG layer:', error)
    }
  }

  return {
    addCog,
  }
}
