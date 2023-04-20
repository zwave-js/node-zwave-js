import type { ProtocolType } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageDeserializationOptions } from "@zwave-js/serial";
export declare class GetProtocolVersionRequest extends Message {
}
export declare class GetProtocolVersionResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly protocolType: ProtocolType;
    readonly protocolVersion: string;
    readonly applicationFrameworkBuildNumber?: number;
    readonly gitCommitHash?: string;
}
//# sourceMappingURL=GetProtocolVersionMessages.d.ts.map