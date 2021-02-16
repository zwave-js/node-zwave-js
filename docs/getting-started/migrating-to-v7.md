# Migrating to v7

In version 7.x we got rid of some old habits, leading to several breaking changes. Follow this guide if you're migrating to v7:

## No automatic query of all node values when restarting from cache

This legacy behavior resulted in a lot of traffic and delays when the driver was restarted, often doing many unnecessary queries. To reduce the strain on battery devices and to keep the network as responsive as possible, we've opted not to do this anymore when a node was previously interviewed.  
If you need to manually update values, you can do that on demand with [`node.refreshValues()`](../api/node.md#refreshValues) or [`node.refreshCCValues()`](../api/node.md#refreshCCValues).

## Corrected parsing of Node Information Frames (NIF), reworked node properties

The old parsing code was based on reverse-engineering, best-effort guesses and looking at what OpenZWave did. We've reworked/fixed the parsing code to match the specifications and changed node properties to make more sense:

-   `isFrequentListening` was changed to have the type `FLiRS = false | "250ms" | "1000ms"` (previously `boolean`) to indicate the wakeup frequency.
-   `maxBaudRate` was renamed to `maxDataRate`, the type `Baudrate` was renamed to `DataRate`
-   The property `supportedDataRates` was added to provide an array of supported data rates
-   The 100kbps data rate is now detected correctly
-   The `version` property was renamed to `protocolVersion` and had its type changed from `number` to the enum `ProtocolVersion` (the underlying values are still the same).

-   The `isBeaming` property was renamed to `supportsBeaming` to better show its intent
-   The `supportsSecurity` property was split off from the `isSecure` property because they have a different meaning.
-   The mutually exclusive `isRoutingSlave` and `isController` properties were merged into the new `nodeType` property.
-   The old `nodeType` and `roleType` properties were renamed to `zwavePlusNodeType` and `zwavePlusRoleType` to clarify that they refer to Z-Wave+.
