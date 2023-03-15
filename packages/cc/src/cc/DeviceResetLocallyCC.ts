import { CommandClasses, validatePayload } from "@zwave-js/core/safe";
import type { ZWaveHost } from "@zwave-js/host/safe";
import {
	CommandClass,
	CommandClassOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	CCCommand,
	commandClass,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { DeviceResetLocallyCommand } from "../lib/_Types";

// @noAPI: We can only receive this command
// @noInterview: We can only receive this command

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
