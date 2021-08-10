# UI guidelines for S2 inclusion

Including devices with _Security S2_ has some very specific requirements, which also includes the UI. We try to give application developers some guidance here.

## Inclusion strategy

Z-Wave JS offers multiple ways to include a device, but we only recommend a few of them. For most use cases, the **default** inclusion strategy should be enough. For modern devices, **SmartStart** makes the inclusion even easier for the user due to not requiring interaction during the inclusion process. If you absolutely must, you can force unencrypted communication. A UI to choose the inclusion strategy could look as follows:
![Inclusion strategies](../_images/s2-inclusion-selection.png)

## Granting security classes

When using the default strategy and including a device with S2, the user must choose which security classes (network keys) to grant the joining node. Because this can be very confusing unless you have a good understanding of what these things mean, we recommend to explain the different options. A device might not request all possible security classes, so only the ones that are should be selectable. This could look like this:
![Granting security classes](../_images/s2-grant-keys.png)

This dialog MUST be shown when `zwave-js` calls the `grantSecurityClasses` user callback.

> [!NOTE] This operation has a timeout of **240 seconds**. If no choice is made within this time, the inclusion process will be aborted. `zwave-js` will call the `abort` user callback, so applications can react.

## Validating the DSK and entering the device PIN

For authentication inclusion (`Authenticated` and `Access Control`), users MUST validate that they are including the correct device.
To do so, the DSK must be presented to the user along with a text field to enter the 5-digit PIN. This PIN is the missing first part of the DSK, so the text field should be presented in a way that makes this obvious. We recommend a UI like this:
![DSK validation](../_images/s2-dsk-pin.png)

This dialog MUST be shown when `zwave-js` calls the `validateDSKAndEnterPIN` user callback.

> [!NOTE] This operation has a timeout of **240 seconds**. If no choice is made within this time, the inclusion process will be aborted. `zwave-js` will call the `abort` user callback, so applications can react.
