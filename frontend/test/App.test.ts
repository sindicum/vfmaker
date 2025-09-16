// test/App.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '../src/App.vue'
import { useStore } from '../src/stores/store'

// DI確認用のダミー子コンポーネント
// mapkey は App.vue 側で shallowRef(null) を provide するので、値があるか」ではなく「inject されたか（undefined でないか）」で判定する。
const DummyChild = {
  inject: ['mapkey'],
  template: `<div data-testid="dummy-child">{{ mapkey === undefined ? "ng" : "ok" }}</div>`,
}

// テスト用ルーターを都度生成（キャッチオールで warn を吸収）
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: DummyChild },
      { path: '/:pathMatch(.*)*', component: DummyChild },
    ],
  })
}

let pinia: ReturnType<typeof createPinia>

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
})

describe('App.vue', () => {
  it('ルーティング配線の生存確認：RouterView にダミー子が描画される', async () => {
    const router = makeRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia],
        stubs: {
          // 実テンプレのタグ名に合わせる
          Header: true,
          Alert: true,
          // ErrorBoundary はパススルー
          ErrorBoundary: { template: '<div><slot/></div>' },
        },
      },
    })

    expect(wrapper.find('[data-testid="dummy-child"]').exists()).toBe(true)
  })

  it('DIの配線確認：provide mapkey が子で inject できる（undefined ではない）', async () => {
    const router = makeRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia],
        stubs: {
          Header: true,
          Alert: true,
          ErrorBoundary: { template: '<div><slot/></div>' },
        },
      },
    })

    expect(wrapper.find('[data-testid="dummy-child"]').text()).toBe('ok')
  })

  it('ローディング表示の切り替え：store.isLoading に応じて LoadingComp が切り替わる', async () => {
    const router = makeRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router, pinia],
        stubs: {
          Header: true,
          Alert: true,
          ErrorBoundary: { template: '<div><slot/></div>' },
          // Loading を可視化するためのスタブ
          Loading: { template: '<div data-testid="loading">Loading...</div>' },
        },
      },
    })

    const store = useStore()

    // 初期状態：ローディング非表示
    store.isLoading = false
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false)

    // ローディング表示
    store.isLoading = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true)

    // ローディング非表示
    store.isLoading = false
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false)
  })
})
