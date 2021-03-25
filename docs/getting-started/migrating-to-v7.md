# Migrating to v7

In version 7.x we got rid of some old habits, leading to several breaking changes. Follow this guide if you're migrating to v7:

## No automatic query of all node values when restarting from cache

This legacy behavior resulted in a lot of traffic and delays when the driver was restarted, often doing many unnecessary queries. To reduce the strain on battery devices and to keep the network as responsive as possible, we've opted not to do this anymore when a node was previously interviewed. This also means that the `"interview completed"` event is now only emitted after the initial interview and after manually-requested re-interviews, but not after each restart.

If you need to manually update values, you can do that on demand with [`node.refreshValues()`](api/node.md#refreshValues) or [`node.refreshCCValues()`](api/node.md#refreshCCValues).

To determine if a node can be interacted with, you should listen for the `ready` event instead.

## Corrected parsing of Node Information Frames (NIF), reworked node properties

The old parsing code was based on reverse-engineering, best-effort guesses and looking at what OpenZWave did. We've reworked/fixed the parsing code to match the specifications and changed node properties to make more sense:

-   `isFrequentListening` was changed to have the type `FLiRS = false | "250ms" | "1000ms"` (previously `boolean`) to indicate the wakeup frequency.
-   `maxBaudRate` was renamed to `maxDataRate`, the type `Baudrate` was renamed to `DataRate`
-   The property `supportedDataRates` was added to provide an array of supported data rates
-   The 100kbps data rate is now detected correctly
-   The `version` property was renamed to `protocolVersion` and had its type changed from `number` to the enum `ProtocolVersion`. The underlying values are also lowered by `1` to match the Z-Wave specifications, so a `version` of `4` corresponds to a `protocolVersion` of `3` (`"4.5x / 6.0x"`).
-   The `isBeaming` property was renamed to `supportsBeaming` to better show its intent
-   The `supportsSecurity` property was split off from the `isSecure` property because they have a different meaning.
-   The mutually exclusive `isRoutingSlave` and `isController` properties were merged into the new `nodeType` property.
-   The old `nodeType` and `roleType` properties were renamed to `zwavePlusNodeType` and `zwavePlusRoleType` to clarify that they refer to Z-Wave+.

## Reworked `"notification"` event

This event serves a similar purpose as the `"value notification"` event (which was introduced later), but it was historically only used for the `Notification CC`. These events tend to contain more complicated data than the relatively simple `"value notification"` event, which is why it was kept separate.

Since the original implementation, the need for a more versatile CC-specific notification event has arisen. Therefore we decided to rework this event and decouple it from the `Notification CC`. As a result, the event callback now indicates which CC raised the event and its arguments are moved into a single object parameter.

See the [`"notification"` event](api/node#quotnotificationquot) docs for a detailed description what changed.

## `Endpoint` constructor changed

The `Endpoint` needed to be modified in order to include the device class information. To be in line with the existing `ZWaveNode` constructor, the additional argument was added **before** the last one:

```diff
	public constructor(
		/** The id of the node this endpoint belongs to */
		public readonly nodeId: number,
		/** The driver instance this endpoint belongs to */
		protected readonly driver: Driver,
		/** The index of this endpoint. 0 for the root device, 1+ otherwise */
		public readonly index: number,
+		deviceClass?: DeviceClass,
		supportedCCs?: CommandClasses[],
	)
```

Unless you need the constructor outside of `zwave-js` for some obscure reason, this should not affect you.
