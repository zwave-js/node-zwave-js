"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHighestSecurityClass = exports.securityClassOrder = exports.securityClassIsS2 = exports.SecurityClass = void 0;
var SecurityClass;
(function (SecurityClass) {
    /**
     * Used internally during inclusion of a node. Don't use this!
     */
    SecurityClass[SecurityClass["Temporary"] = -2] = "Temporary";
    /**
     * `None` is used to indicate that a node is included without security.
     * It is not meant as input to methods that accept a security class.
     */
    SecurityClass[SecurityClass["None"] = -1] = "None";
    SecurityClass[SecurityClass["S2_Unauthenticated"] = 0] = "S2_Unauthenticated";
    SecurityClass[SecurityClass["S2_Authenticated"] = 1] = "S2_Authenticated";
    SecurityClass[SecurityClass["S2_AccessControl"] = 2] = "S2_AccessControl";
    SecurityClass[SecurityClass["S0_Legacy"] = 7] = "S0_Legacy";
})(SecurityClass = exports.SecurityClass || (exports.SecurityClass = {}));
/** Tests if the given security class is S2 */
function securityClassIsS2(secClass) {
    return (secClass != undefined &&
        secClass >= SecurityClass.S2_Unauthenticated &&
        secClass <= SecurityClass.S2_AccessControl);
}
exports.securityClassIsS2 = securityClassIsS2;
/** An array of security classes, ordered from high (index 0) to low (index > 0) */
exports.securityClassOrder = [
    SecurityClass.S2_AccessControl,
    SecurityClass.S2_Authenticated,
    SecurityClass.S2_Unauthenticated,
    SecurityClass.S0_Legacy,
];
function getHighestSecurityClass(securityClasses) {
    for (const cls of exports.securityClassOrder) {
        if (securityClasses.includes(cls))
            return cls;
    }
    return SecurityClass.None;
}
exports.getHighestSecurityClass = getHighestSecurityClass;
//# sourceMappingURL=SecurityClass.js.map