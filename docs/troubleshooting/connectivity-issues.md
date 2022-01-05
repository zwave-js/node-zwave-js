# Connectivity issues

## General troubleshooting

→ **Commands sometimes don't go through**  
→ **Nodes that go dead and come back alive**  
→ **Reports go missing**
→ **Nodes that are close to the controller are missing from its neighbor list**
→ **Nodes are vaninshing from the controller's neighbor list**

Z-Wave sticks in particular are prone to interference by USB ports, especially by USB3 ports. We recommend putting the stick in a suitable location:

-   on an **USB extension cord** (this works wonders!)
-   away from other USB ports
-   away from metallic surfaces
-   and especially not in the back of a server rack

?> Seriously, try it! The success rate of this is surprisingly high.

If that alone doesn't help, eliminate external sources of RF interference or move the controller away from them. For example, these can be electrical appliances like microwaves, other USB devices like external drives, active USB adapters, etc.

If you've excluded all this, it's time to look at the mesh. Z-Wave JS doesn't have good tools to measure its quality yet, but often a **network heal** can fix bad routes. A heal may also be necessary after moving devices, especially the controller.

## Problems communicating with the stick

→ **Failed to send the _message_ after 3 attempts**  
→ **Timeout while waiting for an ACK from the controller**  
→ **Timeout while waiting for a response from the controller**  
→ **Timeout while waiting for a callback from the controller**

If one of these messages show up, Z-Wave JS has trouble communicating with the Z-Wave stick. Often, something is **really wrong** with the stick - e.g. it might be stuck. Try:

-   waiting a bit
-   soft-resetting the stick (if this function is enabled)
-   removing and re-inserting the stick
-   or restarting your host

## Problems communicating with nodes

If communication with a device fails, the driver automatically tries to resend the messages up to 3 times. Afterwards, it gives up and moves on to the next message. You should get an error which looks like one of the following:

→ **Failed to send the _command_ after 3 attempts. Transmission queue full.**  
Too many messages were sent in a short time without waiting for a controller reply. The driver takes care of this, so it should really not happen. This can happen if your network is really busy. Check the logs to identify spamming nodes.

→ **The controller response indicated failure**  
→ **The controller callback indicated failure**  
This usually means that the command could not be executed. Depending on what you tried to do, an issue might be worth it.

→ **Failed to send the _command_ after 3 attempts (Status XYZ)**  
→ **One or more nodes did not respond to the multicast request (Status XYZ)**  
The command was accepted by the Z-Wave stick, but it could not be transmitted to the node. If the status is included, it tells you exactly what went wrong:

-   `NoAck`: The node did not acknowledge the receipt of the message. If the node is battery-powered, it most likely means that it is asleep. This is normal. If the node is **not** battery-powered, it either has a bad connection or it physically turned off.
-   `Fail`: It was not possible to transmit data because the Z-Wave network or radio frequency is busy or jammed. This is usually a physical issue, like RF noise caused by external sources. When this appears on a 700 series stick however, read [this](troubleshooting/700-series-issues.md).

→ **Timed out while waiting for a response from the node**  
The node acknowledged the message but did not send the expected response in time. This can mean one of many things:

-   The node did not send a response
-   The node did send a response, but it didn't reach the controller (might be a connectivity issue).
-   The node does not understand or support the command
-   When combined with Security S0, this can also mean that the node was not able to decrypt the command.
