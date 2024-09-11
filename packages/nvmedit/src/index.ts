import "reflect-metadata";

export {
	json500To700,
	json700To500,
	jsonToNVM,
	jsonToNVM500,
	migrateNVM,
	nvm500ToJSON,
	nvmToJSON,
} from "./convert";
export type {
	NVMJSON,
	NVMJSONController,
	NVMJSONControllerRFConfig,
	NVMJSONNode,
	NVMJSONNodeWithInfo,
	NVMJSONVirtualNode,
} from "./convert";
export {
	ControllerInfoFile,
	ControllerInfoFileID,
} from "./files/ControllerInfoFile";
export { NVMFile } from "./files/NVMFile";
export { NVM3 } from "./lib/NVM3";
export { NVM3Adapter } from "./lib/NVM3Adapter";
export type {
	ControllerNVMProperty,
	ControllerNVMPropertyToDataType,
	LRNodeNVMProperty,
	LRNodeNVMPropertyToDataType,
	NVM,
	NVMAdapter,
	NVMIO,
	NVMProperty,
	NVMPropertyToDataType,
	NodeNVMProperty,
	NodeNVMPropertyToDataType,
} from "./lib/common/definitions";
export { NVMFileIO } from "./lib/io/NVMFileIO";
export {
	FragmentType,
	ObjectType,
	PageStatus,
	PageWriteSize,
} from "./nvm3/consts";
export type { NVMMeta } from "./nvm3/nvm";
export type { NVM3Object as NVMObject } from "./nvm3/object";
export type {
	NVM3Page as NVMPage,
	NVM3PageHeader as PageHeader,
} from "./nvm3/page";
export type {
	NVM500JSON,
	NVM500JSONController,
	NVM500JSONControllerRFConfig,
	NVM500JSONNode,
	NVM500JSONNodeWithInfo,
	NVM500JSONVirtualNode,
	NVM500Meta,
} from "./nvm500/NVMParser";
