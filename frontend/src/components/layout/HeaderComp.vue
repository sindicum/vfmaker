<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const navigation: {
  href: string
  name: string
}[] = [
  { href: '/', name: '腐植マップ' },
  { href: '/manage-fieldinfo', name: '圃場情報管理' },
  { href: '/create-vfm', name: '可変施肥マップ作成' },
  // { href: '/#', name: '本サイトについて' },
]
</script>

<template>
  <header class="flex items-center justify-between w-screen h-16 bg-slate-800">
    <div class="ml-10 text-2xl text-amber-300 tracking-wide">VFMaker</div>
    <div class="flex mr-8">
      <RouterLink
        v-for="(item, index) in navigation"
        :to="item.href"
        :key="index"
        :class="[
          route.path === item.href ? 'bg-slate-950 rounded-md text-amber-300' : 'text-white',
          'hover:text-amber-300 px-4 py-2',
        ]"
      >
        {{ item.name }}
      </RouterLink>
    </div>
  </header>
</template>
