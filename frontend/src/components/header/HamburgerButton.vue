<script setup lang="ts">
const isOpenMenu = defineModel<boolean>('isOpenMenu')

const toggleMenu = () => {
  isOpenMenu.value = !isOpenMenu.value
}
</script>

<template>
  <button
    class="relative md:invisible h-4 mt-2.5 mb-2 mx-2 w-5"
    type="button"
    @click="toggleMenu"
    :aria-expanded="isOpenMenu"
  >
    <span
      :class="[
        isOpenMenu ? 'rotate-45 top-1.5' : 'top-0',
        'h-[0.1rem] w-5 inline-block absolute right-0 bg-white transition-all duration-300 transform',
      ]"
    />
    <span
      v-if="!isOpenMenu"
      class="h-[0.1rem] w-5 inline-block absolute right-0 top-1.5 bg-white transition-all duration-300 transform"
    />
    <span
      :class="[
        isOpenMenu ? '-rotate-45 top-1.5' : 'top-3',
        'h-[0.1rem] w-5 inline-block absolute right-0 bg-white transition-all duration-300 transform',
      ]"
    />
  </button>
</template>
