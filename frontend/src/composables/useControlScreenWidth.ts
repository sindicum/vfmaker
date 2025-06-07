import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useControlScreenWidth() {
  const windowInnerWidth = ref(window.innerWidth)
  const breakpoint = 768
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
  }
}
