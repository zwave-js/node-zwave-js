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
export { NVM3 } from "./lib/NVM3";
export type { NVM3Meta as NVMMeta } from "./lib/NVM3";
export { NVM500 } from "./lib/NVM500";
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
export { NVMAccess } from "./lib/common/definitions";
export { BufferedNVMReader } from "./lib/io/BufferedNVMReader";
export { NVMFileIO } from "./lib/io/NVMFileIO";
export { NVM3Adapter } from "./lib/nvm3/adapter";
export {
	FragmentType,
	ObjectType,
	PageStatus,
	PageWriteSize,
} from "./lib/nvm3/consts";
export {
	ControllerInfoFile,
	ControllerInfoFileID,
	NVMFile,
} from "./lib/nvm3/files";
export type { NVM3Object as NVMObject } from "./lib/nvm3/object";
export type {
	NVM3Page as NVMPage,
	NVM3PageHeader as PageHeader,
} from "./lib/nvm3/page";
export { NVM500Adapter } from "./lib/nvm500/adapter";
export type {
	NVM500JSON,
	NVM500JSONController,
	NVM500JSONControllerRFConfig,
	NVM500JSONNode,
	NVM500JSONNodeWithInfo,
	NVM500JSONVirtualNode,
	NVM500Meta,
} from "./nvm500/NVMParser";
