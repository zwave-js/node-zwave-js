"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControllerFirmwareUpdateStatus = void 0;
var ControllerFirmwareUpdateStatus;
(function (ControllerFirmwareUpdateStatus) {
    // An expected response was not received from the controller in time
    ControllerFirmwareUpdateStatus[ControllerFirmwareUpdateStatus["Error_Timeout"] = 0] = "Error_Timeout";
    /** The maximum number of retry attempts for a firmware fragments were reached */
    ControllerFirmwareUpdateStatus[ControllerFirmwareUpdateStatus["Error_RetryLimitReached"] = 1] = "Error_RetryLimitReached";
    /** The update was aborted by the bootloader */
    ControllerFirmwareUpdateStatus[ControllerFirmwareUpdateStatus["Error_Aborted"] = 2] = "Error_Aborted";
    /** This controller does not support firmware updates */
    ControllerFirmwareUpdateStatus[ControllerFirmwareUpdateStatus["Error_NotSupported"] = 3] = "Error_NotSupported";
    ControllerFirmwareUpdateStatus[ControllerFirmwareUpdateStatus["OK"] = 255] = "OK";
})(ControllerFirmwareUpdateStatus = exports.ControllerFirmwareUpdateStatus || (exports.ControllerFirmwareUpdateStatus = {}));
//# sourceMappingURL=_Types.js.map