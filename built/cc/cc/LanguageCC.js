"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageCCGet = exports.LanguageCCReport = exports.LanguageCCSet = exports.LanguageCC = exports.LanguageCCAPI = exports.LanguageCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__string = $o => {
    function _string($o) {
        return typeof $o !== "string" ? {} : null;
    }
    return _string($o);
};
const __assertType__optional_string = $o => {
    function _string($o) {
        return typeof $o !== "string" ? {} : null;
    }
    function optional__string($o) {
        if ($o !== undefined) {
            const error = _string($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional__string($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.LanguageCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses.Language, {
        ...Values_1.V.staticProperty("language", {
            ...safe_1.ValueMetadata.ReadOnlyString,
            label: "Language code",
        }),
        ...Values_1.V.staticProperty("country", {
            ...safe_1.ValueMetadata.ReadOnlyString,
            label: "Country code",
        }),
    }),
});
// @noSetValueAPI It doesn't make sense
let LanguageCCAPI = class LanguageCCAPI extends API_1.CCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.LanguageCommand.Get:
                return this.isSinglecast();
            case _Types_1.LanguageCommand.Set:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.LanguageCommand, _Types_1.LanguageCommand.Get);
        const cc = new LanguageCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["language", "country"]);
        }
    }
    async set(language, country) {
        __assertType("language", "string", __assertType__string.bind(void 0, language));
        __assertType("country", "(optional) string", __assertType__optional_string.bind(void 0, country));
        this.assertSupportsCommand(_Types_1.LanguageCommand, _Types_1.LanguageCommand.Set);
        const cc = new LanguageCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            language,
            country,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
LanguageCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Language)
], LanguageCCAPI);
exports.LanguageCCAPI = LanguageCCAPI;
let LanguageCC = class LanguageCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Language, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            message: "requesting language setting...",
            direction: "outbound",
        });
        const resp = await api.get();
        if (resp) {
            const { language, country } = resp;
            const logMessage = `received current language setting: ${language}${country != undefined ? `-${country}` : ""}`;
            applHost.controllerLog.logNode(node.id, {
                message: logMessage,
                direction: "inbound",
            });
        }
    }
};
LanguageCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Language),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.LanguageCCValues)
], LanguageCC);
exports.LanguageCC = LanguageCC;
let LanguageCCSet = class LanguageCCSet extends LanguageCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            // Populate properties from options object
            this._language = options.language;
            this._country = options.country;
        }
    }
    get language() {
        return this._language;
    }
    set language(value) {
        if (value.length !== 3 || value.toLowerCase() !== value) {
            throw new safe_1.ZWaveError("language must be a 3 digit (lowercase) code according to ISO 639-2", safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        this._language = value;
    }
    get country() {
        return this._country;
    }
    set country(value) {
        if (typeof value === "string" &&
            (value.length !== 2 || value.toUpperCase() !== value)) {
            throw new safe_1.ZWaveError("country must be a 2 digit (uppercase) code according to ISO 3166-1", safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        this._country = value;
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(!!this._country ? 5 : 3);
        this.payload.write(this._language, 0, "ascii");
        if (!!this._country)
            this.payload.write(this._country, 3, "ascii");
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = { language: this.language };
        if (this._country != undefined) {
            message.country = this._country;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
LanguageCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.LanguageCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], LanguageCCSet);
exports.LanguageCCSet = LanguageCCSet;
let LanguageCCReport = class LanguageCCReport extends LanguageCC {
    constructor(host, options) {
        super(host, options);
        // if (gotDeserializationOptions(options)) {
        (0, safe_1.validatePayload)(this.payload.length >= 3);
        this.language = this.payload.toString("ascii", 0, 3);
        if (this.payload.length >= 5) {
            this.country = this.payload.toString("ascii", 3, 5);
        }
        // }
    }
    toLogEntry(applHost) {
        const message = { language: this.language };
        if (this.country != undefined) {
            message.country = this.country;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.LanguageCCValues.language)
], LanguageCCReport.prototype, "language", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.LanguageCCValues.country)
], LanguageCCReport.prototype, "country", void 0);
LanguageCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.LanguageCommand.Report)
], LanguageCCReport);
exports.LanguageCCReport = LanguageCCReport;
let LanguageCCGet = class LanguageCCGet extends LanguageCC {
};
LanguageCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.LanguageCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(LanguageCCReport)
], LanguageCCGet);
exports.LanguageCCGet = LanguageCCGet;
//# sourceMappingURL=LanguageCC.js.map