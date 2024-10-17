import {
	CommandClasses,
	type MaybeNotKnown,
	TransmitOptions,
	validatePayload,
} from "@zwave-js/core/safe";
import { CCAPI } from "../lib/API";
import {
	CommandClass,
	type CommandClassOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { DeviceResetLocallyCommand } from "../lib/_Types";

// @noInterview: There is no interview procedure

@API(CommandClasses["Device Reset Locally"])
export class DeviceResetLocallyCCAPI extends CCAPI {
	public supportsCommand(
		cmd: DeviceResetLocallyCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case DeviceResetLocallyCommand.Notification:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	public async sendNotification(): Promise<void> {
		this.assertSupportsCommand(
			DeviceResetLocallyCommand,
			DeviceResetLocallyCommand.Notification,
		);

		const cc = new DeviceResetLocallyCCNotification({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});

		try {
			// This command is sent immediately before a hard reset of the controller.
			// If we don't wait for a callback (ack), the controller locks up when hard-resetting.
			await this.host.sendCommand(cc, {
				...this.commandOptions,
				// Do not fall back to explorer frames
				transmitOptions: TransmitOptions.ACK
					| TransmitOptions.AutoRoute,
				// Only try sending once
				maxSendAttempts: 1,
				// We don't want failures causing us to treat the node as asleep or dead
				changeNodeStatusOnMissingACK: false,
			});
		} catch {
			// Don't care
		}
	}
}

@commandClass(CommandClasses["Device Reset Locally"])
@implementedVersion(1)
export class DeviceResetLocallyCC extends CommandClass {
	declare ccCommand: DeviceResetLocallyCommand;
	// Force singlecast
	declare nodeId: number;
}

@CCCommand(DeviceResetLocallyCommand.Notification)
export class DeviceResetLocallyCCNotification extends DeviceResetLocallyCC {
	public constructor(options: CommandClassOptions) {
		super(options);

		if (gotDeserializationOptions(options)) {
			// We need to make sure this doesn't get parsed accidentally, e.g. because of a bit flip

			// This CC has no payload
			validatePayload(this.payload.length === 0);
			// It MUST be issued by the root device
			validatePayload(this.endpointIndex === 0);
		}
	}
}
