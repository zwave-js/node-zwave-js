export interface ValidateArgsOptions {
    /**
     * Enable strict value checks for numeric enums. By default, a numeric enum will accept any number.
     * Turning this flag on will ensure that the passed value is one of the defined enum members.
     */
    strictEnums?: boolean;
}
/** Generates code at build time which validates all arguments of this method */
export declare function validateArgs(options?: ValidateArgsOptions): PropertyDecorator;
import transformer from "./validateArgs/transformer";
export default transformer;
//# sourceMappingURL=index.d.ts.map