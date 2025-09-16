<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

interface Props {
  message: string
  isOpen: boolean
}
interface Emits {
  (e: 'selected', isSelect: boolean): void
}
const memoRef = ref<HTMLInputElement | null>(null)

const memo = defineModel<string>('memo')
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const onSelected = (isSelect: boolean) => {
  emit('selected', isSelect)
}
watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick()
      memoRef.value?.focus()
    } else {
      memoRef.value?.blur()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div v-show="props.isOpen" class="fixed top-0 left-0 w-screen h-screen bg-black/30 z-50">
    <div class="flex items-center justify-center h-full">
      <div class="bg-slate-100 w-80 h-52 rounded-md">
        <div class="text-center pt-8 pb-4">{{ props.message }}</div>
        <input
          v-model="memo"
          ref="memoRef"
          class="block border w-64 rounded-md bg-white hover:bg-gray-50 mx-auto mt-2 px-3 py-1"
          placeholder="メモ（任意）"
          maxlength="64"
        />
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
