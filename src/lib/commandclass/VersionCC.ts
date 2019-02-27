import { SendDataRequest } from "../controller/SendDataMessages";
import { ZWaveLibraryTypes } from "../controller/ZWaveLibraryTypes";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { ZWaveNode } from "../node/Node";
import { CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion, StateKind } from "./CommandClass";
import { Driver } from "../driver/Driver";

export enum VersionCommand {
	Get = 0x11,
	Report = 0x12,
	CommandClassGet = 0x13,
	CommandClassReport = 0x14,
}

@commandClass(CommandClasses.Version)
@implementedVersion(1)
@expectedCCResponse(CommandClasses.Version)
export class VersionCC extends CommandClass {

	// tslint:disable:unified-signatures
	constructor(driver: Driver, nodeId?: number);
	constructor(driver: Driver, nodeId: number, command: VersionCommand.Get);
	constructor(driver: Driver, nodeId: number, command: VersionCommand.CommandClassGet, requestedCC: CommandClasses);

	constructor(
		driver: Driver,
		public nodeId: number,
		public versionCommand?: VersionCommand,
		public requestedCC?: CommandClasses,
	) {
		super(driver, nodeId);
	}
	// tslint:enable:unified-signatures

	private _libraryType: ZWaveLibraryTypes;
	public get libraryType(): ZWaveLibraryTypes {
		return this._libraryType;
	}
	private _protocolVersion: string;
	public get protocolVersion(): string {
		return this._protocolVersion;
	}
	private _applicationVersion: string;
	public get applicationVersion(): string {
		return this._applicationVersion;
	}
	private _ccVersion: number;
	public get ccVersion(): number {
		return this._ccVersion;
	}

	public serialize(): Buffer {
		switch (this.versionCommand) {
			case VersionCommand.Get:
				this.payload = Buffer.from([this.versionCommand]);
				break;
			case VersionCommand.CommandClassGet:
				this.payload = Buffer.from([
					this.versionCommand,
					this.requestedCC,
				]);
				break;
			default:
				throw new ZWaveError(
					"Cannot serialize a Version CC with a command other than Get or CommandClassGet",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		this.versionCommand = this.payload[0];
		switch (this.versionCommand) {
			case VersionCommand.Report:
				this._libraryType = this.payload[1];
				this._protocolVersion = `${this.payload[2]}.${this.payload[3]}`;
				this._applicationVersion = `${this.payload[4]}.${this.payload[5]}`;
				break;

			case VersionCommand.CommandClassReport:
				this.requestedCC = this.payload[1];
				this._ccVersion = this.payload[2];
				break;

			default:
				throw new ZWaveError(
					"Cannot deserialize a Version CC with a command other than Report or CommandClassReport",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

	/** Requests static or dynamic state for a given from a node */
	public static createStateRequest(driver: Driver, node: ZWaveNode, kind: StateKind): SendDataRequest | void {
		// TODO: Check if we have requested that information before and store it
		if (kind & StateKind.Static) {
			const cc = new VersionCC(driver, node.id, VersionCommand.Get);
			return new SendDataRequest(driver, cc);
		}
	}

}
