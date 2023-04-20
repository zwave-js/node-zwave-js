import { ZWaveLogContainer } from "@zwave-js/core";
import { SerialPort } from "serialport";
import { ZWaveSerialPortBase } from "./ZWaveSerialPortBase";
/** The default version of the Z-Wave serial binding that works using node-serialport */
export declare class ZWaveSerialPort extends ZWaveSerialPortBase {
    constructor(port: string, loggers: ZWaveLogContainer, Binding?: typeof SerialPort);
    get isOpen(): boolean;
}
//# sourceMappingURL=ZWaveSerialPort.d.ts.map