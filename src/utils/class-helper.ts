import { isVerboseInConfigs } from './verbose-check'
import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  Service,
  WithUUID,
} from 'homebridge'
import { Accessory } from 'hap-nodejs'
import {
  BaseDevice,
  BasePlatformConfig,
  HomebridgeContextProps,
  PlatformSettings,
} from '../types'

class HomebridgeContext implements HomebridgeContextProps {
  readonly log: Logging
  readonly api: API

  constructor(log: Logging, api: API) {
    this.log = log
    this.api = api
  }

  get Characteristic(): typeof Characteristic {
    return this.api.hap.Characteristic
  }

  get Service(): typeof Service {
    return this.api.hap.Service
  }

  get Accessory(): typeof Accessory {
    return this.api.hap.Accessory
  }
}

class HomebridgeContextProxy implements HomebridgeContextProps {
  readonly context: HomebridgeContextProps

  public constructor(context: HomebridgeContextProps) {
    this.context = context
  }

  get log(): Logging {
    return this.context.log
  }

  get api(): API {
    return this.context.api
  }

  get Characteristic(): typeof Characteristic {
    return this.api.hap.Characteristic
  }

  get Service(): typeof Service {
    return this.api.hap.Service
  }

  get Accessory(): typeof Accessory {
    return this.api.hap.Accessory
  }
}

export class HomebridgeAccessoryWrapper<Device> extends HomebridgeContextProxy {
  readonly accessory: PlatformAccessory
  readonly device: Device

  public constructor(
    context: HomebridgeContextProps,
    accessory: PlatformAccessory,
    device: Device
  ) {
    super(context)
    this.accessory = accessory
    this.device = device
  }

  public getDisplayName(): string {
    return this.accessory.displayName
  }

  public getService<T extends WithUUID<typeof Service>>(
    serviceType: T,
    displayName: string,
    subType: string
  ): Service {
    const service = this.accessory.getServiceById(serviceType, subType)
    if (!service) {
      return this.accessory.addService(serviceType, displayName, subType)
    } else if (service.displayName !== displayName) {
      const nameCharacteristic =
        service.getCharacteristic(this.Characteristic.Name) ||
        service.addCharacteristic(this.Characteristic.Name)
      nameCharacteristic.setValue(displayName)
      service.displayName = displayName
    }
    return service
  }

  public removeService<T extends WithUUID<typeof Service>>(
    serviceType: T,
    subType: string
  ): void {
    const service = this.accessory.getServiceById(serviceType, subType)
    if (service !== undefined) {
      this.accessory.removeService(service)
    }
  }

  public getServices<T extends WithUUID<typeof Service>>(
    serviceType: T,
    condition: (service: Service) => boolean
  ): Service[] {
    if (this.accessory.services === undefined) {
      return []
    }
    return this.accessory.services.filter((service) => {
      return service.UUID === serviceType.UUID && condition(service) === true
    })
  }
}

export abstract class HomebridgePlatform<
    Config extends BasePlatformConfig,
    Device extends BaseDevice,
    AccessoryWrapper extends HomebridgeAccessoryWrapper<Device>
  >
  extends HomebridgeContextProxy
  implements DynamicPlatformPlugin
{
  protected readonly config: Config
  protected readonly settings: PlatformSettings
  protected readonly accessories: PlatformAccessory[] // homebridge registry
  protected accessoryWrappers: AccessoryWrapper[]

  protected constructor(logger: Logging, config: Config, api: API) {
    super(new HomebridgeContext(logger, api))
    this.settings = this.initPlatformSettings()
    this.config = this.initPlatformConfig(config)
    this.accessories = []
    api.on('didFinishLaunching', this.main.bind(this))
    api.on('shutdown', this.shutdown.bind(this))
  }

  protected initPlatformConfig(config?: Config): Config {
    if (!config) {
      if (isVerboseInConfigs(this.config.global)) {
        this.log.warn(
          `Missing configuration from the Homebridge config.json you need to register the plugin using the following key {"platform: ${this.settings.name}"}, use the default configuration`
        )
      }
      config = this.getDefaultPlatformConfig()
    }
    if (!config || config.platform !== this.settings.name) {
      throw new Error(
        `Invalid platform configuration '${config}', you must edit your Homebridge config.json file`
      )
    }
    return config
  }

  protected abstract getDefaultPlatformConfig(): Config | undefined

  protected abstract initPlatformSettings(): PlatformSettings

  protected abstract getAccessoryWrapperConstructorForDevice(
    device: Device
  ): HomebridgeAccessoryWrapperConstructor<AccessoryWrapper, Device> | undefined

  protected abstract searchDevices(): Promise<Device[]>

  protected main(): void {
    if (isVerboseInConfigs(this.config.global)) {
      this.log('Searching accessories...')
    }
    this.searchAccessories()
      .then((accessories) => {
        this.accessoryWrappers = accessories
        this.clearUnreachableAccessories()
        if (isVerboseInConfigs(this.config.global)) {
          this.log('Finish searching accessories')
        }
      })
      .catch((err) => this.log.error(err))
  }

  protected shutdown(): void {
    // default does nothing
  }

  protected async searchAccessories(): Promise<AccessoryWrapper[]> {
    const devices = await this.searchDevices()
    const accessories = devices.map((device) =>
      this.accessoryFromDevice(device)
    )
    return accessories.filter((acc) => acc !== undefined)
  }

  protected accessoryFromDevice(device: Device): AccessoryWrapper | undefined {
    const AccessoryWrapperConstructor =
      this.getAccessoryWrapperConstructorForDevice(device)
    if (AccessoryWrapperConstructor === undefined) {
      return undefined
    }
    const uuid = this.api.hap.uuid.generate(device.id)
    const cachedAccessory = this.accessories.find((item) => item.UUID === uuid)
    if (cachedAccessory) {
      return new AccessoryWrapperConstructor(
        this.context,
        cachedAccessory,
        device
      )
    }
    const accessory = new this.api.platformAccessory(device.name, uuid)
    const accessoryWrapper = new AccessoryWrapperConstructor(
      this.context,
      accessory,
      device
    )
    this.configureAccessory(accessory)
    this.api.registerPlatformAccessories(
      this.settings.plugin,
      this.settings.name,
      [accessory]
    )
    return accessoryWrapper
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.accessories.push(accessory)
  }

  protected clearUnreachableAccessories() {
    const unreachableAccessories = this.accessories.filter(
      (cachedAccessory) => {
        return (
          this.accessoryWrappers.some((acc: AccessoryWrapper) => {
            return acc.accessory.UUID === cachedAccessory.UUID
          }) === false
        )
      }
    )
    if (unreachableAccessories.length > 0) {
      this.api.unregisterPlatformAccessories(
        this.settings.plugin,
        this.settings.name,
        unreachableAccessories
      )
    }
  }
}

export type HomebridgeAccessoryWrapperConstructor<
  AccessoryWrapper extends HomebridgeAccessoryWrapper<Device>,
  Device extends BaseDevice
> = {
  new (
    context: HomebridgeContextProps,
    accessory: PlatformAccessory,
    device: Device
  ): AccessoryWrapper
}
