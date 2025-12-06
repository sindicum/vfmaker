<script setup lang="ts">
import { useControlScreenWidth } from '@/components/common/composables/useControlScreenWidth'

const { isDesktop } = useControlScreenWidth()
</script>

<template>
  <div class="w-full lg:w-5xl h-full mx-4 my-8 px-4">
    <h1 class="text-3xl font-bold text-center text-amber-900 my-4 sm:my-10">
      VFMakerの使い方<br />（動画をご覧ください）
    </h1>

    <div :class="[isDesktop ? 'p-12 aspect-video' : 'p-2 aspect-[9/16]']">
      <iframe
        v-if="isDesktop"
        class="w-full h-full rounded-lg"
        src="https://www.youtube-nocookie.com/embed/E69wOCus4uE"
        title="VFMaker解説動画（デスクトップ版）"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
      <iframe
        v-else
        class="w-full h-full rounded-lg"
        src="https://www.youtube-nocookie.com/embed/fipWgu9it9A"
        title="VFMaker解説動画（スマホ版）"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>
  </div>
</template>
