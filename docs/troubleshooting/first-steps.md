# First steps

A lot of reliability problems with Z-Wave networks are caused by the same few underlying issues. Often, the symptoms may not even seem related to the source of the problem, like one device not working when another one is causing the problems.

Some examples:

→ Commands sometimes don't go through\
→ Nodes that go dead and come back alive\
→ Reports go missing\
→ Nodes that are close to the controller are missing from its neighbor list\
→ Nodes are vanishing from the controller's neighbor list

> Therefore, follow this guide before doing any further troubleshooting.

## Controller placement

Z-Wave sticks in particular are prone to interference by USB ports, especially by USB3 ports. The following video demonstrates the issue for Zigbee, but it applies to Z-Wave as well:

<iframe style="display: block; width: unset; min-width: 560px; margin: 0 auto" width="560" height="315" src="https://www.youtube-nocookie.com/embed/tHqZhNcFEvA?si=h4ZozM9-MjSXgT69" title="YouTube video player" frameborder="0" allow="encrypted-media; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

To avoid this, put the stick in a suitable location:

- on an **USB extension cord** (see video above)
- away from other USB ports
- in a central location in your home
- away from metallic surfaces
- and especially not in the back of a server rack

> [!NOTE] Make sure to heal the network after physically moving devices around!

If that alone doesn't help, eliminate external sources of RF interference or move the controller away from them. For example, these can be electrical appliances like microwaves, other USB devices like external drives, active USB adapters, etc.

Look at the Background RSSI readings to determine whether there is an elevated noise level. The average background RSSI should be as close as possible to the sensitivity limit of your radio:

- 500 series: around -90 dBm
- 700 series: around -100 dBm
- 800 series: around -110 dBm

## Reduce reports from the network

Even with a strong mesh, too much RF traffic can be the death of a Z-Wave network. While direct transmission can achieve a reasonably high throughput of 10-20 messages per second under good RF conditions, having this kind of load constantly and across multiple hops is absolutely devastating.

Unfortunately, many devices come with a pretty bad default reporting configuration, causing many unnecessary reports in short intervals. In combination with multi-hop routes and retransmission attempts, the number of messages the network has to handle can quickly become overwhelming. Additionally, some controller firmwares have bugs that cause additional routing attempts, further increasing the load.

As such, tuning the reporting configuration of all devices is crucial, especially for multisensors and power meters, which tend to be the worst offenders. Here are a few best practices we've found over time, just keep in mind that not all of these settings may be supported by your devices:

1. **Turn off unnecessary reports**. If you only monitor the energy usage (`kWh`) of a single socket of a 5-port plug, but it supports reporting `W`, `kWh`, `V` and `A` on all sockets, you can easily cut the number of reports by a factor of 20 (a single report instead of 5 sockets times 4 reports per socket).
1. **Prefer reporting on changes over timed reports**. Being reminded every 5 seconds that a device still does not use power does not add any value, but stresses the network. Instead, configure your devices to report when the power usage changes by more than a certain (significant!) amount. This amount may be as low as 1 W for an LED bulb, but 50+ W for a washing machine. Tuning this depends on the device - too low and there will be too many reports, too high and your measurement history will be inaccurate.
1. **Use timed reports only as fallbacks**. You might still want to have timed reports in case a change report does not find its way to the controller. In that case, choose a high enough interval to prevent floods from many devices reporting at once, e.g. once per hour.
1. Alternatively: **Choose a high reporting interval**. Not all devices support reporting everything on change only. In these cases, you must make sure to prevent floods by choosing a sane (high enough) reporting interval.
1. **Turn off supervision for non-crucial reports**. More modern devices support sending their reports with supervision, which requests a confirmation from the controller that it received and handled the command. While this makes sense for fire/water alarms and such, some devices enable this for power meters. As a result, every single report causes two messages to be exchanged instead of one. This feature should be disabled unless you really need to make sure that commands are received.
1. **Do not use Security S0 for sensors**. Encrypting traffic also provides data integrity, which prevents picking up corrupted frames, like water usage on a power meter. However, S0 is very inefficient and devices using S0 need to exchange three commands for each report. Prefer using devices that support S2, otherwise stick to not using encryption - this is what Z-Wave JS does with the default inclusion strategy. As an alternative to S0, some devices support using CRC-16 encapsulation (often configurable), which doesn't require additional messages.

> [!NOTE] To figure out where to start, look at the statistics for a node. Very high numbers of incoming reports (e.g. several thousands while others have only a handful) are a good indicator that they are misconfigured and/or have a bad connection to the controller.

## Ensure strong connections between devices

A flaky connection will cause issues during usage and can compound other existing issues. To be able to diagnose this, you need to use an application that exposes the necessary features, e.g. [Z-Wave JS UI](https://github.com/zwave-js/zwave-js-ui). The following section will assume that you are using Z-Wave JS UI.

Z-Wave JS collects statistics that allows building a map of the network with the actual routes used, their speed and (if supported) the RSSI measurements. In general, all routes should be using as few hops as possible and use the highest speed supported by your devices, which will be 100 kbps, except for some very old ones (before 500 series).

If this is not the case, investigate why this is happening, starting with devices that are close to the controller and have low speeds. Afterwards, move on to further away devices. If the connection quality drops off along a multi-hop route, it makes sense to check all nodes along a route (including node-to-node health checks where supported) to determine where issues start to appear.

Z-Wave JS can perform health checks test the physical connection strength between the controller and a node (or between two nodes), see [Nodes health check](https://zwave-js.github.io/zwave-js-ui/#/usage/nodes_healthcheck).

Such a health check will ping a node several times, and (if the node supports it) instruct it to ping the controller with varying TX power. This way, Z-Wave JS will determine the following things, not all of which may be supported by your combination of controller and nodes:

- **Route changes**: During how many ping attempts a new route was needed. Should be as low as possible, ideally 0.
- **Latency**: The maximum time it took to send a ping to the node. Should be as low as possible, <100 ms are good, ideally 10 ms (lower values cannot be measured).
- **Failed pings (controller → node)**: How many pings from the controller were not acknowledged by the node. Should be 0, higher values indicate either a message loss between the controller and the node, or noise near the controller which causes the acknowledgements to get lost.
- **Failed pings (node → controller)**: How many pings from the node were not acknowledged by the controller. Should be 0, higher values indicate either a message loss between the controller and the node, or noise near the node which causes the acknowledgements to get lost.
- **Min. powerlevel without failures**: The minimum powerlevel where all pings from the node were acknowledged by the controller. Should be \< -6 dBm (or > +6 dBm if the application reports the _reduction_ in powerlevel). Ideally -9 dBm, "normal powerlevel" is bad (equals 0 dBm).
- **SNR margin**: An estimation of the Signal-to-Noise Ratio Margin, the difference between the background RSSI and the measured RSSI of acknowledgements. Should be > 17 dBm, lower values indicate excessive noise.

If the test results show high variance in some of these values or measurements that are far from the ideal, it may be necessary to:

- move devices around
- eliminate sources of noise
- manually assign routes, see below
- add additional repeaters

## Manually assign routes

Under ideal conditions, the Z-Wave firmware should figure out usable routes by itself. However, this is not always the case, which can lead to some _\*ahem\*_ interesting routes. For example, this can cause multi-hop routes across the house when a direct connection would be possible and seems like the most logical choice.

In these cases, it is unlikely that rebuilding routes will result in any improvement at all. Instead, we recommend manually assigning so-called _priority routes_, e.g. to force a direct connection. These routes will always be attempted first, even if the last attempt failed.

> [!NOTE] This is a double-edged sword. If the priority route is good, you can expect a fast and reliable connection. If not, or if an assigned repeater goes missing, it will introduce unnecessary delays.
