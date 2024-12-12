import { type Bytes } from "@zwave-js/shared";

export enum ZnifferSerialFrameType {
	SerialAPI = 0,
	Discarded = 0xff,
}

export type ZnifferSerialFrame = {
	type: ZnifferSerialFrameType.SerialAPI;
	data: Bytes;
} | {
	type: ZnifferSerialFrameType.Discarded;
	data: Uint8Array;
};
