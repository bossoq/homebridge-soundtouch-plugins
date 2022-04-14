import { HomebridgeAccessoryWrapper } from './utils'
import { Characteristic, Service } from 'homebridge'
import { SoundTouchVolume } from './sound-touch-volume'
import { SoundTouchDevice } from './types'

export class SoundTouchSpeakerVolume extends SoundTouchVolume {
  protected initService(): Service {
    const Characteristic = this.accessoryWrapper.Characteristic
    const Service = this.accessoryWrapper.Service
    const volumeService = this.accessoryWrapper.getService(
      Service.Speaker,
      this.accessoryWrapper.getDisplayName() + ' Volume',
      'volumeService'
    )
    let volumeCharacteristic = volumeService.getCharacteristic(
      Characteristic.Volume
    )
    if (volumeCharacteristic === undefined)
      volumeService.addCharacteristic(new Characteristic.Volume())
    return volumeService
  }

  public static clearServices(
    accessoryWrapper: HomebridgeAccessoryWrapper<SoundTouchDevice>
  ) {
    accessoryWrapper.removeService(
      accessoryWrapper.Service.Speaker,
      'volumeService'
    )
  }

  public getVolumeCharacteristic(): Characteristic {
    const Characteristic = this.accessoryWrapper.Characteristic
    return this.service.getCharacteristic(Characteristic.Volume)
  }

  public getMuteCharacteristic(): Characteristic {
    const Characteristic = this.accessoryWrapper.Characteristic
    return this.service.getCharacteristic(Characteristic.Mute)
  }
}
