<script setup lang="ts"></script>

<template>
  <div class="w-full lg:w-5xl h-full mx-4 mt-8 mb-32 px-4">
    <h1 class="text-3xl font-bold text-center text-amber-900 my-10">サイト開発技術</h1>
    <div class="my-18 mx-6 leading-loose">
      主にWebエンジニア向けに、当サイトで利用している技術の概要についてご紹介します。
    </div>
    <ul class="list-decimal list-inside">
      <div class="my-8">
        <li class="text-xl font-bold my-2 text-slate-800">Vue.js & Maplibre GL JS</li>
        <div class="leading-loose mx-6">
          フロントエンドはVue.js（Vue 3 + Composition API）によるSPA（Single Page
          Application）で構築しています。 CSSフレームワークにはTailwind
          CSSを採用し、保守性と堅牢性の向上のためにTypeScriptを導入しています。
          マップライブラリとしてはMaplibre GL
          JSを使用し、背景地図にはOpenStreetMapおよびMapTilerを利用しています。
        </div>
      </div>

      <div class="my-8">
        <li class="text-xl font-bold my-2 text-slate-800">Cloud Optimized GeoTIFF（COG）</li>
        <div class="leading-loose mx-6">
          腐植マップは、EOOxAgriHokkaido（
          <a
            href="https://sites.google.com/view/eooxagrido/"
            target="_blank"
            class="text-blue-500 underline hover:text-blue-700"
          >
            https://sites.google.com/view/eooxagrido/
          </a>
          ）にて公開されているGeoTIFFファイルを活用しています。 このファイルをGDALによりCloud
          Optimized GeoTIFF（COG）形式へ変換し、AWS S3でホスティングしています。
          フロントエンドでは、geotiff.jsを用いてブラウザから直接GeoTIFFを読み込み、fast-pngでPNGタイルに変換・描画しています。
        </div>
      </div>

      <div class="my-8">
        <li class="text-xl font-bold my-2 text-slate-800">
          PMTiles（Cloud Optimized Vector Tiles）
        </li>
        <div class="leading-loose mx-6">
          圃場データの登録時に、農水省が公開している筆ポリゴン（圃場情報）を利用可能としています。
          元データはGeoJSON形式ですが、 そのままMaplibre GL
          JSで表示するとポリゴン数が多く描画パフォーマンスに課題があるため、
          PMTiles形式に変換しています。
          <br />
          GeoJSONからの変換にはtippecanoeを使用し、生成されたPMTilesファイルはCOGと同様にAWS
          S3上でホスティングしています。
        </div>
      </div>

      <div class="my-8">
        <li class="text-xl font-bold my-2 text-slate-800">AWS CloudFront + S3 + Lambda</li>
        <div class="leading-loose mx-6">
          本サイトは、Vue.jsによるビルドファイルをAWS CloudFront および
          S3によりホスティングしています。
          可変施肥マップの作成に際しては、ユーザーが指定したパラメーターをAWS API
          Gateway経由で送信し、 AWS
          Lambda（Pythonランタイム）にてShapefile（シェープファイル）に変換された後、
          クライアント側に自動でダウンロードされます。
          このように、サーバーレスアーキテクチャを採用することで、堅牢かつ低コストな運用を実現しています。<br />
        </div>
      </div>

      <div class="my-8">
        <li class="text-xl font-bold my-2 text-slate-800">Github & Github Actions</li>
        <div class="leading-loose mx-6">
          本サイトのソースコードはGithubで管理・公開しており、デプロイはGithub
          Actionsによって自動化されています。 興味のある方はGithubリポジトリ（
          <a
            href="https://github.com/sindicum/vfmaker"
            target="_blank"
            class="text-blue-500 underline hover:text-blue-700"
            >https://github.com/sindicum/vfmaker</a
          >）をご覧下さい。
        </div>
      </div>
    </ul>
  </div>
</template>
