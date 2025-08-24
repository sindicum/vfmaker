import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useControlScreenWidth(breakpoint = 1024) {
  const windowInnerWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0)

  const isDesktop = computed(() => windowInnerWidth.value >= breakpoint)

  const updateWindowWidth = () => {
    windowInnerWidth.value = window.innerWidth
  }

  onMounted(() => {
    window.addEventListener('resize', updateWindowWidth)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateWindowWidth)
  })

  return {
    isDesktop,
    windowInnerWidth,
  }
}
