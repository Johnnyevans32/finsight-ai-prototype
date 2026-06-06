declare module '@mono.co/connect.js' {
  export interface MonoCustomer {
    name?: string
    email?: string
    identity?: {
      type?: string
      number?: string
    }
  }

  export interface MonoScope {
    include?: string[]
    exclude?: string[]
  }

  export interface MonoOptions {
    key: string
    scope?: string | MonoScope
    data?: {
      customer?: MonoCustomer
      [key: string]: any
    }
    onSuccess: (data: { code: string; id?: string }) => void
    onClose?: () => void
    onEvent?: (eventName: string, data: any) => void
    onLoad?: () => void
    reference?: string
  }

  export default class MonoConnect {
    constructor(options: MonoOptions)
    setup(): void
    open(): void
    close(): void
    reauthorise(reauth_token: string): void
  }
}