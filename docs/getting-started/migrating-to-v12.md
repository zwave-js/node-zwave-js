# Migrating to v12

A bit earlier than expected, but there were some necessary breaking changes queueing up. And with the upcoming end-of-life of Node.js 16, it's now time to get them out of the way.

## Require Node.js 18+, switch to TypeScript's module resolution strategy `node16`

Node.js 16 will reach its end-of-life on [September 11th, 2023](https://nodejs.org/en/blog/announcements/nodejs16-eol) due to OpenSSL 1.1.1's end-of-life. Due to the security implications, we've decided to drop support and require Node.js 18 from now on.

Aside from the runtime changes, this has implications for applications using TypeScript or it's type-checking capabilities. The new module resolution strategy `node16` is now used, which better mimicks what Node.js actually does, including evaluating the `exports` field in `package.json`, which Z-Wave JS now also uses.

This means applications have to switch to `moduleResolution: "node16"` too, which can cause issues with other dependencies if their `exports` aren't set up correctly, e.g. hybrid CJS/ESM packages with a single `.d.ts` file for both. As described in [the TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/esm-node.html#packagejson-exports-imports-and-self-referencing), hybrid packages need a separate `.d.ts` file for the `ESM` and `CommonJS` entry points, even if their content is identical.\
Unfortunately, affected dependencies have to be fixed, like [in this example](https://github.com/express-rate-limit/express-rate-limit/issues/355). Short-term workarounds can be enabled by `yarn`'s [patch feature](https://yarnpkg.com/cli/patch).

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

## `ZWaveHost.getNextSupervisionSessionId` requires a node ID now

This change only concerns custom implementations of the `ZWaveHost` interface and should not affect most users/codebases. The `Supervision` session IDs must be tracked per node now and not globally:

```diff
interface ZWaveHost {
	// ...
-	getNextSupervisionSessionId(): number;
+	getNextSupervisionSessionId(nodeId: number): number;
}
```
