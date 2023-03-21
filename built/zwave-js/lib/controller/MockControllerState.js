"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockControllerCommunicationState = exports.MockControllerStateKeys = void 0;
var MockControllerStateKeys;
(function (MockControllerStateKeys) {
    MockControllerStateKeys["CommunicationState"] = "communicationState";
})(MockControllerStateKeys = exports.MockControllerStateKeys || (exports.MockControllerStateKeys = {}));
var MockControllerCommunicationState;
(function (MockControllerCommunicationState) {
    MockControllerCommunicationState[MockControllerCommunicationState["Idle"] = 0] = "Idle";
    MockControllerCommunicationState[MockControllerCommunicationState["Sending"] = 1] = "Sending";
    MockControllerCommunicationState[MockControllerCommunicationState["WaitingForNode"] = 2] = "WaitingForNode";
})(MockControllerCommunicationState = exports.MockControllerCommunicationState || (exports.MockControllerCommunicationState = {}));
//# sourceMappingURL=MockControllerState.js.map