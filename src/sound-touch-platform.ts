import { AccessoryConfig, GlobalConfig } from './accessory-config'
import { SoundTouchAccessoryWrapper } from './sound-touch-accessory-wrapper'
import {
  deviceFromConfig,
  searchAllDevices,
  SoundTouchDevice,
} from './sound-touch-device'
import {
  HomebridgeAccessoryWrapperConstructor,
  HomebridgePlatform,
  PlatformSettings,
} from 'homebridge-base-platform'
import { SoundTouchPlatformConfig } from './platform-config'
import { API, Logging } from 'homebridge'

export enum SoundTouchPlatformInfo {
  plugin = 'homebridge-soundtouch-plugins',
  name = 'SoundTouchPlugins',
}

export class SoundTouchPlatform extends HomebridgePlatform<
  SoundTouchPlatformConfig,
  SoundTouchDevice,
  SoundTouchAccessoryWrapper
> {
  public constructor(
    logger: Logging,
    config: SoundTouchPlatformConfig,
    api: API
  ) {
    super(logger, config, api)
  }

  protected getDefaultPlatformConfig(): SoundTouchPlatformConfig | undefined {
    return {
      platform: SoundTouchPlatformInfo.name,
      discoveryAllAccessories: true,
    }
  }

  protected initPlatformSettings(): PlatformSettings {
    return {
      name: SoundTouchPlatformInfo.name,
      plugin: SoundTouchPlatformInfo.plugin,
    }
  }

  protected getAccessoryWrapperConstructorForDevice(
    device: SoundTouchDevice
  ): HomebridgeAccessoryWrapperConstructor<
    SoundTouchAccessoryWrapper,
    SoundTouchDevice
  > {
    return SoundTouchAccessoryWrapper
  }

  protected async searchDevices(): Promise<SoundTouchDevice[]> {
    const accessoryConfigs: AccessoryConfig[] = this.config.accessories || []
    const globalConfig: GlobalConfig = this.config.global || {}
    if (this.config.discoveryAllAccessories === true)
      return searchAllDevices(globalConfig, accessoryConfigs, this.log)
    return Promise.all(
      accessoryConfigs.map((ac) => deviceFromConfig(globalConfig, ac, this.log))
    )
  }
}
