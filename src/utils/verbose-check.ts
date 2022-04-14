import { BaseGlobalConfig } from '../types'

export const isVerboseInConfigs = (...configs: BaseGlobalConfig[]): boolean => {
  let isVerbose = false
  for (const config of configs) {
    if (config && config.verbose !== undefined) {
      isVerbose = config.verbose
    }
  }
  return isVerbose
}
