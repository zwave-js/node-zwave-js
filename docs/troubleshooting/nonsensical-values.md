# Nonsensical values appear randomly

... like water flow sensors on an electrical outlet, or CO<sub>2</sub> readings on a motion sensor.

## Why does this happen?

This issue is a bit more technical, so let's try to understand it first.

Z-Wave has 3 transmission speeds, 100, 40 and 9.6 kbit/s. Some legacy devices only support 40 and 9.6 kbit/s, but even for modern devices these speeds may be used as fallbacks when 100 kbit/s is failing due to bad signal quality or noise/interference.

Z-Wave frames (the data that gets transmitted between devices) can roughly be seen as a sequence of bytes, followed by a checksum. For 40 and 9.6 kbit/s transmission speeds, this "checksum" is simply all payload bytes [`XOR`-ed together](https://en.wikipedia.org/wiki/Checksum#Parity_byte_or_parity_word). Only 100 kbit/s uses a proper [CRC16](https://en.wikipedia.org/wiki/Cyclic_redundancy_check#) to detect errors. The issue with this `XOR`-checksum is that it does not detect if an even number of bits flip in the same location across multiple bytes.

This (example) frame

```
01010101 11111111 10001000
```

has the same checksum as this frame

```
11010111 01111111 10001010
^--------^----------------- flipped!
      ^-----------------^-- flipped!
```

which means they both get accepted by the stick, although the 2nd one is garbage. Another possibility is that the checksum itself gets changed "on air".

Under normal circumstances this doesn't happen very often, since it is not very likely that the same bits flip in multiple bytes, except in noisy environments where...

-   ...devices are more often forced to use the slower speeds, which are susceptible to this issue
-   ...more noise increases the chance of bits flipping, which makes it more likely for such an error to be undetected.

Now what can happen as a result when these seemingly correct packets are accepted?

-   The sending node ID is incorrect, attributing commands to the wrong node
-   The Command Class (CC) gets changed, so the entire command means something completely different (e.g. `Central Scene (0x5b)` -> `Device Reset Locally (0x5a)`)
-   The Command Class's command gets changed (e.g. `SET` instead of `GET`)
-   A meter/sensor type, scale or encoding gets changed (e.g. `W` -> `kWh`, or **Brightness** -> **Water consumption**, or `10.01` -> `1001`)
-   etc...

Many of these are detected as invalid commands by Z-Wave JS already, for example:

-   The CC or CC command is now unknown
-   The CC or CC Command changed, and the payload is now too short or incompatible with what's expected for that command
-   A meter/sensor report does not match what the device reported as supported during the interview (e.g. the device only claimed to support **Brightness**, but now reports **Water consumption**)

All of these will automatically be dropped/ignored by Z-Wave JS. Unfortunately, not everything can be detected as incorrect:

-   The CC was changed so the payload is now too long, but seemingly compatible with the expected format. This is necessary to support when a node uses a newer CC version than what's implemented in Z-Wave JS.
-   The sending node supports an older version of the `Meter` or `Multilevel Sensor CC` that do not support querying which meters/sensors the device supports. So we just have to accept them all, or we'd potentially discard valid readings.
-   Meter/sensor readings with nonsensical values. A human easily sees that a value cannot be correct, but the driver would have to know more meta information about a device to be able to do that.

## What can be done about it?

1. Follow the [general troubleshooting](troubleshooting/connectivity-issues.md#general-troubleshooting) recommendations to avoid interference at the controller.
1. Check the background noise in your network, near the controller and reporting nodes. If that's high, find countermeasures. **Z-Wave JS UI** for example has [some tools](https://zwave-js.github.io/zwave-js-ui/#/usage/nodes_healthcheck) to do this.
1. [Reduce the reporting frequency of devices](troubleshooting/network-health.md#optimizing-the-reporting-configuration). Less noise and less packets that can be corrupted.
1. Include problematic devices with encryption. This will make sure that the payload is unchanged, and since the encryption is node-specific this will also prevent commands being attributed to other nodes, simply because it cannot be decrypted in that case:
    - Prefer `Security S2` if supported by the device (Z-Wave JS automatically chooses this when using the default inclusion method)
    - Otherwise, use `Security S0`. Note that this isn't generally recommended due to the communication overhead, but it can help in this case.
1. As an alternative to encryption, configure supporting devices to use the `CRC16 CC` for transmitting. That adds an additional checksum which should spot errors inside the payload. It won't detect cases where only the node ID and other protocol bytes get scrambled though.
