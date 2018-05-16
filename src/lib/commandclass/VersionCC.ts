import { ZWaveLibraryTypes } from "../controller/ZWaveLibraryTypes";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

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
	constructor(nodeId?: number);
	constructor(nodeId: number, command: VersionCommand.Get);
	constructor(nodeId: number, command: VersionCommand.CommandClassGet, requestedCC: CommandClasses);

	constructor(
		public nodeId: number,
		public versionCommand?: VersionCommand,
		public requestedCC?: CommandClasses,
	) {
		super(nodeId);
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

}
