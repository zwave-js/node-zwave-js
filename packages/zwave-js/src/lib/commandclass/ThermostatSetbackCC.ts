import type { Maybe, MessageOrCCLogEntry } from "@zwave-js/core";
import {
	CommandClasses,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { getEnumMemberName, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import type { Driver } from "../driver/Driver";
import {
	decodeSetbackState,
	encodeSetbackState,
	SetbackState,
} from "../values/SetbackState";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	throwUnsupportedProperty,
} from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { SetbackType, ThermostatSetbackCommand } from "./_Types";

// @noSetValueAPI
// The setback state consist of two values that must be set together

@API(CommandClasses["Thermostat Setback"])
export class ThermostatSetbackCCAPI extends CCAPI {
	public supportsCommand(cmd: ThermostatSetbackCommand): Maybe<boolean> {
		switch (cmd) {
			case ThermostatSetbackCommand.Get:
				return this.isSinglecast();
			case ThermostatSetbackCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "setbackType":
			case "setbackState":
				return (await this.get())?.[property];

			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			ThermostatSetbackCommand,
			ThermostatSetbackCommand.Get,
		);

		const cc = new ThermostatSetbackCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<ThermostatSetbackCCReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, ["setbackType", "setbackState"]);
		}
	}

	@validateArgs()
	public async set(
		setbackType: SetbackType,
		setbackState: SetbackState,
	): Promise<void> {
		this.assertSupportsCommand(
			ThermostatSetbackCommand,
			ThermostatSetbackCommand.Get,
		);

		const cc = new ThermostatSetbackCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setbackType,
			setbackState,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Thermostat Setback"])
@implementedVersion(1)
export class ThermostatSetbackCC extends CommandClass {
	declare ccCommand: ThermostatSetbackCommand;

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;

		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(driver);

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses["Thermostat Setback"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the thermostat state
		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying the current thermostat state...",
			direction: "outbound",
		});
		const setbackResp = await api.get();
		if (setbackResp) {
			const logMessage = `received current state:
setback type:  ${getEnumMemberName(SetbackType, setbackResp.setbackType)}
setback state: ${setbackResp.setbackState}`;
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}
	}
}

interface ThermostatSetbackCCSetOptions extends CCCommandOptions {
	setbackType: SetbackType;
	setbackState: SetbackState;
}

@CCCommand(ThermostatSetbackCommand.Set)
export class ThermostatSetbackCCSet extends ThermostatSetbackCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetbackCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.setbackType = options.setbackType;
			this.setbackState = options.setbackState;
		}
	}

	public setbackType: SetbackType;
	/** The offset from the setpoint in 0.1 Kelvin or a special mode */
	public setbackState: SetbackState;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.setbackType & 0b11,
			encodeSetbackState(this.setbackState),
		]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"setback type": getEnumMemberName(
					SetbackType,
					this.setbackType,
				),
				"setback state": this.setbackState,
			},
		};
	}
}

@CCCommand(ThermostatSetbackCommand.Report)
export class ThermostatSetbackCCReport extends ThermostatSetbackCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);
		this._setbackType = this.payload[0] & 0b11;
		// If we receive an unknown setback state, return the raw value
		this._setbackState =
			decodeSetbackState(this.payload[1]) || this.payload[1];
		this.persistValues();
	}

	private _setbackType: SetbackType;
	@ccValue()
	@ccValueMetadata({
		// TODO: This should be a value list
		...ValueMetadata.Any,
		label: "Setback type",
	})
	public get setbackType(): SetbackType {
		return this._setbackType;
	}

	private _setbackState: SetbackState;
	/** The offset from the setpoint in 0.1 Kelvin or a special mode */
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Int8,
		min: -12.8,
		max: 12,
		label: "Setback state",
	})
	public get setbackState(): SetbackState {
		return this._setbackState;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"setback type": getEnumMemberName(
					SetbackType,
					this.setbackType,
				),
				"setback state": this.setbackState,
			},
		};
	}
}

@CCCommand(ThermostatSetbackCommand.Get)
@expectedCCResponse(ThermostatSetbackCCReport)
export class ThermostatSetbackCCGet extends ThermostatSetbackCC {}
