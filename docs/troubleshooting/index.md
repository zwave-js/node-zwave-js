# Troubleshooting

Z-Wave is a complex protocol and many things can go wrong in the communication. While there may be a problem with `zwave-js`, many issues are due to misbehaving or misconfigured devices and/or network connectivity problems. Please follow this guide **before** opening issues.

## Rule #1: Use the driver log, Luke!

Many, many, many issues can **only** be sorted out by looking at driver logs. Try to familiarize yourself with them - it will help.  
Unless you are inquiring about a missing device configuration, you **should** have a driver log at hand. Also, make sure you have the correct log!

<details>
<summary>Click here for examples how the log looks like</summary>

Here's an example how this **DOES** look like (correct log, correct loglevel):

```log
2021-10-15T16:16:56.984Z DRIVER   starting driver...
2021-10-15T16:16:56.997Z DRIVER   opening serial port COM5
2021-10-15T16:16:57.128Z DRIVER   serial port opened
2021-10-15T16:16:57.129Z SERIAL » [NAK]                                                                   (0x15)
[...]
2021-10-15T16:16:59.887Z DRIVER » [Node 012] [REQ] [SendDataBridge]
                                  │ source node id:   1
                                  │ transmit options: 0x25
                                  │ route:            0, 0, 0, 0
                                  │ callback id:      1
                                  └─[NoOperationCC]
2021-10-15T16:16:59.888Z CNTRLR   [Node 029] The node is asleep.
```

Here's how it **DOES NOT** look like. This is an **application log** from `zwavejs2mqtt`:

```log
2021-08-04 15:56:59.250 INFO MQTT: MQTT is disabled
2021-08-04 15:56:59.503 INFO ZWAVE: Connecting to /dev/ttyACM0
2021-08-04 15:57:09.381 INFO ZWAVE: Zwave driver is ready
2021-08-04 15:57:09.387 INFO ZWAVE: Controller status: Driver ready
```

</details>

## Rule #2: Thou shalt only use the "debug" level

There are multiple log levels, but **only** the "debug" level contains enough info for troubleshooting.

<details>
<summary>Click here for another counter example</summary>

This is a driver log, but on the **wrong loglevel** (`info`):

```log
2021-10-15T17:25:06.701Z CNTRLR   [Node 001] The node is alive.
2021-10-15T17:25:06.701Z CNTRLR   [Node 001] The node is ready to be used
2021-10-15T17:25:06.702Z CNTRLR » [Node 012] pinging the node...
2021-10-15T17:25:06.727Z CNTRLR   [Node 029] The node is asleep.
2021-10-15T17:25:06.729Z CNTRLR   [Node 029] The node is ready to be used
2021-10-15T17:25:06.730Z CNTRLR   [Node 030] The node is asleep.
2021-10-15T17:25:06.731Z CNTRLR   [Node 030] Beginning interview - last completed stage: ProtocolInfo
2021-10-15T17:25:06.732Z CNTRLR » [Node 030] querying node info...
2021-10-15T17:25:06.757Z CNTRLR   [Node 012] The node is alive.
2021-10-15T17:25:06.758Z CNTRLR   [Node 012] The node is ready to be used
2021-10-15T17:25:06.758Z CNTRLR « [Node 012] ping successful
2021-10-15T17:25:12.800Z CNTRLR « [Node 029] received wakeup notification
2021-10-15T17:25:12.804Z CNTRLR   [Node 029] The node is now awake.
2021-10-15T17:25:13.807Z CNTRLR » [Node 029] Sending node back to sleep...
2021-10-15T17:25:13.833Z CNTRLR   [Node 029] The node is now asleep.
```

</details>

## Rule #3: When in doubt, re-interview

The **interview** is the process of the driver figuring out the capabilities of a device. It is possible that something went wrong the first time and the driver operates on incorrect information. To make the driver forget what it knows about a device and start over, you can re-interview it (`refreshInfo`). This **does not** mean excluding and including again!

Sometimes this is also necessary to pick up changed device config files or repair incorrect associations.

---

## Common issues {docsify-ignore}

Now that we got this out of the way, here's a collection of **common** issues and how to solve them.

🐛 [Connectivity issues](troubleshooting/connectivity-issues.md) (unreliable communication, slow network, no responses from devices, etc.)

🐛 [Problems with 700 series sticks](troubleshooting/otw-upgrade.md)

🐛 [Missing updates from a device](troubleshooting/no-updates.md), e.g. when toggling it physically

🐛 [Configuration parameters are missing or wrong](troubleshooting/missing-config-params.md)

🐛 [A device is not identified (unknown product)](troubleshooting/unidentified-device.md)

🐛 [A lock (or any secure device) cannot be controlled](troubleshooting/lock-uncontrollable.md)

🐛 [Some values are missing](troubleshooting/missing-values.md)
