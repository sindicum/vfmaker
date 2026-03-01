<script setup lang="ts"></script>

<template>
  <div class="w-full lg:w-5xl h-full mx-4 my-8 px-4">
    <h1 class="text-3xl font-bold text-center text-amber-900 my-4 sm:my-10">
      施肥量配分ロジックについて
    </h1>
    <div class="my-4 sm:my-18 mx-2 sm:mx-6 leading-loose text-sm sm:text-base">
      VFMakerでは、腐植マップから取得した各地点の値に基づき、各グリッドの施肥量を自動配分します。配分方式は「5段階モード」と「無段階モード」の2種類があり、ユーザーは目的や好みに応じて選択できます。
    </div>

    <ul class="list-decimal list-inside">
      <!-- 5段階モード -->
      <div class="my-8">
        <li class="text-base sm:text-xl font-bold my-2 text-slate-800">5段階モード</li>
        <div class="leading-loose mx-2 sm:mx-6 text-sm sm:text-base">
          全グリッドを腐植値の昇順に並べ、面積累積比率で5等分します。各区間にあらかじめ設定された施肥係数（例:
          +20%, +10%, 0%, -10%,
          -20%）を割り当てます。グリッドが区間の境界をまたぐ場合は、面積按分で係数が加重平均されます。
        </div>
        <div class="bg-red-50 rounded p-3 mx-2 sm:mx-6 mt-3 text-sm sm:text-base">
          <span class="font-semibold text-red-700">特徴:</span>
          面積ベースの均等配分のため極端な偏りが出にくい一方、腐植値の実際の差は考慮されません。値が近いグリッド間でも面積順位が異なれば施肥量に大きな差がつく場合があります。
        </div>
      </div>

      <!-- 無段階モード -->
      <div class="my-8">
        <li class="text-base sm:text-xl font-bold my-2 text-slate-800">無段階モード</li>
        <div class="leading-loose mx-2 sm:mx-6 text-sm sm:text-base">
          腐植値の実際の差に比例して配分係数を算出します。計算は以下の5ステップで行われます。
          <ol class="list-decimal list-inside space-y-1 mt-3">
            <li>
              <span class="font-semibold">正規化:</span>
              各腐植値と最小値の差を、最大値-最小値を分母として割り算して、0〜1の範囲で正規化
            </li>
            <li>
              <span class="font-semibold">基本重み算出:</span>
              先に正規化した値を、設定した可変施肥増減率に割り当て基本的な重みを算出
            </li>
            <li><span class="font-semibold">面積加重平均の計算:</span> 全体の偏りを定量化</li>
            <li>
              <span class="font-semibold">シフト補正:</span>
              各重みから面積加重平均を差し引き、全体の施肥量が変わらないように補正
            </li>
            <li>
              <span class="font-semibold">最大可変施肥増減率のスケーリング:</span>
              重みの絶対値が増減率を超えた場合、全体を比例縮小
            </li>
          </ol>
        </div>
        <div class="bg-blue-50 rounded p-3 mx-2 sm:mx-6 mt-3 text-sm sm:text-base">
          <span class="font-semibold text-blue-700">特徴:</span>
          腐植値の差に比例するため直感的な配分になります。腐植値ごとの面積分布に偏りがあると全体の可変施肥幅が縮小する場合があります。
        </div>
      </div>

      <!-- 共通事項 -->
      <div class="my-8">
        <li class="text-base sm:text-xl font-bold my-2 text-slate-800">共通事項</li>
        <div class="leading-loose mx-2 sm:mx-6 text-sm sm:text-base">
          可変施肥量幅のデフォルトは腐植値の変動係数（CV×2）に基づきます。腐植値=0のグリッドは圃場外として配分対象から除外されます。
        </div>
      </div>
    </ul>
  </div>
</template>
