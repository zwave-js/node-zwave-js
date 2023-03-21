"use strict";
/*
 * Script to convert JSON config files from the old format to the new one.
 * Execute with `yarn ts packages/maintenance/src/convert-json.ts`
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@zwave-js/shared");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const ts_morph_1 = require("ts-morph");
const prettier_1 = require("./prettier");
async function main() {
    const project = new ts_morph_1.Project();
    const devicesDir = path_1.default.join(__dirname, "../../config/config/devices");
    const configFiles = await (0, shared_1.enumFilesRecursive)(devicesDir, (file) => file.endsWith(".json") &&
        !file.endsWith("index.json") &&
        !file.includes("/templates/") &&
        !file.includes("\\templates\\"));
    for (const filename of configFiles) {
        const content = await fs_extra_1.default.readFile(filename, "utf8");
        const sourceFile = project.createSourceFile(filename, content, {
            overwrite: true,
            scriptKind: ts_morph_1.ts.ScriptKind.JSON,
        });
        const root = sourceFile
            .getChildrenOfKind(ts_morph_1.ts.SyntaxKind.SyntaxList)[0]
            .getChildrenOfKind(ts_morph_1.ts.SyntaxKind.ExpressionStatement)[0]
            .getChildrenOfKind(ts_morph_1.ts.SyntaxKind.ObjectLiteralExpression)[0];
        let didChange = false;
        root.transform((traversal) => {
            const node = traversal.currentNode;
            // Only look for the paramInformation property
            if (node === root.compilerNode)
                return traversal.visitChildren();
            if (!ts_morph_1.ts.isPropertyAssignment(node))
                return node;
            if (node.name.getText() !== `"paramInformation"`)
                return node;
            // Make sure it hasn't already been transformed to an array
            if (!ts_morph_1.ts.isObjectLiteralExpression(node.initializer))
                return node;
            const children = node.initializer.properties.flatMap((prop) => {
                if (!ts_morph_1.ts.isPropertyAssignment(prop))
                    throw new Error("Can't touch this!");
                // We can have arrays or objects as params
                if (ts_morph_1.ts.isObjectLiteralExpression(prop.initializer)) {
                    // Objects are simple, we just add the param no. there
                    return [
                        ts_morph_1.ts.createObjectLiteral([
                            ts_morph_1.ts.createPropertyAssignment(`"#"`, ts_morph_1.ts.createStringLiteral(prop.name.getText().slice(1, -1))),
                            ...prop.initializer.properties,
                        ]),
                    ];
                }
                else if (ts_morph_1.ts.isArrayLiteralExpression(prop.initializer)) {
                    // Arrays need to be unwrapped
                    return prop.initializer.elements.map((item) => {
                        if (!ts_morph_1.ts.isObjectLiteralExpression(item))
                            throw new Error("Can't touch this!");
                        return ts_morph_1.ts.createObjectLiteral([
                            ts_morph_1.ts.createPropertyAssignment(`"#"`, ts_morph_1.ts.createStringLiteral(prop.name.getText().slice(1, -1))),
                            ...item.properties,
                        ]);
                    });
                }
                throw new Error("Can't touch this!");
            });
            didChange = true;
            return ts_morph_1.ts.updatePropertyAssignment(node, node.name, ts_morph_1.ts.createArrayLiteral(children));
        });
        if (didChange) {
            let output = sourceFile.getFullText();
            output = (0, prettier_1.formatWithPrettier)(filename, output);
            await fs_extra_1.default.writeFile(filename, output, "utf8");
        }
    }
}
if (require.main === module) {
    void main();
}
//# sourceMappingURL=convert-json.js.map