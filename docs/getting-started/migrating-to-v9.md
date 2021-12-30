# Migrating to v9

The recent rewrite of the message queue made it much simpler to support use cases that go beyond executing a simple Serial API command.
Examples are requesting Security S0 nonces (which was relatively convoluted before), handling other multi-step commands, as well as the ability to time individual commands.

The latter allows us to be more spec-compliant in that we now time out much faster while waiting for a response to a GET request. Since this required a breaking change, we use the opportunity to collect some more breaking changes in version 9.x.

## Faster timeout while waiting for a response to a GET request

Previously, we waited for a fixed 10 seconds after a GET request was acknowledged. Now we measure the round trip time (RTT) and wait _RTT + 1 second_ before timing out like the Z-Wave specifications recommend. This makes for a much snappier experience, but means we had to change the range and default of the driver option `timeouts.report`.

Previously this had a range of `1000-40000 ms` with a default of `10000`, now it has a range of `500-10000 ms` and a default of `1000`. If your application allows to configure this, you might have to change the validation.

## Removed the unsupported `route` parameter from `SendDataBridgeRequest`

It has been found that no relevant version of the Serial API uses this parameter. The corresponding parameter has therefore been removed from `SendDataBridgeRequest`. To override the route used by the protocol, **Application Priority Routes** (not supported yet) have to be used.

## Rename properties and methods of the `Controller` class (and related message classes)

While working on the SmartStart feature it was noticed that some properties and methods of the `Controller` class and by extension some of the message classes had a misleading name. This has been fixed in version 9. The individual changes are:

-   Renamed the `libraryVersion` property to `sdkVersion` because it references the Z-Wave SDK version. This affects the `Controller` and the `GetControllerVersionResponse` classes.
-   Renamed the `serialApiGt(e)` and `serialApiLt(e)` methods to `sdkVersionGt(e)` and `sdkVersionLt(e)` respectively. These methods were checking the Z-Wave SDK version and not the Serial API which is versioned differently. This affects the `Controller` class.
-   Renamed the `SerialAPIVersion` type to `SDKVersion`.
-   Renamed the `serialApiVersion` property to `firmwareVersion`, because it was referring to a Z-Wave Stick's firmware version and not the Serial API version. This affects the `Controller` and the `GetSerialApiCapabilitiesResponse` classes.

## Converted the `isControllerNode` method on the `ZWaveNode` class to a readonly property

While there is no hard style guide governing this, we tend to use readonly properties for static things like a node's IDs and methods for (potentially) dynamic things like endpoint counts. Since the controller node ID doesn't change during usage, this feels more "correct".
