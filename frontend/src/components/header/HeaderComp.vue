<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import HamburgerButton from '@/components/header/HamburgerButton.vue'
import { useControlScreenWidth } from '@/composables/useControlScreenWidth'

const route = useRoute()

const isOpenMenu = ref(false)

const { isDesktop } = useControlScreenWidth()

const navigation: {
  href: string
  name: string
}[] = [
  { href: '/', name: '腐植マップ' },
  { href: '/manage-fieldinfo', name: '圃場登録管理' },
  { href: '/create-vfm', name: '可変施肥マップ作成' },
  { href: '/about', name: '本サイトについて' },
]
</script>

<template>
  <header class="fixed top-0 flex items-center justify-between w-screen h-16 bg-slate-800 z-10">
    <div class="ml-4 lg:ml-10 text-2xl text-amber-300 tracking-wide">
      VFMaker <span class="text-xl">（β版）</span>
    </div>
    <HamburgerButton v-model:is-open-menu="isOpenMenu" />
    <nav
      v-if="isDesktop || isOpenMenu"
      :class="[
        isDesktop ? 'flex-row' : 'absolute top-16 flex-col bg-slate-800/60 z-20',
        'flex right-0 ',
      ]"
    >
      <RouterLink
        v-for="item in navigation"
        :to="item.href"
        :key="item.href"
        :class="[
          route.path === item.href ? 'lg:bg-slate-950 rounded-md text-amber-300' : 'text-white',
          'hover:text-amber-400 px-4 py-4 lg:py-2',
        ]"
        @click="isOpenMenu = false"
      >
        {{ item.name }}
      </RouterLink>
    </nav>
  </header>
</template>
