<script setup lang="ts">
import SiteDevelopmentNoteComp from './SiteDevelopmentNoteComp.vue'
import SiteUsageNoteComp from './SiteUsageNoteComp.vue'
</script>

<template>
  <main class="h-[calc(100vh-4rem)] w-screen">
    <div class="flex flex-col items-center justify-center">
      <SiteUsageNoteComp />
      <hr class="border-t-2 border-slate-200 w-full lg:w-5xl" />

      <SiteDevelopmentNoteComp />
    </div>
  </main>
</template>
