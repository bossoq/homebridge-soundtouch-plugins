import { AccessoryConfig, GlobalConfig } from './accessory-config'
import { BasePlatformConfig } from 'homebridge-base-platform'

export interface SoundTouchPlatformConfig extends BasePlatformConfig {
  readonly discoveryAllAccessories?: boolean
  readonly accessories?: AccessoryConfig[]
  readonly global?: GlobalConfig
}
