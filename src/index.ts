export {
  createHaptics,
  type Haptics,
  type HapticsOptions,
  type HapticsPluginLike,
  type ImpactStrength,
  type NotificationKind,
} from './haptics.js'
export {
  type AppLifecycle,
  type AppLifecycleOptions,
  type AppPluginLike,
  type BackHandler,
  createAppLifecycle,
  type LifecycleState,
  type PluginListenerHandleLike,
} from './lifecycle.js'
export {
  decideOrientation,
  type OrientationDecision,
  type PreferredOrientation,
} from './orientation.js'
export {
  classifyDevice,
  classifyFormFactor,
  classifyFrame,
  classifyOrientation,
  type DevicePlatform,
  type DeviceProfile,
  EXPANDED_MIN_SHORT_EDGE,
  type FormFactor,
  type FrameClass,
  isFoldableOpen,
  NEAR_SQUARE_MAX_ASPECT,
  readViewportFacts,
  TABLET_MIN_SHORT_EDGE,
  type ViewOrientation,
  type ViewportFacts,
} from './profile.js'
export {
  applySafeAreaVariables,
  readSafeAreaInsets,
  type SafeAreaInsets,
  type SafeAreaWatchOptions,
  watchSafeArea,
  ZERO_INSETS,
} from './safeArea.js'
