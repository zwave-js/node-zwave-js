import {
	CommandClasses,
	TransmitOptions,
	validatePayload,
	type MaybeNotKnown,
} from "@zwave-js/core/safe";
import type { ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI } from "../lib/API";
import {
	CommandClass,
	gotDeserializationOptions,
	type CommandClassOptions,
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

		const cc = new DeviceResetLocallyCCNotification(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});

		try {
			await this.applHost.sendCommand(cc, {
				...this.commandOptions,
				// Seems we need these options or some nodes won't accept the nonce
				transmitOptions: TransmitOptions.DEFAULT_NOACK,
				// Only try sending once
				maxSendAttempts: 1,
				// We don't want failures causing us to treat the node as asleep or dead
				changeNodeStatusOnMissingACK: false,
			});
		} catch (e) {
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
	public constructor(host: ZWaveHost, options: CommandClassOptions) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			// We need to make sure this doesn't get parsed accidentally, e.g. because of a bit flip

			// This CC has no payload
			validatePayload(this.payload.length === 0);
			// It MUST be issued by the root device
			validatePayload(this.endpointIndex === 0);
		}
	}
}
