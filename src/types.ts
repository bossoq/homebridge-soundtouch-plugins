import {
  API,
  Characteristic,
  Logging,
  PlatformConfig,
  Service,
} from 'homebridge'
import { Accessory } from 'hap-nodejs'
import { API as SoundTouchAPI } from '@bossoq/soundtouch-api'

export interface BaseGlobalConfig {
  readonly verbose?: boolean
}

export interface GlobalConfig extends BaseGlobalConfig {
  readonly pollingInterval?: number
  readonly volume?: VolumeConfig
  readonly presets?: PresetConfig[]
  readonly sources?: SourceConfig[]
}

export interface AccessoryConfig extends GlobalConfig {
  readonly name?: string
  readonly room?: string
  readonly ip?: string
  readonly port?: number
}

export enum VolumeMode {
  none = 'none',
  lightbulb = 'lightbulb',
  speaker = 'speaker',
}

export interface VolumeConfig {
  readonly onValue?: number
  readonly maxValue?: number
  readonly unmuteValue?: number
  readonly mode?: VolumeMode
}

export interface SoundTouchVolumeSettings {
  readonly onValue: number
  readonly maxValue: number
  readonly unmuteValue: number
  readonly mode: VolumeMode
}

export interface PresetConfig {
  readonly name?: string
  readonly index: number
  readonly enabled: boolean
}

export interface SoundTouchPreset {
  readonly name: string
  readonly index: number
}

export interface SourceConfig {
  readonly name?: string
  readonly source: string
  readonly account?: string
  readonly enabled: boolean
}

export interface SoundTouchSource {
  readonly name: string
  readonly source: string
  readonly account: string
  readonly enabled: boolean
}

export interface BaseDevice {
  readonly id: string
  readonly name: string
}

export interface SoundTouchDevice extends BaseDevice {
  readonly api: SoundTouchAPI
  readonly model: string
  readonly verbose: boolean
  readonly pollingInterval?: number
  readonly version?: string
  readonly volumeSettings: SoundTouchVolumeSettings
  readonly presets: SoundTouchPreset[]
  readonly sources: SoundTouchSource[]
}

export interface BasePlatformConfig extends PlatformConfig {
  readonly global?: BaseGlobalConfig
}

export interface SoundTouchPlatformConfig extends BasePlatformConfig {
  readonly discoveryAllAccessories?: boolean
  readonly accessories?: AccessoryConfig[]
  readonly global?: GlobalConfig
}

export interface HomebridgeContextProps {
  readonly log: Logging
  readonly api: API
  readonly Characteristic: typeof Characteristic
  readonly Service: typeof Service
  readonly Accessory: typeof Accessory
}

export interface PlatformSettings {
  readonly name: string
  readonly plugin: string
}

export interface DeviceOnOffListener {
  deviceDidTurnOff(updateOn?: boolean, updateVolume?: boolean): Promise<boolean>
  deviceDidTurnOn(updateOn?: boolean, updateVolume?: boolean): Promise<boolean>
}
