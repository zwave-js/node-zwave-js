# Migrating to v6

In version 6.x we used the opportunity to do some housekeeping and collect several breaking changes. Follow this guide if you're migrating to v6:

## Logging environment variables

The environment variables for logging are no longer evaluated lazily, so they now need to be set before requiring `zwave-js`. It is recommended to use the new [`logConfig` property](api/driver?id=logconfig) of the [driver options](api/driver?id=zwaveoptions) instead.

## Updated `interview failed` event handler signature

The second parameter (`errorMessage: string`) was replaced with an [object parameter](api/node?id=quotinterview-failedquot) that was previously the optional third parameter. If you are using the legacy signature with two params, replace the occurences of the error message with `args.errorMessage`. If you are using the transitional signature with three params, remove the second parameter.

## New `"value notification"` event

Some CCs (like `Central Scene`) have values that are only meaningful the instant they are received. These values are no longer persisted in the value DB and the `"value added" / "value updated" / "value removed"` events are no longer used. Instead, the new [`"value notification"` event](api/node?id=quotvalue-notificationquot) is used. You'll need to add a new event handler for these stateless values.

## Removed option `nodeInterviewAttempts`

The deprecated option `nodeInterviewAttempts` was removed. Use the option `attempts.nodeInterview` instead.

## Renamed storage options

The options `fs` and `cacheDir` have been renamed to `storage.driver` and `storage.cacheDir`.

## Revised retry strategy

The retry strategy for sending commands to nodes has been revised. By default, a message is no longer re-transmitted when the node has acknowledged its receipt, since it is unlikely that the retransmission will change anything.  
If you need to restore the old behavior, you can set the [`attempts.retryAfterTransmitReport` driver option](api/driver?id=zwaveoptions) to `true`.

## `ValueMetadataBase` and `ValueMetadataAny` types

These types were merged and renamed to `ValueMetadataBase`. What to do with that depends on your application.

## Changed `@zwave-js/config` exports

The `lookupXYZ` methods which could be used to access names of meters, notifications, etc. are no longer exposed by `@zwave-js/config`. Use the `configManager` property of your driver instance instead, which now exposes methods to do that.
