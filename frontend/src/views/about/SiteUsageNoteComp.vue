<script setup lang="ts">
const siteUsageNotes = [
  {
    title: 'マップデータの精度について',
    content:
      '本サービスで作成する施肥マップは、オープンデータとして公開されている腐植マップ（北海道限定）を基に作成されます。\
      腐植マップは実際の圃場状況と異なる場合があるため、現地確認や土壌分析を実施のうえ利用の判断をお願いいたします。',
  },
  {
    title: '施肥設計の最終判断について',
    content:
      '本サービスは施肥設計の参考情報を提供するものであり、\
      作成されたマップに基づく施肥の実施による結果（収量低下や品質不良等）については一切の責任を負いません。\
      最終的な利用は利用者自身の判断と責任において行ってください。\
      設定された施肥量も予めGNSSガイダンス等で確認のうえご利用くださいますようお願いいたします。',
  },
  {
    title: '対応機械について',
    content:
      '本サービスで生成したシェープファイル、ISO-XML、GeoTIFFは一般的なファイルフォーマットで出力しており、\
      農業機械での動作を保証するものではありません。利用にあたっては予め農業機械の動作をご確認のうえご利用下さい。',
  },
  {
    title: 'データ保存・バックアップについて',
    content:
      '本サービスに登録した圃場情報は、Webブラウザのストレージ（indexedDB）に保存されます。\
      ストレージに保存できる登録圃場数および可変施肥マップ数は10件までです。\
      入力された情報はサーバーに保存されません。\
      ブラウザのストレージは、利用状況により失われる可能性があることを了承お願いいたします。',
  },
  {
    title: 'サービス提供の中断・変更について',
    content:
      '予告なくサイト内容や機能の変更、中断、終了を行うことがあります。\
      これにより利用者に生じた損害については、責任を負いかねます。',
  },
  {
    title: '開発・改善要望',
    content:
      'ご意見・ご要望などがありましたら、電子メール（宛先:sindicum0510@gmail.com）でご連絡下さい。',
  },
]
</script>

<template>
  <div class="w-full lg:w-5xl h-full mx-4 my-8 px-4">
    <h1 class="text-3xl font-bold text-center text-amber-900 my-4 sm:my-10">VFMakerについて</h1>
    <div class="my-4 sm:my-18 mx-2 sm:mx-6 leading-loose text-sm sm:text-base">
      本サービスは、オープンデータとサーバーレス技術、オープンソース開発によって構築されています。
      農業DXの発展に寄与することを目指し、どなたでもアクセスし活用できる環境を提供しています。<br />
      パソコン、タブレット、スマートフォンのいずれでも利用可能なレスポンシブデザインを採用しています。<br />
      なお、本サイトは個人運営であり、開発者の所属組織とは関係を有しておりません。
      以下の注意事項を了承のうえご利用くださいますようお願い申し上げます。
    </div>
    <ul class="list-decimal list-inside">
      <div class="my-8" v-for="note in siteUsageNotes" :key="note.title">
        <li class="text-base sm:text-xl font-bold my-2 text-slate-800">{{ note.title }}</li>
        <div class="leading-loose mx-2 sm:mx-6 text-sm sm:text-base">
          {{ note.content }}
        </div>
      </div>
    </ul>
  </div>
</template>
