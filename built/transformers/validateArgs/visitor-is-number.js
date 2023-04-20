"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitType = void 0;
const tsutils = __importStar(require("tsutils/typeguard/3.0"));
const typescript_1 = __importDefault(require("typescript"));
const VisitorUtils = __importStar(require("./visitor-utils"));
function visitRegularObjectType() {
    return false;
}
function visitTupleObjectType() {
    return false;
}
function visitArrayObjectType() {
    return false;
}
function visitObjectType(type, visitorContext) {
    if (tsutils.isTupleType(type)) {
        // Tuple with finite length.
        return visitTupleObjectType();
    }
    else if (visitorContext.checker.getIndexTypeOfType(type, typescript_1.default.IndexKind.Number)) {
        // Index type is number -> array type.
        return visitArrayObjectType();
    }
    else {
        // Index type is string -> regular object type.
        return visitRegularObjectType();
    }
}
function visitUnionOrIntersectionType(type, visitorContext) {
    const numberTypes = type.types.map((type) => visitType(type, visitorContext));
    if (tsutils.isUnionType(type)) {
        if (numberTypes.some((numberType) => numberType === false)) {
            return false;
        }
        if (numberTypes.some((numberType) => numberType === true)) {
            return true;
        }
        const numbers = new Set();
        for (const numberType of numberTypes) {
            for (const value of numberType) {
                numbers.add(value);
            }
        }
        return numbers;
    }
    else {
        const numbers = new Set();
        for (const numberType of numberTypes) {
            if (typeof numberType !== "boolean") {
                for (const value of numberType) {
                    numbers.add(value);
                }
            }
        }
        if (numbers.size === 1) {
            return numbers;
        }
        if (numbers.size > 1) {
            return false;
        }
        if (numberTypes.some((numberType) => numberType === true)) {
            return true;
        }
        return false;
    }
}
function visitIndexType() {
    // TODO: implement a visitor that checks if the index type is an array/tuple, then this can be a number.
    throw new Error("Not yet implemented.");
}
function visitNonPrimitiveType() {
    return false;
}
function visitLiteralType(type) {
    if (typeof type.value === "string") {
        return false;
    }
    else if (typeof type.value === "number") {
        return new Set([type.value]);
    }
    else {
        throw new Error("Type value is expected to be a string or number.");
    }
}
function visitTypeReference(type, visitorContext) {
    const mapping = VisitorUtils.getTypeReferenceMapping(type, visitorContext);
    const previousTypeReference = visitorContext.previousTypeReference;
    visitorContext.typeMapperStack.push(mapping);
    visitorContext.previousTypeReference = type;
    const result = visitType(type.target, visitorContext);
    visitorContext.previousTypeReference = previousTypeReference;
    visitorContext.typeMapperStack.pop();
    return result;
}
function visitTypeParameter(type, visitorContext) {
    const mappedType = VisitorUtils.getResolvedTypeParameter(type, visitorContext);
    if (mappedType === undefined) {
        throw new Error("Unbound type parameter, missing type node.");
    }
    return visitType(mappedType, visitorContext);
}
function visitBigInt() {
    return false;
}
function visitBoolean() {
    return false;
}
function visitString() {
    return false;
}
function visitBooleanLiteral() {
    return false;
}
function visitNumber() {
    return true;
}
function visitUndefined() {
    return false;
}
function visitNull() {
    return false;
}
function visitNever() {
    return false;
}
function visitUnknown() {
    return false;
}
function visitAny() {
    return true;
}
function visitType(type, visitorContext) {
    if ((typescript_1.default.TypeFlags.Any & type.flags) !== 0) {
        // Any
        return visitAny();
    }
    else if ((typescript_1.default.TypeFlags.Unknown & type.flags) !== 0) {
        // Unknown
        return visitUnknown();
    }
    else if ((typescript_1.default.TypeFlags.Never & type.flags) !== 0) {
        // Never
        return visitNever();
    }
    else if ((typescript_1.default.TypeFlags.Null & type.flags) !== 0) {
        // Null
        return visitNull();
    }
    else if ((typescript_1.default.TypeFlags.Undefined & type.flags) !== 0) {
        // Undefined
        return visitUndefined();
    }
    else if ((typescript_1.default.TypeFlags.Number & type.flags) !== 0) {
        // Number
        return visitNumber();
    }
    else if (VisitorUtils.isBigIntType(type)) {
        // BigInt
        return visitBigInt();
    }
    else if ((typescript_1.default.TypeFlags.Boolean & type.flags) !== 0) {
        // Boolean
        return visitBoolean();
    }
    else if ((typescript_1.default.TypeFlags.String & type.flags) !== 0) {
        // String
        return visitString();
    }
    else if ((typescript_1.default.TypeFlags.BooleanLiteral & type.flags) !== 0) {
        // Boolean literal (true/false)
        return visitBooleanLiteral();
    }
    else if (tsutils.isTypeReference(type) &&
        visitorContext.previousTypeReference !== type) {
        // Type references.
        return visitTypeReference(type, visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.TypeParameter & type.flags) !== 0) {
        // Type parameter
        return visitTypeParameter(type, visitorContext);
    }
    else if (tsutils.isObjectType(type)) {
        // Object type (including interfaces, arrays, tuples)
        return visitObjectType(type, visitorContext);
    }
    else if (tsutils.isLiteralType(type)) {
        // Literal string/number types ('foo')
        return visitLiteralType(type);
    }
    else if (tsutils.isUnionOrIntersectionType(type)) {
        // Union or intersection type (| or &)
        return visitUnionOrIntersectionType(type, visitorContext);
    }
    else if ((typescript_1.default.TypeFlags.NonPrimitive & type.flags) !== 0) {
        // Non-primitive such as object
        return visitNonPrimitiveType();
    }
    else if ((typescript_1.default.TypeFlags.Index & type.flags) !== 0) {
        // Index type: keyof T
        return visitIndexType();
    }
    else if (tsutils.isIndexedAccessType(type)) {
        // Indexed access type: T[U]
        // return visitIndexedAccessType(type, visitorContext);
        // TODO:
        throw new Error("Not yet implemented.");
    }
    else {
        throw new Error(`Could not generate type-check; unsupported type with flags: ${type.flags}`);
    }
}
exports.visitType = visitType;
//# sourceMappingURL=visitor-is-number.js.map