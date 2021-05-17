# A device does not respond

If communication with a device fails, the driver automatically tries to resend the messages up to 3 times. Afterwards, it gives up and moves on to the next message. You should get an error which looks like one of the following:

**Failed to send the message after 3 attempts**  
If this happens, your network is either extremely busy at the moment or something is **really wrong** with the Z-Wave controller. Try waiting a bit, try removing and re-inserting the stick or try restarting your host.

**Timeout while waiting for an ACK from the controller**  
**Timeout while waiting for a response from the controller**  
**Timeout while waiting for a callback from the controller**  
If one of these messages show up, something is **really wrong** with the Z-Wave controller. Try removing and re-inserting the stick or try restarting your host.

**Failed to send the command after 3 attempts. Transmission queue full.**  
Too many messages were sent in a short time without waiting for a controller reply. The driver takes care of this, so it should really not happen. If it does repeatedly, please open an issue.

**The controller response indicated failure**  
**The controller callback indicated failure**  
This usually means that the command could not be executed. Depending on what you tried to do, an issue might be worth it.

**Failed to send the command after 3 attempts (Status XYZ)**  
**One or more nodes did not respond to the multicast request (Status XYZ)**  
The command was accepted by the Z-Wave stick, but it could not be transmitted to the node. If the status is included, it tells you exactly what went wrong:

-   `NoAck`: The node did not acknowledge the message. It is probably asleep or dead. If the node is **not** battery-powered, it probably has a bad connection.
-   `Fail`: It was not possible to transmit data because the Z-Wave network is busy (jammed)

**Timed out while waiting for a response from the node**  
The node acknowledged the message but did not send the expected response in time. This usually means that the node does not support the command or it could not send the response.
