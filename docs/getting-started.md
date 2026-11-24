---
title: Getting started
description: Install capacitor-device-profile and wire it to Capacitor.
---

## Install

```sh
pnpm add capacitor-device-profile
pnpm add @capacitor/app @capacitor/device @capacitor/haptics @capacitor/core
```

Use maintained Node.js 22, 24 or 26 for tooling. React 18 or 19 is an optional peer dependency, needed only for
`capacitor-device-profile/react`. The package ships native ESM and CommonJS entry points with
format-correct TypeScript declarations.

## Classify the device

```ts
import { classifyDevice, readViewportFacts } from 'capacitor-device-profile'

const profile = classifyDevice(readViewportFacts(window))
// { formFactor: 'phone' | 'foldable-open' | 'tablet' | 'desktop', frame, orientation, ... }
```

In React, `useDeviceProfile` keeps the profile live, so a fold or unfold re-classifies without a reload:

```tsx
import { Device } from '@capacitor/device'
import { useDeviceProfile } from 'capacitor-device-profile/react'

function App() {
  const profile = useDeviceProfile({ loadPlatform: () => Device.getInfo() })
  return <Layout form={profile.formFactor} />
}
```

## Respect the orientation rule

```ts
import { decideOrientation } from 'capacitor-device-profile'

const { promptRotate, target } = decideOrientation(profile, 'landscape')
if (promptRotate) showRotateHint(target)
```

## Track the safe area

```ts
import { watchSafeArea } from 'capacitor-device-profile'

const stop = watchSafeArea({ onChange: (insets) => layoutToolbar(insets) })
// CSS: padding-top: var(--safe-top);
```

## Keep touch zones out of the system's gesture strips

Android's home and quick-switch gestures cannot be opted out of, and its back gesture swipes in from
both side edges, so a touch zone that starts at the glass's edge loses touches to the system. No web
API reports those strips, so the app registers a small native plugin and passes it in; this package
converts its physical pixels to CSS pixels and falls back where nothing reports.

```ts
import { registerPlugin } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { type GestureInsetsPluginLike, watchGestureInsets } from 'capacitor-device-profile'

const systemGestureInsets = registerPlugin<GestureInsetsPluginLike>('SystemGestureInsets')

const stop = watchGestureInsets({
  plugin: systemGestureInsets,
  platform: (await Device.getInfo()).platform,
  onChange: ({ source, insets }) => {
    // `source` is 'native', 'safe-area' (iOS: the home indicator) or 'none' (nothing reported).
    const side = source === 'native' ? 0 : MY_OWN_SIDE_GUARD
    moveZone.setInsets({
      left: insets.left + side,
      right: insets.right + side,
      bottom: insets.bottom,
    })
  },
})
// CSS: padding-left: var(--gesture-left);
```

In React, `useGestureInsets({ plugin, platform })` returns the same reading and keeps it live. The
first reading is the platform fallback; the native one replaces it when the plugin answers. Pass the
plugin from module scope, as above, so the watch is not restarted on every render.

The plugin is app-owned native code, kept out of this package so it pins no Capacitor version. For
Android it is one class: copy it into the app's own Java sources (under the app's package, which
replaces `your.app.package` below) and register it in `MainActivity` before `super.onCreate`.

```java
package your.app.package;

import android.graphics.Insets;
import android.os.Build;
import android.view.WindowInsets;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemGestureInsets")
public class SystemGestureInsetsPlugin extends Plugin {

  @PluginMethod
  public void getGestureInsets(PluginCall call) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
      call.unavailable("System gesture insets need Android 11 or later.");
      return;
    }
    // View reads belong on the main thread; plugin methods are called from another one.
    getActivity().runOnUiThread(() -> {
      WindowInsets window = getBridge().getWebView().getRootWindowInsets();
      if (window == null) {
        // The WebView is not attached to a window yet.
        call.unavailable("The window insets are not available yet.");
        return;
      }
      Insets all = window.getInsets(WindowInsets.Type.systemGestures());
      Insets mandatory = window.getInsets(WindowInsets.Type.mandatorySystemGestures());
      JSObject result = edges(all);
      result.put("mandatory", edges(mandatory));
      result.put("density", getContext().getResources().getDisplayMetrics().density);
      call.resolve(result);
    });
  }

  private static JSObject edges(Insets insets) {
    JSObject edges = new JSObject();
    edges.put("left", insets.left);
    edges.put("right", insets.right);
    edges.put("bottom", insets.bottom);
    return edges;
  }
}
```

```java
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(SystemGestureInsetsPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
```

The class compiles against the Android 16 platform API and the Capacitor 8 plugin signatures. Before
Android 11 it rejects and the reading falls back to `none`. To leave the side edges to the game
during play, the app can also pass exclusion rects to the system
(`View.setSystemGestureExclusionRects`); then only `mandatory` still applies.

## Lifecycle and haptics

```ts
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Haptics } from '@capacitor/haptics'
import { createAppLifecycle, createHaptics } from 'capacitor-device-profile'

const native = Capacitor.isNativePlatform()
const lifecycle = createAppLifecycle({ app: App, native, onPause: saveDraft, onResume: refresh })
const haptics = createHaptics({ plugin: Haptics, native })

const removeBackHandler = lifecycle.pushBackHandler(() => {
  if (!menu.isOpen) return false
  menu.close()
  return true
})

haptics.impact('medium')
```

In a native shell the calls go to Capacitor's plugin. On the web they fall back to `navigator.vibrate`
where the browser has it (after the player's first interaction with the page); iOS Safari has no
Vibration API, so there they do nothing. Pass `vibrate` to supply your own function instead.

Call `lifecycle.dispose()` and the safe-area disposer when the app tears down.
