import type {
	CommandClassInfo,
	DataRate,
	FLiRS,
	SerializedValue,
	ValueMetadata,
} from "@zwave-js/core/safe";
import { type JSONObject } from "@zwave-js/shared";

export interface DeviceClassDump {
	key: number;
	label: string;
}

export interface DeviceClassesDump {
	basic: DeviceClassDump;
	generic: DeviceClassDump;
	specific: DeviceClassDump;
}

export interface CommandClassDump extends CommandClassInfo {
	values: ValueDump[];
}

export interface ValueDump {
	property: string | number;
	propertyKey?: string | number;
	metadata?: ValueMetadata;
	value?: SerializedValue;
	timestamp?: string;
	internal?: boolean;
}

export interface EndpointDump {
	index: number;
	deviceClass: DeviceClassesDump | "unknown";
	maySupportBasicCC: boolean;
	commandClasses: Record<string, CommandClassDump>;
}

export interface NodeDump {
	id: number;
	manufacturer?: string;
	label?: string;
	description?: string;
	fingerprint: {
		// Hex representation:
		manufacturerId: string;
		productType: string;
		productId: string;
		firmwareVersion: string;
		hardwareVersion?: number;
	};
	interviewStage: string;
	ready: boolean;

	dsk?: string;
	securityClasses: Record<string, boolean | "unknown">;

	isListening: boolean | "unknown";
	isFrequentListening: FLiRS | "unknown";
	isRouting: boolean | "unknown";
	supportsBeaming: boolean | "unknown";
	supportsSecurity: boolean | "unknown";
	protocol: string;
	supportedProtocols?: string[];
	protocolVersion: string;
	sdkVersion: string;
	supportedDataRates: DataRate[] | "unknown";

	deviceClass: DeviceClassesDump | "unknown";
	maySupportBasicCC: boolean;
	commandClasses: Record<string, CommandClassDump>;

	endpoints?: Record<number, EndpointDump>;

	configFileName?: string;
	compatFlags?: JSONObject;
}
