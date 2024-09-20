/* @forbiddenImports external */

import "reflect-metadata";

export type {
	NVMJSON,
	NVMJSONController,
	NVMJSONControllerRFConfig,
	NVMJSONNode,
	NVMJSONNodeWithInfo,
	NVMJSONVirtualNode,
} from "./convert";
export type { NVM3EraseOptions, NVM3Meta } from "./lib/NVM3";
export type { NVM500EraseOptions, NVM500Info } from "./lib/NVM500";
export { NVMAccess } from "./lib/common/definitions";
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
export {
	FragmentType,
	ObjectType,
	PageStatus,
	PageWriteSize,
} from "./lib/nvm3/consts";
export type { NVM3Object } from "./lib/nvm3/object";
export type { NVM3Page, NVM3PageHeader } from "./lib/nvm3/page";
export type {
	NVM500JSON,
	NVM500JSONController,
	NVM500JSONControllerRFConfig,
	NVM500JSONNode,
	NVM500JSONNodeWithInfo,
	NVM500JSONVirtualNode,
	NVM500Meta,
} from "./nvm500/NVMParser";
