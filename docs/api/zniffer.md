# Zniffer

Using the `Zniffer` class, you can connect to a [Zniffer](troubleshooting/zniffer.md) and start capturing traffic. The captured traffic can be saved to a file, or processed by the application in real-time.

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

	host?: ZWaveOptions["host"];

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

	/** Limit the number of frames that are kept in memory. */
	maxCapturedFrames?: number;
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

The captured data will be emitted using events and includes both the parsed frame and its raw data:

```ts
zniffer
	.on("frame", (frame: Frame, rawData: Buffer) => {
		// handle the frame
	})
	.on("corrupted frame", (corrupted: CorruptedFrame, rawData: Buffer) => {
		// handle the corrupted frame
	});
```

To stop capturing traffic, call the `stop` method:

```ts
await zniffer.stop();
```

The full list of captured frames can be retrieved using the `capturedFrames` property:

```ts
const frames = zniffer.capturedFrames;
```

Captured frames can be saved to a `.zlf` file using the `saveCaptureToFile` method:

```ts
await zniffer.saveCaptureToFile("/path/to/file.zlf");
```

This will overwrite the file if it already exists. Starting a new capture will discard all previously captured frames. To clear the list of captured frames without saving them, use the `clearCapturedFrames` method:

```ts
zniffer.clearCapturedFrames();
```

When done, make sure to destroy the Zniffer instance to release the serial port and clean up resources:

```ts
await zniffer.destroy();
```

Captured frames can also be returned as a `Buffer` in the `.zlf` format using the `getCaptureAsZLFBuffer` method:

```ts
await zniffer.getCaptureAsZLFBuffer();
```

When saving the capture to a file or buffer, an optional predicate function can be passed to filter frames first, for example:

```ts
await zniffer.saveCaptureToFile("/path/to/file.zlf", (frame) => {
	// Limit frames to a specific home ID
	return "homeId" in f.parsedFrame && f.parsedFrame.homeId === 0xdeadbeef;
});
await zniffer.getCaptureAsZLFBuffer((frame) => {
	// Only include ZWLR frames
	return "protocol" in f.parsedFrame
		&& f.parsedFrame.protocol === Protocols.ZWaveLongRange;
});
```

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
	"Europe (Long Range)" = 0x0b,
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

	payload: Uint8Array;
};
```

A valid frame can either be a Z-Wave frame or a Z-Wave Long Range frame, either normal or beaming...

<!-- #import Frame from "zwave-js" -->

```ts
type Frame =
	| ZWaveFrame
	| LongRangeFrame
	| BeamFrame;
```

...all of which have several subtypes:

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
				payload: Uint8Array | CommandClass;
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
		// Broadcast frame. This is technically a singlecast frame,
		// but the destination node ID is always 255 and it is not routed
		| {
			type: ZWaveFrameType.Broadcast;
			destinationNodeId: typeof NODE_ID_BROADCAST;
			ackRequested: boolean;
			payload: Uint8Array | CommandClass;
		}
		| {
			// Multicast frame, not routed
			type: ZWaveFrameType.Multicast;
			destinationNodeIds: number[];
			payload: Uint8Array | CommandClass;
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
				payload: Uint8Array | CommandClass;
			} | {
				type: ZWaveFrameType.ExplorerSearchResult;
				searchingNodeId: number;
				frameHandle: number;
				resultTTL: number;
				resultRepeaters: readonly number[];
			} | {
				type: ZWaveFrameType.ExplorerInclusionRequest;
				networkHomeId: number;
				payload: Uint8Array | CommandClass;
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
		| {
			// Singlecast frame
			type: LongRangeFrameType.Singlecast;
			ackRequested: boolean;
			payload: Uint8Array | CommandClass;
		}
		| {
			// Broadcast frame. This is technically a singlecast frame,
			// but the destination node ID is always 4095
			type: LongRangeFrameType.Broadcast;
			destinationNodeId: typeof NODE_ID_BROADCAST_LR;
			ackRequested: boolean;
			payload: Uint8Array | CommandClass;
		}
		| {
			// Acknowledgement frame
			type: LongRangeFrameType.Ack;
			incomingRSSI: RSSI;
			payload: Uint8Array;
		}
	);
```

<!-- #import BeamFrame from "zwave-js" -->

```ts
type BeamFrame =
	// Common fields for all Beam frames
	& {
		channel: number;
	}
	// Different types of beam frames:
	& (
		| {
			// Z-Wave Classic
			protocol: Protocols.ZWave;
			type: ZWaveFrameType.BeamStart;

			protocolDataRate: ZnifferProtocolDataRate;
			rssiRaw: number;
			rssi?: RSSI;
			region: ZnifferRegion;

			homeIdHash?: number;
			destinationNodeId: number;
		}
		| {
			// Z-Wave Long Range
			protocol: Protocols.ZWaveLongRange;
			type: LongRangeFrameType.BeamStart;

			protocolDataRate: ZnifferProtocolDataRate;
			rssiRaw: number;
			rssi?: RSSI;
			region: ZnifferRegion;

			txPower: number;
			homeIdHash: number;
			destinationNodeId: number;
		}
		// The Zniffer sends the same command for the beam ending for both
		// Z-Wave Classic and Long Range. To make testing the frame type more
		// consistent with the other frames, two different values are used
		| {
			protocol: Protocols.ZWave;
			type: ZWaveFrameType.BeamStop;
		}
		| {
			protocol: Protocols.ZWaveLongRange;
			type: LongRangeFrameType.BeamStop;
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

```ts
enum ZWaveFrameType {
	Singlecast,
	Multicast,
	AckDirect,
	ExplorerNormal,
	ExplorerSearchResult,
	ExplorerInclusionRequest,
	BeamStart,
	BeamStop,
	Broadcast,
}
```

<!-- #import LongRangeFrameType from "zwave-js" -->

```ts
enum LongRangeFrameType {
	Singlecast,
	Ack,
	BeamStart,
	BeamStop,
	Broadcast,
}
```

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
