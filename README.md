## サイト開発技術

### 使用技術

#### 【フロントエンド】

- Vue 3（Composition API）, TypeScript, TailwindCSS
- MapLibre GL JS（マップライブラリ）
- geotiff.js + fast-png（COG 画像のブラウザ描画）
- PMTiles（Cloud Optimized Vector）
- turf/geojson-rbush（空間インデックスによる高速検索）
- Vite（ビルド）

#### 【バックエンド】

- AWS Lambda（Python）、API Gateway
- GDAL（COG 変換）
- Tippecanoe（PMTiles 生成）
- Shapefile 出力（on-demand 生成）

#### 【インフラ】

- AWS S3（静的ホスティング・PMTiles・GeoTIFF 配信）
- GitHub Actions（CI/CD 自動化）

#### 【データ】

- 腐植マップ（オープンデータ）
- 農水省 筆ポリゴン（GeoJSON → PMTiles）
  <br>

### 開発のポイント

- ブラウザ内で COG タイル生成・描画を行い、GIS サーバーなしでの運用を実現。
- 通信・保存の最小化のため、圃場データはすべてローカルストレージで管理。
- フロントエンドとサーバーレスを連携させ、Shapefile のリアルタイム生成を実現。
- PMTiles によるタイル軽量化と表示パフォーマンス向上を実施。
- turf/geojson-rbush で空間インデックスを作成し、グリッド内に含まれる腐植値の平均値を高速演算
- GitHub Actions を使って、ビルド・S3 デプロイまで完全自動化。
