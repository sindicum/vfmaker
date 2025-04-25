/// <reference types="vite/client" />
import 'pinia'
declare module 'pinia' {
  export interface DefineStoreOptionsBase<S> {
    persist?: boolean | PersistOptions<S>
  }
}
