import "axios"

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean
    skipLoader?: boolean
  }
}
