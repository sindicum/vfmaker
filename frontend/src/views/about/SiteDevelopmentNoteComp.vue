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
          フロントエンドはVue.js（Vue 3 + Composition API）のSPA（Single Page
          Application）で構築しています。 CSSフレームワークにはTailwind
          CSSを採用し、保守性と堅牢性を高めるためにTypeScriptを導入し開発しています。
          マップライブラリにはMaplibre GL
          JSを使用し、背景地図としてOpenStreetMapとMapTilerを利用しています。
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
          ）で公開されているマップを利用させて頂いてます。
          公開されているGeoTIFFファイルを、GDALでCloud Optimized GeoTIFF（COG）化し、AWS
          S3でホスティングしています。
          フロントエンドでは、geotiff.jsを使用してブラウザから直接GeoTIFFを読み込み、fast-pngを用いてPNGタイルに変換・レンダリングしています。
        </div>
      </div>

      <div class="my-8">
        <li class="text-xl font-bold my-2 text-slate-800">PMTiles</li>
        <div class="leading-loose mx-6">
          サイト上で圃場データを登録する際、農水省が公開している筆ポリゴン（圃場情報）も利用できる仕様としています。
          筆ポリゴンのオリジナルファイルフォーマットはGeoJSONですが、 そのままMaplibre GL
          JSで表示すると圃場数が多いため、レンダリング速度に課題があります。<br />
          そこで、表示パフォーマスを向上させるために Cloud Optimized
          Tiles（PMTiles）形式に変換しています。
          タイルデータはtippecanoeを用いてGeoJSONからPMTilesファイルを生成し、COGと同様にAWS
          S3上でホスティングしています。
        </div>
      </div>

      <div class="my-8">
        <li class="text-xl font-bold my-2 text-slate-800">AWS CloudFront + S3 + Lambda</li>
        <div class="leading-loose mx-6">
          本サイトは、Vue.jsで構築されたビルドファイルをAWS CloudFront および
          S3によってホスティングしています。
          可変施肥マップの作成においては、ユーザーが指定したパラメーターをAWS API
          Gateway経由で送信し、 AWS
          Lambda（Pythonランタイム）によりでShapefile（シェープファイル）へと変換され、
          クライアントに自動的にダウンロードされます。
          サーバーレスアーキテクチャを採用することで、堅牢かつ低コストな運用を実現しています。<br />
        </div>
      </div>

      <div class="my-8">
        <li class="text-xl font-bold my-2 text-slate-800">Github & Github Actions</li>
        <div class="leading-loose mx-6">
          本サイトのソースコードはGithubで管理・公開しており、デプロイはGithub
          Actionsを用いて自動化しています。 興味のある方はGithubリポジトリ（
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
