"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControllerStatisticsHost = void 0;
const Statistics_1 = require("../driver/Statistics");
class ControllerStatisticsHost extends Statistics_1.StatisticsHost {
    createEmpty() {
        return {
            messagesTX: 0,
            messagesRX: 0,
            messagesDroppedRX: 0,
            NAK: 0,
            CAN: 0,
            timeoutACK: 0,
            timeoutResponse: 0,
            timeoutCallback: 0,
            messagesDroppedTX: 0,
        };
    }
}
exports.ControllerStatisticsHost = ControllerStatisticsHost;
//# sourceMappingURL=ControllerStatistics.js.map