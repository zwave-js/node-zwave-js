"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneActivationCCSet = exports.SceneActivationCC = exports.SceneActivationCCAPI = exports.SceneActivationCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__number = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    return _number($o);
};
const __assertType__optional_su__string__2_eu = $o => {
    function _string($o) {
        return typeof $o !== "string" ? {} : null;
    }
    function _2($o) {
        return !($o instanceof require("@zwave-js/core/safe").Duration) ? {} : null;
    }
    function su__string__2_eu($o) {
        const conditions = [_string, _2];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function optional_su__string__2_eu($o) {
        if ($o !== undefined) {
            const error = su__string__2_eu($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional_su__string__2_eu($o);
};
const safe_1 = require("@zwave-js/core/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.SceneActivationCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Scene Activation"], {
        ...Values_1.V.staticProperty("sceneId", {
            ...safe_1.ValueMetadata.UInt8,
            min: 1,
            label: "Scene ID",
            valueChangeOptions: ["transitionDuration"],
        }, { stateful: false }),
        ...Values_1.V.staticProperty("dimmingDuration", {
            ...safe_1.ValueMetadata.Duration,
            label: "Dimming duration",
        }),
    }),
});
// @noInterview This CC is write-only
let SceneActivationCCAPI = class SceneActivationCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value, options) => {
            if (property !== "sceneId") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (typeof value !== "number") {
                (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
            }
            const duration = safe_1.Duration.from(options?.transitionDuration);
            return this.set(value, duration);
        };
    }
    supportsCommand(_cmd) {
        // There is only one mandatory command
        return true;
    }
    /**
     * Activates the Scene with the given ID
     * @param duration The duration specifying how long the transition should take. Can be a Duration instance or a user-friendly duration string like `"1m17s"`.
     */
    async set(sceneId, dimmingDuration) {
        __assertType("sceneId", "number", __assertType__number.bind(void 0, sceneId));
        __assertType("dimmingDuration", undefined, __assertType__optional_su__string__2_eu.bind(void 0, dimmingDuration));
        this.assertSupportsCommand(_Types_1.SceneActivationCommand, _Types_1.SceneActivationCommand.Set);
        const cc = new SceneActivationCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            sceneId,
            dimmingDuration,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.SET_VALUE;
SceneActivationCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Scene Activation"])
], SceneActivationCCAPI);
exports.SceneActivationCCAPI = SceneActivationCCAPI;
let SceneActivationCC = class SceneActivationCC extends CommandClass_1.CommandClass {
};
SceneActivationCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Scene Activation"]),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.SceneActivationCCValues)
], SceneActivationCC);
exports.SceneActivationCC = SceneActivationCC;
let SceneActivationCCSet = class SceneActivationCCSet extends SceneActivationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.sceneId = this.payload[0];
            // Per the specs, dimmingDuration is required, but as always the real world is different...
            if (this.payload.length >= 2) {
                this.dimmingDuration = safe_1.Duration.parseSet(this.payload[1]);
            }
            else {
                this.dimmingDuration = undefined;
            }
            (0, safe_1.validatePayload)(this.sceneId >= 1, this.sceneId <= 255);
        }
        else {
            this.sceneId = options.sceneId;
            this.dimmingDuration = safe_1.Duration.from(options.dimmingDuration);
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.sceneId,
            this.dimmingDuration?.serializeSet() ?? 0xff,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = { "scene id": this.sceneId };
        if (this.dimmingDuration != undefined) {
            message["dimming duration"] = this.dimmingDuration.toString();
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.SceneActivationCCValues.sceneId)
], SceneActivationCCSet.prototype, "sceneId", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.SceneActivationCCValues.dimmingDuration)
], SceneActivationCCSet.prototype, "dimmingDuration", void 0);
SceneActivationCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SceneActivationCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], SceneActivationCCSet);
exports.SceneActivationCCSet = SceneActivationCCSet;
//# sourceMappingURL=SceneActivationCC.js.map