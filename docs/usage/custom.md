# Send custom messages

It may be necessary to send messages or commands that aren't implemented yet. For these cases, `zwave-js` provides means to send "raw" messages or commands.
The only downside is that you won't necessarily receive any responses that would normally be mapped to the call.

## Send a custom message to the controller

Here's an example how to turn off the LED on a **Aeotec Gen 5 stick**.

```ts
const turnLEDOff = new Message(driver, {
	type: MessageType.Request,
	functionType: 0xF2,
	payload: Buffer.from("5101000501", "hex"),
});
await driver.sendMessage(turnLEDOff, {
	priority: MessagePriority.Controller,
	supportCheck: false, // This line is necessary to send commands a device does not advertise support for
});
```

> [!NOTE]
> This will send the raw buffer `0x010800F2510100050151` to the serialport.
> The protocol bytes `SOF (0x01)`, length (`0x08`) and the checksum (`0x51`) are automatically added at the start and end of the serial message.

## Send a custom command to a node

This example sends an `Anti-theft Get` command (which is currently unsupported) to node 2:

```ts
const cc = new CommandClass(driver, {
	nodeId: 2,
	ccId: CommandClasses["Anti-theft"], // or 0x5d
	ccCommand: 0x02,
});
await driver.sendCommand(cc);
```

> [!NOTE]
> Sending unimplemented get-type commands does not actually make sense since the response will silently be dropped.
