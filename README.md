## 使用技術構成

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
- Shapefile 出力（pyshp より生成）

#### 【インフラ】

- AWS S3（静的ホスティング・PMTiles・GeoTIFF 配信）
- AWS CloudFront（エッジキャッシュ配信、HTTPS 終端として使用）
- AWS Route 53（独自ドメインの DNS ルーティング、ALIAS 設定による CloudFront 連携）
- GitHub Actions（CI/CD 自動化：ビルド〜S3 デプロイまで対応）

#### 【データ】

- 腐植マップ（オープンデータ）
- 農水省 筆ポリゴン（GeoJSON → PMTiles）

### 特記事項

- 環境変数（VITE_API_URL,VITE_PMTILES_URL,VITE_OM_MAP_URL,VITE_MAPTILER_KEY）は別途設定
- COG（Cloud Optimized GeoTIFF）ファイルおよび PMTiles ファイルは事前に外部で変換・生成し、別途 AWS S3 にアップロード

### 開発のポイント

- ブラウザ内で COG タイル生成・描画を行い、GIS サーバーなしでの運用を実現
- 通信・保存の最小化のため、圃場データはすべてローカルストレージで管理
- フロントエンドとサーバーレスを連携させ、AWS Lambda より Shapefile を生成
- PMTiles によるタイル軽量化と表示パフォーマンス向上を実施
- turf/geojson-rbush を用いて圃場ポリゴンに空間インデックスを構築し、グリッド単位での腐植値平均を高速に算出
- GitHub Actions を使って、ビルド・S3 デプロイまで完全自動化
