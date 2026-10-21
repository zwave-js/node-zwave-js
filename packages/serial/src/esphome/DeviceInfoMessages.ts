import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { Bytes, type BytesView } from "@zwave-js/shared";

import {
	ESPHomeMessage,
	type ESPHomeMessageBaseOptions,
	type ESPHomeMessageRaw,
	ESPHomeMessageType,
	messageType,
} from "./ESPHomeMessage.js";
import {
	WireType,
	decodeStringField,
	decodeVarInt,
	encodeStringField,
	encodeVarintField,
	parseProtobufMessage,
	skipField,
} from "./ProtobufHelpers.js";

@messageType(ESPHomeMessageType.DeviceInfoRequest)
export class DeviceInfoRequest extends ESPHomeMessage {}

export interface DeviceInfoResponseOptions extends ESPHomeMessageBaseOptions {
	usesPassword?: boolean;
	name?: string;
	macAddress?: string;
	esphomeVersion?: string;
	compilationTime?: string;
	model?: string;
	hasDeepSleep?: boolean;
	projectName?: string;
	projectVersion?: string;
	webserverPort?: number;
	manufacturer?: string;
	friendlyName?: string;
	suggestedArea?: string;
	bluetoothMacAddress?: string;
	apiEncryptionSupported?: boolean;
	zwaveProxyFeatureFlags?: number;
}

@messageType(ESPHomeMessageType.DeviceInfoResponse)
export class DeviceInfoResponse extends ESPHomeMessage {
	public constructor(options: DeviceInfoResponseOptions) {
		super(options);
		this.usesPassword = options.usesPassword ?? false;
		this.name = options.name ?? "";
		this.macAddress = options.macAddress ?? "";
		this.esphomeVersion = options.esphomeVersion ?? "";
		this.compilationTime = options.compilationTime ?? "";
		this.model = options.model ?? "";
		this.hasDeepSleep = options.hasDeepSleep ?? false;
		this.projectName = options.projectName ?? "";
		this.projectVersion = options.projectVersion ?? "";
		this.webserverPort = options.webserverPort ?? 0;
		this.manufacturer = options.manufacturer ?? "";
		this.friendlyName = options.friendlyName ?? "";
		this.suggestedArea = options.suggestedArea ?? "";
		this.bluetoothMacAddress = options.bluetoothMacAddress ?? "";
		this.apiEncryptionSupported = options.apiEncryptionSupported ?? false;
		this.zwaveProxyFeatureFlags = options.zwaveProxyFeatureFlags ?? 0;
	}

	public static from(raw: ESPHomeMessageRaw): DeviceInfoResponse {
		let usesPassword = false;
		let name = "";
		let macAddress = "";
		let esphomeVersion = "";
		let compilationTime = "";
		let model = "";
		let hasDeepSleep = false;
		let projectName = "";
		let projectVersion = "";
		let webserverPort = 0;
		let manufacturer = "";
		let friendlyName = "";
		let suggestedArea = "";
		let bluetoothMacAddress = "";
		let apiEncryptionSupported = false;
		let zwaveProxyFeatureFlags = 0;

		parseProtobufMessage(
			raw.payload,
			(fieldNumber, wireType, data, offset) => {
				switch (fieldNumber) {
					case 1: // uses_password (bool)
						if (wireType !== WireType.Varint) {
							throw new ZWaveError(
								"Invalid wire type for usesPassword",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const usesPasswordResult = decodeVarInt(data, offset);
						usesPassword = usesPasswordResult.value !== 0;
						return offset + usesPasswordResult.bytesRead;

					case 2: // name (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for name",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const nameResult = decodeStringField(data, offset);
						name = nameResult.value;
						return offset + nameResult.bytesRead;

					case 3: // mac_address (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for macAddress",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const macAddressResult = decodeStringField(
							data,
							offset,
						);
						macAddress = macAddressResult.value;
						return offset + macAddressResult.bytesRead;

					case 4: // esphome_version (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for esphomeVersion",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const esphomeVersionResult = decodeStringField(
							data,
							offset,
						);
						esphomeVersion = esphomeVersionResult.value;
						return offset + esphomeVersionResult.bytesRead;

					case 5: // compilation_time (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for compilationTime",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const compilationTimeResult = decodeStringField(
							data,
							offset,
						);
						compilationTime = compilationTimeResult.value;
						return offset + compilationTimeResult.bytesRead;

					case 6: // model (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for model",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const modelResult = decodeStringField(data, offset);
						model = modelResult.value;
						return offset + modelResult.bytesRead;

					case 7: // has_deep_sleep (bool)
						if (wireType !== WireType.Varint) {
							throw new ZWaveError(
								"Invalid wire type for hasDeepSleep",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const hasDeepSleepResult = decodeVarInt(data, offset);
						hasDeepSleep = hasDeepSleepResult.value !== 0;
						return offset + hasDeepSleepResult.bytesRead;

					case 8: // project_name (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for projectName",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const projectNameResult = decodeStringField(
							data,
							offset,
						);
						projectName = projectNameResult.value;
						return offset + projectNameResult.bytesRead;

					case 9: // project_version (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for projectVersion",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const projectVersionResult = decodeStringField(
							data,
							offset,
						);
						projectVersion = projectVersionResult.value;
						return offset + projectVersionResult.bytesRead;

					case 10: // webserver_port (uint32)
						if (wireType !== WireType.Varint) {
							throw new ZWaveError(
								"Invalid wire type for webserverPort",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const webserverPortResult = decodeVarInt(data, offset);
						webserverPort = webserverPortResult.value;
						return offset + webserverPortResult.bytesRead;

					case 12: // manufacturer (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for manufacturer",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const manufacturerResult = decodeStringField(
							data,
							offset,
						);
						manufacturer = manufacturerResult.value;
						return offset + manufacturerResult.bytesRead;

					case 13: // friendly_name (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for friendlyName",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const friendlyNameResult = decodeStringField(
							data,
							offset,
						);
						friendlyName = friendlyNameResult.value;
						return offset + friendlyNameResult.bytesRead;

					case 16: // suggested_area (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for suggestedArea",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const suggestedAreaResult = decodeStringField(
							data,
							offset,
						);
						suggestedArea = suggestedAreaResult.value;
						return offset + suggestedAreaResult.bytesRead;

					case 18: // bluetooth_mac_address (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for bluetoothMacAddress",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const bluetoothMacAddressResult = decodeStringField(
							data,
							offset,
						);
						bluetoothMacAddress = bluetoothMacAddressResult.value;
						return offset + bluetoothMacAddressResult.bytesRead;

					case 19: // api_encryption_supported (bool)
						if (wireType !== WireType.Varint) {
							throw new ZWaveError(
								"Invalid wire type for apiEncryptionSupported",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const apiEncryptionSupportedResult = decodeVarInt(
							data,
							offset,
						);
						apiEncryptionSupported =
							apiEncryptionSupportedResult.value !== 0;
						return offset + apiEncryptionSupportedResult.bytesRead;

					case 23: // zwave_proxy_feature_flags (uint32)
						if (wireType !== WireType.Varint) {
							throw new ZWaveError(
								"Invalid wire type for zwaveProxyFeatureFlags",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const zwaveProxyFeatureFlagsResult = decodeVarInt(
							data,
							offset,
						);
						zwaveProxyFeatureFlags =
							zwaveProxyFeatureFlagsResult.value;
						return offset + zwaveProxyFeatureFlagsResult.bytesRead;

					default:
						return skipField(data, offset, wireType);
				}
			},
		);

		return new this({
			usesPassword,
			name,
			macAddress,
			esphomeVersion,
			compilationTime,
			model,
			hasDeepSleep,
			projectName,
			projectVersion,
			webserverPort,
			manufacturer,
			friendlyName,
			suggestedArea,
			bluetoothMacAddress,
			apiEncryptionSupported,
			zwaveProxyFeatureFlags,
		});
	}

	public usesPassword: boolean;
	public name: string;
	public macAddress: string;
	public esphomeVersion: string;
	public compilationTime: string;
	public model: string;
	public hasDeepSleep: boolean;
	public projectName: string;
	public projectVersion: string;
	public webserverPort: number;
	public manufacturer: string;
	public friendlyName: string;
	public suggestedArea: string;
	public bluetoothMacAddress: string;
	public apiEncryptionSupported: boolean;
	public zwaveProxyFeatureFlags: number;

	/**
	 * Check if Z-Wave proxy support is available
	 */
	public get hasZWaveProxySupport(): boolean {
		return this.zwaveProxyFeatureFlags > 0;
	}

	public serialize(): Bytes {
		const parts: (BytesView | number[])[] = [];

		// Field 1: uses_password (bool)
		if (this.usesPassword) {
			parts.push(encodeVarintField(1, 1));
		}

		// Field 2: name (string)
		if (this.name) {
			parts.push(encodeStringField(2, this.name));
		}

		// Field 3: mac_address (string)
		if (this.macAddress) {
			parts.push(encodeStringField(3, this.macAddress));
		}

		// Field 4: esphome_version (string)
		if (this.esphomeVersion) {
			parts.push(encodeStringField(4, this.esphomeVersion));
		}

		// Field 5: compilation_time (string)
		if (this.compilationTime) {
			parts.push(encodeStringField(5, this.compilationTime));
		}

		// Field 6: model (string)
		if (this.model) {
			parts.push(encodeStringField(6, this.model));
		}

		// Field 7: has_deep_sleep (bool)
		if (this.hasDeepSleep) {
			parts.push(encodeVarintField(7, 1));
		}

		// Field 8: project_name (string)
		if (this.projectName) {
			parts.push(encodeStringField(8, this.projectName));
		}

		// Field 9: project_version (string)
		if (this.projectVersion) {
			parts.push(encodeStringField(9, this.projectVersion));
		}

		// Field 10: webserver_port (uint32)
		if (this.webserverPort > 0) {
			parts.push(encodeVarintField(10, this.webserverPort));
		}

		// Field 12: manufacturer (string)
		if (this.manufacturer) {
			parts.push(encodeStringField(12, this.manufacturer));
		}

		// Field 13: friendly_name (string)
		if (this.friendlyName) {
			parts.push(encodeStringField(13, this.friendlyName));
		}

		// Field 16: suggested_area (string)
		if (this.suggestedArea) {
			parts.push(encodeStringField(16, this.suggestedArea));
		}

		// Field 18: bluetooth_mac_address (string)
		if (this.bluetoothMacAddress) {
			parts.push(encodeStringField(18, this.bluetoothMacAddress));
		}

		// Field 19: api_encryption_supported (bool)
		if (this.apiEncryptionSupported) {
			parts.push(encodeVarintField(19, 1));
		}

		// Field 23: zwave_proxy_feature_flags (uint32)
		if (this.zwaveProxyFeatureFlags > 0) {
			parts.push(encodeVarintField(23, this.zwaveProxyFeatureFlags));
		}

		this.payload = Bytes.concat(parts);
		return super.serialize();
	}
}
