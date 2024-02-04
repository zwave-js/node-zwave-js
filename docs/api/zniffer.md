# Zniffer

A Zniffer is a Z-Wave controller with special firmware that can capture Z-Wave traffic from any nearby Z-Wave device. This is useful for troubleshooting, as it allows you to see exactly what is being sent and received by the devices in your network.

Using the `Zniffer` class, you can connect to a Zniffer and start capturing traffic. The captured traffic can be saved to a file, or processed by the application in real-time.

## Constructor

```ts
new (
	port: string,
	options?: ZnifferOptions
) => Zniffer
```

The first constructor argument is the address of the serial port. On Windows, this is similar to `"COM3"`. On Linux this has the form `/dev/ttyAMA0` (or similar). Alternatively, you can connect to a serial port that is hosted over TCP (for example with the `ser2net` utility), see [Remote serial port over TCP](usage/tcp-connection.md).

The second argument is an optional object with the following properties:

<!-- #import ZnifferOptions from "zwave-js" with comments -->

```ts
interface ZnifferOptions {
	/**
	 * Optional log configuration
	 */
	logConfig?: Partial<LogConfig>;

	/** Security keys for decrypting Z-Wave traffic */
	securityKeys?: ZWaveOptions["securityKeys"];
	/** Security keys for decrypting Z-Wave Long Range traffic */
	securityKeysLongRange?: ZWaveOptions["securityKeysLongRange"];

	/**
	 * The RSSI values reported by the Zniffer are not actual RSSI values.
	 * They can be converted to dBm, but the conversion is chip dependent and not documented for 700/800 series Zniffers.
	 *
	 * Set this option to `true` enable the conversion. Otherwise the raw values from the Zniffer will be used.
	 */
	convertRSSI?: boolean;

	/**
	 * The frequency to initialize the Zniffer with. If not specified, the current setting will be kept.
	 *
	 * On 700/800 series Zniffers, this value matches the {@link ZnifferRegion}.
	 *
	 * On 400/500 series Zniffers, the value is firmware-specific.
	 * Supported regions and their names have to be queried using the `getFrequencies` and `getFrequencyInfo(frequency)` commands.
	 */
	defaultFrequency?: number;
}
```

## Usage

After creating a Zniffer instance, initialize it and start capturing traffic:

```ts
const zniffer = new Zniffer("/path/to/serialport", {
	// ... options
});

await zniffer.init();
await zniffer.start();
```

The captured data will be emitted using events:

```ts
zniffer
	.on("frame", (frame: Frame) => {
		// handle the frame
	})
	.on("corrupted frame", (corrupted: CorruptedFrame) => {
		// handle the corrupted frame
	});
```

To stop capturing traffic, call the `stop` method:

```ts
await zniffer.stop();
```

Captured frames can be saved to a `.zlf` file using the `saveCaptureToFile` method:

```ts
await zniffer.saveCaptureToFile("/path/to/file.zlf");
```

This will overwrite the file if it already exists. Starting a new capture will discard all previously captured frames.

## Frequency selection

The configured frequency of the Zniffer has to match the frequency of the Z-Wave network it is capturing. Zniffers based on 700/800 series firmware support frequencies that match the `ZnifferRegion` enum:

<!-- #import ZnifferRegion from "@zwave-js/core" -->

```ts
enum ZnifferRegion {
	"Europe" = 0x00,
	"USA" = 0x01,
	"Australia/New Zealand" = 0x02,
	"Hong Kong" = 0x03,
	"India" = 0x05,
	"Israel" = 0x06,
	"Russia" = 0x07,
	"China" = 0x08,
	"USA (Long Range)" = 0x09,
	"USA (Long Range, backup)" = 0x0a,
	"Japan" = 0x20,
	"Korea" = 0x21,
	"USA (Long Range, end device)" = 0x30,
	"Unknown" = 0xfe,
	"Default (EU)" = 0xff,
}
```

For older Zniffers, the list of frequencies and their names is available through the `supportedFrequencies` property of the Zniffer instance:

```ts
/** A map of supported frequency identifiers and their names */
readonly supportedFrequencies: ReadonlyMap<number, string>
```

The currently configured frequency can be read using the `currentFrequency` property:

```ts
/** The currently configured frequency */
readonly currentFrequency: number;
```

To change the frequency of the Zniffer, use the `setFrequency` method:

```ts
async setFrequency(frequency: number): Promise<void>;
```

## Handling frames

A frame is considered corrupt if its checksum is invalid. This can happen if the Zniffer was not able to capture the frame correctly, or if the frame was corrupted in transit:

<!-- #import CorruptedFrame from "zwave-js" -->

```ts
type CorruptedFrame = {
	channel: number;
	region: number;
	rssiRaw: number;
	rssi?: RSSI;

	protocolDataRate: ZnifferProtocolDataRate;

	payload: Buffer;
};
```

A valid frame can either be a Z-Wave frame or a Z-Wave Long Range frame...

<!-- #import Frame from "zwave-js" -->

```ts
type Frame = ZWaveFrame | LongRangeFrame;
```

...both of which have several subtypes:

<!-- #import ZWaveFrame from "zwave-js" -->

```ts
type ZWaveFrame =
	// Common fields for all Z-Wave frames
	& {
		protocol: Protocols.ZWave;

		channel: number;
		region: number;
		rssiRaw: number;
		rssi?: RSSI;

		protocolDataRate: ZnifferProtocolDataRate;
		speedModified: boolean;

		sequenceNumber: number;

		homeId: number;
		sourceNodeId: number;
	}
	// Different kinds of Z-Wave frames:
	& (
		| (
			// Singlecast frame, either routed or not
			& {
				type: ZWaveFrameType.Singlecast;
				destinationNodeId: number;
				ackRequested: boolean;
				payload: Buffer | CommandClass;
			}
			// Only present in routed frames:
			& AllOrNone<
				& {
					direction: "outbound" | "inbound";
					hop: number;
					repeaters: number[];
					repeaterRSSI?: RSSI[];
				}
				// Different kinds of routed frames:
				& (
					// Normal frame
					| {
						routedAck: false;
						routedError: false;
						failedHop?: undefined;
					}
					// Routed acknowledgement
					| {
						routedAck: true;
						routedError: false;
						failedHop?: undefined;
					}
					// Routed error
					| {
						routedAck: false;
						routedError: true;
						failedHop: number;
					}
				)
			>
		)
		| {
			// Multicast frame, not routed
			type: ZWaveFrameType.Multicast;
			destinationNodeIds: number[];
			payload: Buffer | CommandClass;
		}
		| {
			// Ack frame, not routed
			type: ZWaveFrameType.AckDirect;
			destinationNodeId: number;
		}
		| (
			// Different kind of explorer frames
			& ({
				type: ZWaveFrameType.ExplorerNormal;
				payload: Buffer | CommandClass;
			} | {
				type: ZWaveFrameType.ExplorerSearchResult;
				searchingNodeId: number;
				frameHandle: number;
				resultTTL: number;
				resultRepeaters: readonly number[];
			} | {
				type: ZWaveFrameType.ExplorerInclusionRequest;
				networkHomeId: number;
			})
			// Common fields for all explorer frames
			& {
				destinationNodeId: number;
				ackRequested: boolean;
				direction: "outbound" | "inbound";
				repeaters: number[];
				ttl: number;
			}
		)
	);
```

<!-- #import LongRangeFrame from "zwave-js" -->

```ts
type LongRangeFrame =
	// Common fields for all Long Range frames
	& {
		protocol: Protocols.ZWaveLongRange;

		channel: number;
		region: ZnifferRegion;
		protocolDataRate: ZnifferProtocolDataRate;

		rssiRaw: number;
		rssi?: RSSI;
		noiseFloor: RSSI;
		txPower: number;

		sequenceNumber: number;

		homeId: number;
		sourceNodeId: number;
		destinationNodeId: number;
	}
	// Different kinds of Long Range frames:
	& (
		{
			// Singlecast frame
			type: LongRangeFrameType.Singlecast;
			ackRequested: boolean;
			payload: Buffer | CommandClass;
		} | {
			// Acknowledgement frame
			type: LongRangeFrameType.Ack;
			incomingRSSI: RSSI;
			payload: Buffer;
		}
	);
```

## Type definitions

<!-- #import Protocols from "@zwave-js/core" -->

```ts
enum Protocols {
	ZWave = 0,
	ZWaveLongRange = 1,
}
```

<!-- #import ZWaveFrameType from "zwave-js" -->

<!-- #import LongRangeFrameType from "zwave-js" -->

<!-- #import ZnifferProtocolDataRate from "@zwave-js/core" -->

```ts
enum ZnifferProtocolDataRate {
	ZWave_9k6 = 0x00,
	ZWave_40k = 0x01,
	ZWave_100k = 0x02,
	LongRange_100k = 0x03,
}
```

<!-- #import RSSI from "@zwave-js/core" with comments -->

```ts
type RSSI = number | RssiError;
```

<!-- #import RssiError from "@zwave-js/core" with comments -->

```ts
enum RssiError {
	NotAvailable = 127,
	ReceiverSaturated = 126,
	NoSignalDetected = 125,
}
```
