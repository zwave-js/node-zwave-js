"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewStage = void 0;
// prettier-ignore
var InterviewStage;
(function (InterviewStage) {
    /** The interview process hasn't started for this node */
    InterviewStage[InterviewStage["None"] = 0] = "None";
    /** The node's protocol information has been queried from the controller */
    InterviewStage[InterviewStage["ProtocolInfo"] = 1] = "ProtocolInfo";
    /** The node has been queried for supported and controlled command classes */
    InterviewStage[InterviewStage["NodeInfo"] = 2] = "NodeInfo";
    /**
     * Information for all command classes has been queried.
     * This includes static information that is requested once as well as dynamic
     * information that is requested on every restart.
     */
    InterviewStage[InterviewStage["CommandClasses"] = 3] = "CommandClasses";
    /**
     * Device information for the node has been loaded from a config file.
     * If defined, some of the reported information will be overwritten based on the
     * config file contents.
     */
    InterviewStage[InterviewStage["OverwriteConfig"] = 4] = "OverwriteConfig";
    /** The interview process has finished */
    InterviewStage[InterviewStage["Complete"] = 5] = "Complete";
})(InterviewStage = exports.InterviewStage || (exports.InterviewStage = {}));
//# sourceMappingURL=InterviewStage.js.map