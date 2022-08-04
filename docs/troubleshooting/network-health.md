# Improving the network health

Only a strong and healthy Z-Wave network is a reliable Z-Wave network. Ensuring this consists of two parts.

## Testing the connection strength

A flaky connection will cause issues during usage and can compound other existing issues. Z-Wave JS can perform health checks test the physical connection strength between the controller and a node (or between two nodes). Whether this functionality is available depends on the application you use Z-Wave JS with, but at least [Zwavejs2Mqtt](https://github.com/zwave-js/zwavejs2mqtt) exposes it.

Such a health check will ping a node several times, and (if the node supports it) instruct it to ping the controller with varying TX power. This way, Z-Wave JS will determine the following things, not all of which may be supported by your combination of controller and nodes:

-   **Route changes**: During how many ping attempts a new route was needed. Should be as low as possible, ideally 0.
-   **Latency**: The maximum time it took to send a ping to the node. Should be as low as possible, <100 ms are good, ideally 10 ms (lower values cannot be measured).
-   **Failed pings (controller → node)**: How many pings from the controller were not acknowledged by the node. Should be 0, higher values indicate either a message loss between the controller and the node, or noise near the controller which causes the acknowledgements to get lost.
-   **Failed pings (node → controller)**: How many pings from the node were not acknowledged by the controller. Should be 0, higher values indicate either a message loss between the controller and the node, or noise near the node which causes the acknowledgements to get lost.
-   **Min. powerlevel without failures**: The minimum powerlevel where all pings from the node were acknowledged by the controller. Should be \< -6 dBm (or > +6 dBm if the application reports the _reduction_ in powerlevel). Ideally -9 dBm, "normal powerlevel" is bad (equals 0 dBm).
-   **SNR margin**: An estimation of the Signal-to-Noise Ratio Margin, the difference between the background RSSI and the measured RSSI of acknowledgements. Should be > 17 dBm, lower values indicate excessive noise.

If the test results show high variance in some of these values or measurements that are far from the ideal, it may be necessary to add additional repeaters, eliminate sources of noise or move devices around. If you have access to the route statistics (which routes are actually used), it makes sense to check all nodes along a route to determine where issues appear.

## Optimizing the reporting configuration

Even with a strong mesh, badly configured devices can be the death of a Z-Wave network. Unfortunately, many devices come with a pretty bad default configuration, which can quickly be a problem in medium to large networks. Z-Wave is not made for high throughput, yet it is possible to generate a constant network load of 5-10+ messages per second, which is absolutely devastating. A message flood like this can cause the controller to get jammed, preventing it from responding/acknowledging commands. However, many devices handle a missing acknowledgement by re-transmitting their last command, making the issue even worse.

> [!NOTE] This can typically be detected by looking at the statistics for a node. Very high numbers of incoming reports (e.g. several thousands while others have only a handful) are a good indicator that they are misconfigured.

As such, tuning the reporting configuration of all devices is crucial, especially for multisensors and power meters, which tend to be the worst offenders. Here are a few best practices we've found over time, just keep in mind that not all of these settings may be supported by your devices:

1. **Turn off unnecessary reports**. If you only monitor the energy usage (`kWh`) of a single socket of a 5-port plug, but it supports reporting `W`, `kWh`, `V` and `A` on all sockets, you can easily cut the number of reports by a factor of 20 (a single report instead of 5 sockets times 4 reports per socket).
1. **Prefer reporting on changes over timed reports**. Being reminded every 5 seconds that a device still does not use power does not add any value, but stresses the network. Instead, configure your devices to report when the power usage changes by more than a certain (significant!) amount. This amount may be as low as 1 W for an LED bulb, but 50+ W for a washing machine. Tuning this depends on the device - too low and there will be too many reports, too high and your measurement history will be inaccurate.
1. **Use timed reports only as fallbacks**. You might still want to have timed reports in case a change report does not find its way to the controller. In that case, choose a high enough interval to prevent floods from many devices reporting at once, e.g. once per hour.
1. Alternatively: **Choose a high reporting interval**. Not all devices support reporting everything on change only. In these cases, you must make sure to prevent floods by choosing a sane (high enough) reporting interval.
1. **Turn off supervision for non-crucial reports**. More modern devices support sending their reports with supervision, which requests a confirmation from the controller that it received and handled the command. While this makes sense for fire/water alarms and such, some devices enable this for power meters. As a result, every single report causes two messages to be exchanged instead of one. This feature should be disabled unless you really need to make sure that commands are received.
1. **Do not use Security S0 for sensors**. S0 is very inefficient and devices using S0 need to exchange three commands for each report. If encryption is critical, use devices that support S2, otherwise stick to not using encryption. The only exception is if your device frequently reports nonsensical values (like water usage on a power meter), which can happen when commands get corrupted on air. S0 (and S2) prevents this. If possible, configure your device to use CRC-16 encapsulation instead, which doesn't require additional messages.
