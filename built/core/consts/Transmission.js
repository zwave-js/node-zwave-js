"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUnsupervisedOrSucceeded = exports.supervisedCommandFailed = exports.supervisedCommandSucceeded = exports.isSupervisionResult = exports.SupervisionStatus = exports.EncapsulationFlags = exports.rssiToString = exports.averageRSSI = exports.isRssiError = exports.RssiError = exports.TransmitStatus = exports.TransmitOptions = exports.isMessagePriority = exports.MessagePriority = void 0;
const typeguards_1 = require("alcalzone-shared/typeguards");
/** The priority of messages, sorted from high (0) to low (>0) */
var MessagePriority;
(function (MessagePriority) {
    // Outgoing nonces have the highest priority because they are part of other transactions
    // which may already be in progress.
    // Some nodes don't respond to our requests if they are waiting for a nonce, so those need to be handled first.
    MessagePriority[MessagePriority["Nonce"] = 0] = "Nonce";
    // Controller commands usually finish quickly and should be preferred over node queries
    MessagePriority[MessagePriority["Controller"] = 1] = "Controller";
    // Multistep controller commands typically require user interaction but still
    // should happen at a higher priority than any node data exchange
    MessagePriority[MessagePriority["MultistepController"] = 2] = "MultistepController";
    // Supervision responses must be prioritized over other messages because the nodes requesting them
    // will get impatient otherwise.
    MessagePriority[MessagePriority["Supervision"] = 3] = "Supervision";
    // Pings (NoOP) are used for device probing at startup and for network diagnostics
    MessagePriority[MessagePriority["Ping"] = 4] = "Ping";
    // Whenever sleeping devices wake up, their queued messages must be handled quickly
    // because they want to go to sleep soon. So prioritize them over non-sleeping devices
    MessagePriority[MessagePriority["WakeUp"] = 5] = "WakeUp";
    // Normal operation and node data exchange
    MessagePriority[MessagePriority["Normal"] = 6] = "Normal";
    // Node querying is expensive and happens whenever a new node is discovered.
    // In order to keep the system responsive, give them a lower priority
    MessagePriority[MessagePriority["NodeQuery"] = 7] = "NodeQuery";
    // Some devices need their state to be polled at regular intervals. Only do that when
    // nothing else needs to be done
    MessagePriority[MessagePriority["Poll"] = 8] = "Poll";
})(MessagePriority = exports.MessagePriority || (exports.MessagePriority = {}));
function isMessagePriority(val) {
    return typeof val === "number" && val in MessagePriority;
}
exports.isMessagePriority = isMessagePriority;
var TransmitOptions;
(function (TransmitOptions) {
    TransmitOptions[TransmitOptions["NotSet"] = 0] = "NotSet";
    TransmitOptions[TransmitOptions["ACK"] = 1] = "ACK";
    TransmitOptions[TransmitOptions["LowPower"] = 2] = "LowPower";
    TransmitOptions[TransmitOptions["AutoRoute"] = 4] = "AutoRoute";
    TransmitOptions[TransmitOptions["NoRoute"] = 16] = "NoRoute";
    TransmitOptions[TransmitOptions["Explore"] = 32] = "Explore";
    TransmitOptions[TransmitOptions["DEFAULT"] = 37] = "DEFAULT";
    TransmitOptions[TransmitOptions["DEFAULT_NOACK"] = 36] = "DEFAULT_NOACK";
})(TransmitOptions = exports.TransmitOptions || (exports.TransmitOptions = {}));
var TransmitStatus;
(function (TransmitStatus) {
    TransmitStatus[TransmitStatus["OK"] = 0] = "OK";
    TransmitStatus[TransmitStatus["NoAck"] = 1] = "NoAck";
    TransmitStatus[TransmitStatus["Fail"] = 2] = "Fail";
    TransmitStatus[TransmitStatus["NotIdle"] = 3] = "NotIdle";
    TransmitStatus[TransmitStatus["NoRoute"] = 4] = "NoRoute";
})(TransmitStatus = exports.TransmitStatus || (exports.TransmitStatus = {}));
var RssiError;
(function (RssiError) {
    RssiError[RssiError["NotAvailable"] = 127] = "NotAvailable";
    RssiError[RssiError["ReceiverSaturated"] = 126] = "ReceiverSaturated";
    RssiError[RssiError["NoSignalDetected"] = 125] = "NoSignalDetected";
})(RssiError = exports.RssiError || (exports.RssiError = {}));
function isRssiError(rssi) {
    return rssi >= RssiError.NoSignalDetected;
}
exports.isRssiError = isRssiError;
/** Averages RSSI measurements using an exponential moving average with the given weight for the accumulator */
function averageRSSI(acc, rssi, weight) {
    if (isRssiError(rssi)) {
        switch (rssi) {
            case RssiError.NotAvailable:
                // If we don't have a value yet, return 0
                return acc ?? 0;
            case RssiError.ReceiverSaturated:
                // Assume rssi is 0 dBm
                rssi = 0;
                break;
            case RssiError.NoSignalDetected:
                // Assume rssi is -128 dBm
                rssi = -128;
                break;
        }
    }
    if (acc == undefined)
        return rssi;
    return Math.round(acc * weight + rssi * (1 - weight));
}
exports.averageRSSI = averageRSSI;
/**
 * Converts an RSSI value to a human readable format, i.e. the measurement including the unit or the corresponding error message.
 */
function rssiToString(rssi) {
    switch (rssi) {
        case RssiError.NotAvailable:
            return "N/A";
        case RssiError.ReceiverSaturated:
            return "Receiver saturated";
        case RssiError.NoSignalDetected:
            return "No signal detected";
        default:
            return `${rssi} dBm`;
    }
}
exports.rssiToString = rssiToString;
var EncapsulationFlags;
(function (EncapsulationFlags) {
    EncapsulationFlags[EncapsulationFlags["None"] = 0] = "None";
    EncapsulationFlags[EncapsulationFlags["Supervision"] = 1] = "Supervision";
    // Multi Channel is tracked through the endpoint index
    EncapsulationFlags[EncapsulationFlags["Security"] = 2] = "Security";
    EncapsulationFlags[EncapsulationFlags["CRC16"] = 4] = "CRC16";
})(EncapsulationFlags = exports.EncapsulationFlags || (exports.EncapsulationFlags = {}));
var SupervisionStatus;
(function (SupervisionStatus) {
    SupervisionStatus[SupervisionStatus["NoSupport"] = 0] = "NoSupport";
    SupervisionStatus[SupervisionStatus["Working"] = 1] = "Working";
    SupervisionStatus[SupervisionStatus["Fail"] = 2] = "Fail";
    SupervisionStatus[SupervisionStatus["Success"] = 255] = "Success";
})(SupervisionStatus = exports.SupervisionStatus || (exports.SupervisionStatus = {}));
function isSupervisionResult(obj) {
    return ((0, typeguards_1.isObject)(obj) &&
        "status" in obj &&
        typeof SupervisionStatus[obj.status] === "string");
}
exports.isSupervisionResult = isSupervisionResult;
function supervisedCommandSucceeded(result) {
    return (isSupervisionResult(result) &&
        (result.status === SupervisionStatus.Success ||
            result.status === SupervisionStatus.Working));
}
exports.supervisedCommandSucceeded = supervisedCommandSucceeded;
function supervisedCommandFailed(result) {
    return (isSupervisionResult(result) &&
        (result.status === SupervisionStatus.Fail ||
            result.status === SupervisionStatus.NoSupport));
}
exports.supervisedCommandFailed = supervisedCommandFailed;
function isUnsupervisedOrSucceeded(result) {
    return !result || supervisedCommandSucceeded(result);
}
exports.isUnsupervisedOrSucceeded = isUnsupervisedOrSucceeded;
//# sourceMappingURL=Transmission.js.map