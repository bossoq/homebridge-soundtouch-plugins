import {
  API,
  APIDiscovery,
  compactMap,
  Info,
  SourceStatus,
} from 'soundtouch-api'
import { apiNotFoundWithName } from './errors'
import { isVerboseInConfigs, stringUpperCaseFirst } from './utils'
import {
  AccessoryConfig,
  GlobalConfig,
  PresetConfig,
  SoundTouchDevice,
  SoundTouchPreset,
  SoundTouchSource,
  SourceConfig,
  VolumeMode,
} from './types'
import { Logging } from 'homebridge'

export const searchAllDevices = async (
  globalConfig: GlobalConfig,
  accessoryConfigs: AccessoryConfig[],
  log: Logging
): Promise<SoundTouchDevice[]> => {
  const apis = await APIDiscovery.search()
  return Promise.all(
    apis.map(async (api) => {
      const info = await api.getInfo()
      const accessoryConfig = accessoryConfigs.find(
        (ac) => ac.room === info.name || ac.ip === api['host']
      )
      return _deviceFromApi(api, info, globalConfig, accessoryConfig || {}, log)
    })
  )
}

export const deviceFromConfig = async (
  globalConfig: GlobalConfig,
  accessoryConfig: AccessoryConfig,
  log: Logging
): Promise<SoundTouchDevice> => {
  let api: API
  if (accessoryConfig.ip) {
    api = new API(accessoryConfig.ip, accessoryConfig.port)
  } else if (accessoryConfig.room) {
    api = await APIDiscovery.find(accessoryConfig.room)
    if (!api) throw apiNotFoundWithName(accessoryConfig.name)
  }
  return _deviceFromApi(
    api,
    await api.getInfo(),
    globalConfig,
    accessoryConfig,
    log
  )
}

export const _deviceFromApi = async (
  api: API,
  info: Info,
  globalConfig: GlobalConfig,
  accessoryConfig: AccessoryConfig,
  log: Logging
): Promise<SoundTouchDevice> => {
  const displayName = accessoryConfig.name || info.name
  const isVerbose = isVerboseInConfigs(globalConfig, accessoryConfig)
  const pollingInterval =
    accessoryConfig.pollingInterval || globalConfig.pollingInterval
  if (isVerbose) log(`[${displayName}] found device`)
  const component = info.components.find(
    (c) => c.serialNumber.toLowerCase() === info.deviceId.toLowerCase()
  )
  const presets = await _availablePresets(
    api,
    displayName,
    accessoryConfig.presets,
    globalConfig.presets,
    isVerbose ? log : undefined
  )
  const sources = await _availableSources(
    api,
    displayName,
    accessoryConfig.sources,
    globalConfig.sources,
    isVerbose ? log : undefined
  )
  const globalVolume = globalConfig.volume || {}
  const accessoryVolume = accessoryConfig.volume || {}
  const onValue = globalVolume.onValue || accessoryVolume.onValue
  return {
    api: api,
    name: displayName,
    id: info.deviceId,
    model: info.type,
    version: component ? component.softwareVersion : undefined,
    verbose: isVerbose,
    pollingInterval: pollingInterval,
    volumeSettings: {
      onValue: onValue || -1,
      maxValue: globalVolume.maxValue || accessoryVolume.maxValue || 100,
      unmuteValue:
        globalVolume.unmuteValue ||
        accessoryVolume.unmuteValue ||
        onValue ||
        35,
      mode: globalVolume.mode || accessoryVolume.mode || VolumeMode.lightbulb,
    },
    presets: presets,
    sources: sources,
  }
}

export const deviceIsOn = async (
  device: SoundTouchDevice
): Promise<boolean> => {
  const nowPlaying = await device.api.getNowPlaying()
  return nowPlaying.source !== SourceStatus.standBy
}

const _availablePresets = async (
  api: API,
  deviceName: string,
  accessoryPresets: PresetConfig[],
  globalPresets: PresetConfig[],
  log?: Logging
): Promise<SoundTouchPreset[]> => {
  const presets = (await api.getPresets()) || []
  return compactMap(presets, (preset) => {
    const presetConfig = _findConfig(
      (p) => p.index === preset.id,
      accessoryPresets,
      globalPresets
    ) || { index: preset.id }
    if (log !== undefined)
      log(
        `[${deviceName}] found preset n°${preset.id} '${preset.contentItem.itemName}' on device`
      )
    if ((<PresetConfig>presetConfig).enabled === false) return undefined
    return {
      name: (<PresetConfig>presetConfig).name || preset.contentItem.itemName,
      index: preset.id,
    }
  })
}

const _availableSources = async (
  api: API,
  deviceName: string,
  accessorySources?: SourceConfig[],
  globalSources?: SourceConfig[],
  log?: Logging
): Promise<SoundTouchSource[]> => {
  const sources = await api.getSources()
  const localSources = sources.items.filter((s) => s.isLocal)
  return localSources.map((source) => {
    if (log !== undefined)
      log(
        `[${deviceName}] found local source '${source.source}' with account '${source.sourceAccount}' on device`
      )
    const sourceConfig = _findConfig(
      (p) =>
        p.source === source.source &&
        (p.account !== undefined ? p.account === source.sourceAccount : true),
      accessorySources,
      globalSources
    ) || { source: source.source }
    return {
      name:
        (<SourceConfig>sourceConfig).name ||
        `${deviceName} ${
          source.name ? source.name : stringUpperCaseFirst(sourceConfig.source)
        }`,
      source: sourceConfig.source,
      account: (<SourceConfig>sourceConfig).account,
      enabled: (<SourceConfig>sourceConfig).enabled,
    }
  })
}

const _findConfig = <Config>(
  predicate: (config: Config) => boolean,
  accessoryConfigs?: Config[],
  globalConfigs?: Config[]
): Config | undefined => {
  const config = accessoryConfigs ? accessoryConfigs.find(predicate) : undefined
  if (config !== undefined) return config
  return globalConfigs ? globalConfigs.find(predicate) : undefined
}
