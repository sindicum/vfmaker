import { describe, it, expect } from 'vitest'

describe('main.ts (smoke)', () => {
  it('createVfmApp 関数が存在し、正しい構造を返す', async () => {
    // グローバルに #app を用意（main.ts の自動実行対策）
    document.body.innerHTML = '<div id="app"></div>'

    // 動的インポート
    const { createVfmApp } = await import('../src/main')

    // 関数の存在確認
    expect(createVfmApp).toBeDefined()
    expect(typeof createVfmApp).toBe('function')

    // 戻り値の構造確認（実際にマウントはしない）
    const { app, pinia, router } = createVfmApp()
    expect(app).toBeDefined()
    expect(pinia).toBeDefined()
    expect(router).toBeDefined()

    // 必要なメソッドの存在確認
    expect(app.mount).toBeDefined()
    expect(app.use).toBeDefined()
  })
})
