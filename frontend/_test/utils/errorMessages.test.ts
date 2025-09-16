import { describe, it, expect } from 'vitest'
import { ERROR_MESSAGES } from '@/utils/errorMessages'
import { ErrorCategory, ErrorSeverity } from '@/errors/types'

describe('errorMessages', () => {
  describe('ERROR_MESSAGES', () => {
    it('定義されたエラーカテゴリが存在する', () => {
      expect(ERROR_MESSAGES).toHaveProperty(ErrorCategory.NETWORK)
      expect(ERROR_MESSAGES).toHaveProperty(ErrorCategory.GEOSPATIAL)
    })

    it('NETWORKカテゴリに正しい重要度レベルのメッセージが定義されている', () => {
      const networkMessages = ERROR_MESSAGES[ErrorCategory.NETWORK]
      
      expect(networkMessages).toHaveProperty(ErrorSeverity.MEDIUM)
      expect(networkMessages).toHaveProperty(ErrorSeverity.HIGH)
      
      expect(networkMessages[ErrorSeverity.MEDIUM]).toBe('ネットワーク接続を確認してください')
      expect(networkMessages[ErrorSeverity.HIGH]).toBe('サーバーとの通信に失敗しました。しばらく待ってから再試行してください')
    })

    it('GEOSPATIALカテゴリに正しい重要度レベルのメッセージが定義されている', () => {
      const geospatialMessages = ERROR_MESSAGES[ErrorCategory.GEOSPATIAL]
      
      expect(geospatialMessages).toHaveProperty(ErrorSeverity.MEDIUM)
      expect(geospatialMessages).toHaveProperty(ErrorSeverity.HIGH)
      
      expect(geospatialMessages[ErrorSeverity.MEDIUM]).toBe('地図データの処理中にエラーが発生しました')
      expect(geospatialMessages[ErrorSeverity.HIGH]).toBe('空間データの形式が正しくありません。データを確認してください')
    })

    it('すべてのメッセージが日本語で記述されている', () => {
      const allMessages = Object.values(ERROR_MESSAGES).flatMap(category => 
        Object.values(category)
      )

      allMessages.forEach(message => {
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)
        // 日本語文字が含まれているかチェック
        expect(message).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)
      })
    })

    it('メッセージが空文字列でない', () => {
      const allMessages = Object.values(ERROR_MESSAGES).flatMap(category => 
        Object.values(category)
      )

      allMessages.forEach(message => {
        expect(message.trim()).not.toBe('')
        expect(message.length).toBeGreaterThan(5) // 最低限の長さ
      })
    })

    it('各カテゴリに必要な重要度レベルが定義されている', () => {
      const expectedCategories = [ErrorCategory.NETWORK, ErrorCategory.GEOSPATIAL]
      const expectedSeverities = [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH]

      expectedCategories.forEach(category => {
        expect(ERROR_MESSAGES).toHaveProperty(category)
        
        expectedSeverities.forEach(severity => {
          expect(ERROR_MESSAGES[category]).toHaveProperty(severity)
          expect(typeof ERROR_MESSAGES[category][severity]).toBe('string')
        })
      })
    })

    it('メッセージの内容が適切である', () => {
      // ネットワークエラーメッセージの内容チェック
      const networkMedium = ERROR_MESSAGES[ErrorCategory.NETWORK][ErrorSeverity.MEDIUM]
      const networkHigh = ERROR_MESSAGES[ErrorCategory.NETWORK][ErrorSeverity.HIGH]

      expect(networkMedium).toContain('ネットワーク')
      expect(networkHigh).toContain('サーバー')
      expect(networkHigh).toContain('再試行')

      // 地理空間エラーメッセージの内容チェック
      const geospatialMedium = ERROR_MESSAGES[ErrorCategory.GEOSPATIAL][ErrorSeverity.MEDIUM]
      const geospatialHigh = ERROR_MESSAGES[ErrorCategory.GEOSPATIAL][ErrorSeverity.HIGH]

      expect(geospatialMedium).toContain('地図データ')
      expect(geospatialHigh).toContain('空間データ')
    })

    it('重要度による メッセージの差別化ができている', () => {
      // ネットワークカテゴリ
      const networkMedium = ERROR_MESSAGES[ErrorCategory.NETWORK][ErrorSeverity.MEDIUM]
      const networkHigh = ERROR_MESSAGES[ErrorCategory.NETWORK][ErrorSeverity.HIGH]
      expect(networkMedium).not.toBe(networkHigh)

      // 地理空間カテゴリ
      const geospatialMedium = ERROR_MESSAGES[ErrorCategory.GEOSPATIAL][ErrorSeverity.MEDIUM]
      const geospatialHigh = ERROR_MESSAGES[ErrorCategory.GEOSPATIAL][ErrorSeverity.HIGH]
      expect(geospatialMedium).not.toBe(geospatialHigh)
    })

    it('オブジェクトの構造が正しい', () => {
      expect(typeof ERROR_MESSAGES).toBe('object')
      expect(ERROR_MESSAGES).not.toBeNull()
      expect(Array.isArray(ERROR_MESSAGES)).toBe(false)

      // 各カテゴリがオブジェクト型である
      Object.values(ERROR_MESSAGES).forEach(category => {
        expect(typeof category).toBe('object')
        expect(category).not.toBeNull()
        expect(Array.isArray(category)).toBe(false)
      })
    })

    it('定数として適切に型定義されている', () => {
      // as constによって読み取り専用になっていることを確認
      // TypeScriptコンパイル時にチェックされるが、実行時の確認として
      expect(Object.isFrozen(ERROR_MESSAGES)).toBe(false) // as constは実行時にfreezeしない
      
      // しかし構造は期待通りであることを確認
      const messageKeys = Object.keys(ERROR_MESSAGES)
      expect(messageKeys).toContain(ErrorCategory.NETWORK)
      expect(messageKeys).toContain(ErrorCategory.GEOSPATIAL)
    })

    it('未定義のカテゴリ・重要度の組み合わせを適切に処理する', () => {
      // 存在しないカテゴリ
      expect(ERROR_MESSAGES['UNKNOWN_CATEGORY' as any]).toBeUndefined()

      // 存在しないSeverity
      expect(ERROR_MESSAGES[ErrorCategory.NETWORK]['UNKNOWN_SEVERITY' as any]).toBeUndefined()
    })

    it('メッセージにユーザーフレンドリーな表現が使用されている', () => {
      const allMessages = Object.values(ERROR_MESSAGES).flatMap(category => 
        Object.values(category)
      )

      allMessages.forEach(message => {
        // ユーザーフレンドリーでない技術用語が含まれていないかチェック
        expect(message).not.toMatch(/error|exception|null|undefined/i)
        
        // ユーザーに対する適切な表現が使用されているかチェック
        const hasUserFriendlyWords = 
          message.includes('してください') || 
          message.includes('ました') || 
          message.includes('確認') ||
          message.includes('再試行')
        
        expect(hasUserFriendlyWords).toBe(true)
      })
    })
  })
})