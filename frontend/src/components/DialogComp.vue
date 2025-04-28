<script setup lang="ts">
interface Props {
  message: string
  isOpen: boolean
}
interface Emits {
  (e: 'selected', selected: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const onSelected = (selected: boolean) => {
  emit('selected', selected)
}
</script>

<template>
  <div v-show="props.isOpen" class="fixed top-0 left-0 w-screen h-screen bg-black/30">
    <div class="flex items-center justify-center h-full">
      <div class="bg-slate-100 w-80 h-44 rounded-md">
        <div class="text-center pt-8 pb-4">{{ message }}</div>
        <div class="flex justify-between px-8 py-6">
          <button
            class="h-12 w-28 bg-amber-300 hover:bg-amber-400 rounded-md"
            @click="onSelected(true)"
          >
            はい
          </button>
          <button
            class="h-12 w-28 bg-white hover:bg-slate-50 border border-slate-800 rounded-md"
            @click="onSelected(false)"
          >
            いいえ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
