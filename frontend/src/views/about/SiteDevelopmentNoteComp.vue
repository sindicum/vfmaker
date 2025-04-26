<script setup lang="ts"></script>

<template>
  <div class="w-full lg:w-5xl h-full mx-4 my-8 px-4">
    <h1 class="text-3xl font-bold text-center text-amber-900 my-10">サイト開発技術</h1>
    <div class="my-12 text-center">
      主にWEBエンジニア向けに、当サイトで利用している技術の概要についてご紹介します。
    </div>
    <ul class="list-decimal list-inside">
      <div class="my-8">
        <li class="text-xl font-bold my-2 text-slate-800">Vue.js & Maplibre GL JS</li>
        <div class="leading-loose mx-6">
          フロントエンドはVue.js（Vue 3 + Composition API）でSPA（Single Page
          Application）として開発し、マップライブラリはMaplibre GL JSを使用しております。
          背景地図はOpenStreetMapとMapTilerを使用しております。
        </div>
      </div>

      <div class="my-8">
        <li class="text-xl font-bold my-2 text-slate-800">Cloud Optimized GeoTIFF（COG）</li>
        <div class="leading-loose mx-6">
          腐植マップは
          <a
            href="https://sites.google.com/view/eooxagrido/"
            target="_blank"
            class="text-blue-500 underline hover:text-blue-700"
            >EOOxAgriHokkaido</a
          >
          で公開されているマップを利用させて頂いております。
          公開されているGeoTIFFファイルを、GDALでCloud Optimized GeoTIFF（COG）化し、AWS
          S3でホスティングしております。
          フロントエンドでは、geotiff.jsを使用してブラウザから直接GeoTIFFを読み込み、fast-pngを用いてPNGタイルに変換・レンダリングしています。
        </div>
      </div>

      <div class="my-8">
        <li class="text-xl font-bold my-2 text-slate-800">PMTiles</li>
        <div class="leading-loose mx-6">
          サイト上で圃場データを登録する際に農水省筆ポリゴンも利用できる仕様にしております。
          筆ポリゴンのオリジナルファイルフォーマットはGeoJSONですが、 このままMaplibre GL
          JSで表示させると圃場数も多くレンダリングに難があるため、 Cloud Optimized Tiles化しました。
          <br />
          タイル生成はtippecanoeを用いてGeoJSONからPMTilesファイルを生成し、COGと同様にAWS
          S3でホスティングしております。
        </div>
      </div>

      <div class="my-8">
        <li class="text-xl font-bold my-2 text-slate-800">AWS S3 & Lambda</li>
        <div class="leading-loose mx-6">
          本サイトは、Vue.jsからのビルドファイルをAWS S3でホスティングしております。
          可変施肥マップの作成はパラメーターをAWS API Gatewayに送信し、 AWS
          LambdaのPythonランタイムでシェープファイル（Shapefile）に変換され、自動ダウンロードされます。
          サーバーレスアーキテクチャを採用することで、堅牢かつ低コストな運用に取り組んでおります。<br />
          なお、一般的にS3の前段に配置されるCloudFrontは、現状導入しておりません。
          利用者が増えた場合には、パフォーマンス向上および安定稼働のために配置する予定です。
        </div>
      </div>
    </ul>
  </div>
</template>
