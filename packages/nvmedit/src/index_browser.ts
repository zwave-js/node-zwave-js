/* @forbiddenImports external */

import "reflect-metadata";

export {
	json500To700,
	json700To500,
	jsonToNVM,
	jsonToNVM500,
	migrateNVM,
	nvm500ToJSON,
	nvmToJSON,
} from "./convert.js";
export type {
	NVMJSON,
	NVMJSONController,
	NVMJSONControllerRFConfig,
	NVMJSONNode,
	NVMJSONNodeWithInfo,
	NVMJSONVirtualNode,
} from "./convert.js";
export { NVM3, type NVM3EraseOptions, type NVM3Meta } from "./lib/NVM3.js";
export {
	NVM500,
	type NVM500EraseOptions,
	type NVM500Info,
} from "./lib/NVM500.js";
export { NVMAccess } from "./lib/common/definitions.js";
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
} from "./lib/common/definitions.js";
export { BufferedNVMReader } from "./lib/io/BufferedNVMReader.js";
export { NVM3Adapter } from "./lib/nvm3/adapter.js";
export {
	FragmentType,
	ObjectType,
	PageStatus,
	PageWriteSize,
} from "./lib/nvm3/consts.js";
export * from "./lib/nvm3/files/index.js";
export type { NVM3Object } from "./lib/nvm3/object.js";
export type { NVM3Page, NVM3PageHeader } from "./lib/nvm3/page.js";
export { NVM500Adapter } from "./lib/nvm500/adapter.js";
export type {
	NVM500JSON,
	NVM500JSONController,
	NVM500JSONControllerRFConfig,
	NVM500JSONNode,
	NVM500JSONNodeWithInfo,
	NVM500JSONVirtualNode,
	NVM500Meta,
} from "./nvm500/NVMParser.js";
