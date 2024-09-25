# Frequently Asked Questions

## Does Z-Wave JS support secondary controllers?

Mostly.

Slightly longer answer:\
On startup, Z-Wave JS detects whether the Z-Wave module it controls is a primary controller or a secondary/inclusion controller.

Its default operation mode is acting as a **primary controller**, or assuming that role if there is none in the network. In this mode, it supports **having secondary controllers in the network**. This includes:

- Including/excluding a secondary controller
- Letting secondary controllers (inclusion controllers) include and exclude devices
- Perform network key exchange with devices included by a secondary controller

Z-Wave JS also supports joining other networks as a **secondary controller**. This mode is not meant for controlling a smart home, because reports are sent to the primary controller.

> [!WARNING] Secondary controller support is still experimental and has some limitations:
>
> - Including devices on behalf of the primary controller does not work
> - Devices won't be interviewed by default. Triggering an interview manually may set up the lifelines incorrectly.
