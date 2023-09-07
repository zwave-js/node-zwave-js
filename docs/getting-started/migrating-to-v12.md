# Migrating to v12

A bit earlier than expected, but there were some necessary breaking changes queueing up. And with the upcoming end-of-life of Node.js 16, it's now time to get them out of the way.

## Require Node.js 18+, switch to TypeScript's module resolution strategy `node16`

Node.js 16 will reach its end-of-life on [September 11th, 2023](https://nodejs.org/en/blog/announcements/nodejs16-eol) due to OpenSSL 1.1.1's end-of-life. Due to the security implications, we've decided to drop support and require Node.js 18 from now on.

Aside from the runtime changes, this has implications for applications using TypeScript or it's type-checking capabilities. The new module resolution strategy `node16` is now used, which better mimicks what Node.js actually does, including evaluating the `exports` field in `package.json`, which Z-Wave JS now also uses.

This means applications have to switch to `moduleResolution: "node16"` too, which can cause issues with other dependencies if their `exports` aren't set up correctly, e.g. hybrid CJS/ESM packages with a single `.d.ts` file for both. As described in [the TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/esm-node.html#packagejson-exports-imports-and-self-referencing), hybrid packages need a separate `.d.ts` file for the `ESM` and `CommonJS` entry points, even if their content is identical.\
Unfortunately, affected dependencies have to be fixed, like [in this example](https://github.com/express-rate-limit/express-rate-limit/issues/355). Short-term workarounds can be enabled by `yarn`'s [patch feature](https://yarnpkg.com/cli/patch).

## Renamed _(network) heal_ to _rebuild routes_

It has been found that there is a lot of misconception about "healing" the network, be it outdated information, a too positive connotation of the word "heal" or simply not understanding what it can and cannot do. Contrary to popular belief, this process does not magically make the mesh better. If devices have a physically bad connection, assigning new routes will not help. In fact, it can make the situation worse by deleting routes that were found to be working and assigning other bad routes.\
Due to this, we're often faced with feature requests for automatically and regularly performing a network heal. While this is certainly doable, it's absolutely not a good idea.

In an attempt to mitigate, this process has been renamed to "rebuild routes", and the documentation has been updated to explain the process better. In summary, the following methods, properties and types have been renamed:

- `HealNodeStatus` → `RebuildRoutesStatus`
- `HealNetworkOptions` → `RebuildRoutesOptions`
- `Controller.isHealNetworkActive` → `Controller.isRebuildingRoutes`
- `Controller.beginHealingNetwork` → `Controller.beginRebuildingRoutes`
- `Controller.stopHealingNetwork` → `Controller.stopRebuildingRoutes`
- `Controller.healNode` → `Controller.rebuildNodeRoutes`

It is strongly suggested that applications update their UIs around this feature too, in order to manage expectations. A positive impression of the feature, e.g. by using positive icons like a band-aid, should be avoided.

## Reference the endpoint in `"notification"` events

Endpoints can send notifications, but when those were translated to `"notification"` events, the endpoint was not included in the event, only the node. To solve this, the first parameter of the event callback is now the endpoint that sent the notification. This can still be the node itself (which inherits from `Endpoint`), but this is no longer guaranteed.

```diff
type ZWaveNotificationCallback = (
-	node: ZWaveNode,
+	endpoint: Endpoint,
	ccId: CommandClasses,
	args: Record<string, unknown>,
): void;
```

## Reworked firmware update checks

Previously, checking whether a firmware update is available through the Z-Wave JS Firmware Update Service required waking up sleeping devices, because the device information was queried first. This can be difficult for sleeping devices that rarely wake up or are located in hard to reach spots. In addition, some Home Assistant users were having problems that their devices randomly responded with a corrupted fingerprint.

To solve this, the firmware update checks now use cached information, removing the need for frequent communication with nodes. Only when an update should be applied, Z-Wave JS validates that the device information matches the update.

To achieve this, the signature of `Controller.firmwareUpdateOTA` had to be changed. It now expects the full `FirmwareUpdateInfo` as the 2nd parameter, instead of just the individual files' info:

```diff
public async firmwareUpdateOTA(
	nodeId: number,
-	updates: FirmwareUpdateFileInfo[]
+	updateInfo: FirmwareUpdateInfo,
): Promise<FirmwareUpdateResult>;
```

Since `Controller.getAvailableFirmwareUpdates` returns an array of these, the firmware update process should now look roughly like this in application code:

```ts
// Check for updates
const updateInfos = await controller.getAvailableFirmwareUpdates(
	nodeId,
	options,
);
// Select one of the updates, e.g. though user input
const updateInfo = updateInfos[0];
// Apply the update
await controller.firmwareUpdateOTA(nodeId, updateInfo);
```

## Managing (custom/priority) return routes to the SUC (primary controller) must be done with the `...SUCReturnRoutes` methods

Managing return routes has been an inconsistent topic before. Since the protocol distinguishes between SUC return routes and return routes between end nodes, we do the same.
Previously, calling `assignReturnRoutes` (and similar) with the SUC (Z-Wave JS's node ID) as the destination would automatically do the correct thing and call `assignSUCReturnRoutes` (and similar). However, calling `deleteReturnRoutes` would not delete the SUC return routes, but the return routes between end nodes. This was inconsistent and confusing.

Attempting to manage the return routes to the SUC (where the destination node ID is `controller.ownNodeId`) without using the `...SUCReturnRoutes` methods will now throw an error, explaining which method to use instead.

## Removed some deprecated methods

The following methods were deprecated/renamed and have now been removed:

- `Controller.assignSUCReturnRoute`: Use `Controller.assignSUCReturnRoutes` instead
- `Controller.deleteSUCReturnRoute`: Use `Controller.deleteSUCReturnRoutes` instead
- `Controller.assignReturnRoute`: Use `Controller.assignReturnRoutes` instead
- `Controller.deleteReturnRoute`: Use `Controller.deleteReturnRoutes` instead
- `Driver.enableErrorReporting`: Error reporting has been fully removed

## Removed the controller's `supportsSoftReset` property

This was meant to increase reliability of the automatic soft-reset in certain setups, however we've learned a few things since then. First of all, there don't seem to be any issues with 700+ series sticks, so soft-reset is always enabled for those since `v11.10.1`. Most importantly though, if the automatic soft-reset failed once but usually works, it is near impossible for some users to clear this flag, so their stick never gets soft-reset even if it would be needed.

Therefore, this property and the checks around it are now removed. When soft-reset is not disabled through the config, 500 series sticks and older will now always be soft-reset, unless they are on the list of known problematic sticks.

## `ZWaveHost.getNextSupervisionSessionId` requires a node ID now

This change only concerns custom implementations of the `ZWaveHost` interface and should not affect most users/codebases. The `Supervision` session IDs must be tracked per node now and not globally:

```diff
interface ZWaveHost {
	// ...
-	getNextSupervisionSessionId(): number;
+	getNextSupervisionSessionId(nodeId: number): number;
}
```

## Changed type of `encoding` parameters in `FileSystem` interface

While upgrading dependencies, the interface for the replacement `FileSystem` implementations had to be changed. The `encoding` parameter of `readFile` and `writeFile` is now a `BufferEncoding` instead of a `string`, which limits the possible values to

- `ascii`
- `utf8`
- `utf-8`
- `utf16le`
- `ucs2`
- `ucs-2`
- `base64`
- `base64url`
- `latin1`
- `binary`
- `hex`
