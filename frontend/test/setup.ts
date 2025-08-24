import { vi } from 'vitest'

// MapLibre GL のモック（全エクスポートとメソッドを網羅）
vi.mock('maplibre-gl', () => ({
  Map: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    addControl: vi.fn(),
    removeControl: vi.fn(),
    getLayer: vi.fn(),
    removeLayer: vi.fn(),
    addLayer: vi.fn(),
    addSource: vi.fn(),
    removeSource: vi.fn(),
    getSource: vi.fn(),
  })),
  NavigationControl: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
  })),
  ScaleControl: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
  })),
  GeolocateControl: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
  })),
  AttributionControl: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
  })),
  FullscreenControl: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
  })),
}))
