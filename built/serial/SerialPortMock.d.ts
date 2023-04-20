import { ErrorCallback, OpenOptions, SerialPortStream } from "@serialport/stream";
import { MockBindingInterface } from "./SerialPortBindingMock";
export type SerialPortMockOpenOptions = Omit<OpenOptions<MockBindingInterface>, "binding">;
export declare class SerialPortMock extends SerialPortStream<MockBindingInterface> {
    static list: () => Promise<import("@serialport/bindings-interface").PortInfo[]>;
    static readonly binding: MockBindingInterface;
    constructor(options: SerialPortMockOpenOptions, openCallback?: ErrorCallback);
}
//# sourceMappingURL=SerialPortMock.d.ts.map