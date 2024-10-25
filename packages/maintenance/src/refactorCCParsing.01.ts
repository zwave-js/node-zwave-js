import fs from "node:fs/promises";
import {
	type Node,
	Project,
	SyntaxKind,
	type TypeReferenceNode,
	VariableDeclarationKind,
} from "ts-morph";

async function main() {
	const project = new Project({
		tsConfigFilePath: "packages/cc/tsconfig.json",
	});
	// project.addSourceFilesAtPaths("packages/cc/src/cc/**/*CC.ts");

	const sourceFiles = project.getSourceFiles().filter((file) =>
		file.getBaseNameWithoutExtension().endsWith("CC")
	);
	for (const file of sourceFiles) {
		// const filePath = path.relative(process.cwd(), file.getFilePath());

		const ifaceExtends = file.getDescendantsOfKind(
			SyntaxKind.InterfaceDeclaration,
		)
			.map((iface) =>
				[
					iface,
					iface.getExtends().filter((ext) =>
						ext.getText() === "CCCommandOptions"
					),
				] as const
			)
			.filter(([, exts]) => exts.length > 0);
		for (const [self, exts] of ifaceExtends) {
			for (const ext of exts) {
				self.removeExtends(ext);
			}
		}

		const ccImplementations = file.getDescendantsOfKind(
			SyntaxKind.ClassDeclaration,
		).filter((cls) => {
			const name = cls.getName();
			if (!name) return false;
			if (!name.includes("CC")) return false;
			if (name.endsWith("CC")) return false;
			return true;
		});
		const ctors = ccImplementations.map((cls) => {
			const ctors = cls.getConstructors();
			if (ctors.length !== 1) return;
			const ctor = ctors[0];

			// Make sure we have exactly one parameter
			const ctorParams = ctor.getParameters();
			if (ctorParams.length !== 1) return;
			const ctorParam = ctorParams[0];

			// with a union type where one is CommandClassDeserializationOptions
			const types = ctorParam.getDescendantsOfKind(
				SyntaxKind.TypeReference,
			);
			let otherType: TypeReferenceNode | undefined;
			if (
				types.length === 1
				&& types[0].getText() === "CommandClassDeserializationOptions"
			) {
				// No other type, need to implement the constructor too
				// There is also no if statement
				return [cls.getName(), ctor, undefined, undefined] as const;
			} else if (
				types.length === 2
				&& types.some((type) =>
					type.getText() === "CommandClassDeserializationOptions"
				)
			) {
				// ABCOptions | CommandClassDeserializationOptions
				otherType = types.find(
					(type) =>
						type.getText() !== "CommandClassDeserializationOptions",
				)!;
			} else if (
				types.length === 3
				&& types.some((type) =>
					type.getText() === "CommandClassDeserializationOptions"
				)
				&& types.some((type) => type.getText() === "CCCommandOptions")
			) {
				// (ABCOptions & CCCommandOptions) | CommandClassDeserializationOptions
				otherType = types.find(
					(type) =>
						type.getText() !== "CommandClassDeserializationOptions"
						&& type.getText() !== "CCCommandOptions",
				)!;
			} else {
				return;
			}

			// Ensure the constructor contains
			// if (gotDeserializationOptions(options)) {

			const ifStatement = ctor.getBody()
				?.getChildrenOfKind(SyntaxKind.IfStatement)
				.filter((stmt) => !!stmt.getElseStatement())
				.find((stmt) => {
					const expr = stmt.getExpression();
					if (!expr) return false;
					return expr.getText()
						=== "gotDeserializationOptions(options)";
				});
			if (!ifStatement) return;

			return [cls.getName(), ctor, otherType, ifStatement] as const;
		}).filter((ctor) => ctor != undefined);

		if (!ctors.length) continue;

		for (const [clsName, ctor, otherType, ifStatement] of ctors) {
			// Update the constructor signature
			if (otherType) {
				ctor.getParameters()[0].setType(
					otherType.getText() + " & CCCommandOptions",
				);
			} else {
				ctor.getParameters()[0].setType(
					`${clsName}Options & CCCommandOptions`,
				);
			}

			// Replace "this.payload" with just "payload"
			const methodBody = ctor.getBody()!.asKind(SyntaxKind.Block)!;
			methodBody
				?.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
				.filter((expr) => expr.getText() === "this.payload")
				.forEach((expr) => {
					expr.replaceWithText("payload");
				});

			// Replace all other assignments with let declarations
			const parseImplBlock = ifStatement
				? ifStatement.getThenStatement().asKind(
					SyntaxKind.Block,
				)!
				: methodBody;
			const assignments = parseImplBlock
				.getDescendantsOfKind(SyntaxKind.BinaryExpression)
				.map((be) => {
					if (
						be.getOperatorToken().getKind()
							!== SyntaxKind.EqualsToken
					) return;
					const left = be.getLeft();
					if (!left.isKind(SyntaxKind.PropertyAccessExpression)) {
						return;
					}
					if (
						left.getExpression().getKind()
							!== SyntaxKind.ThisKeyword
					) return;
					const stmt = be.getParentIfKind(
						SyntaxKind.ExpressionStatement,
					);
					if (!stmt) return;
					const identifier = left.getName();
					if (identifier === "nodeId") return;
					const value = be.getRight();
					return [stmt, left, identifier, value] as const;
				})
				.filter((ass) => ass != undefined);

			const properties = new Map<string, string>();
			for (const [expr, left, identifier, value] of assignments) {
				if (!properties.has(identifier)) {
					// Find the correct type to use
					let valueType: string | undefined = value.getType()
						.getText().replaceAll(
							/import\(.*?\)\./g,
							"",
						);
					const prop = ctor.getParent().getProperty(
						identifier,
					);
					if (prop) {
						valueType = prop.getType().getText().replaceAll(
							/import\(.*?\)\./g,
							"",
						);
					}
					valueType = valueType.replace(/^readonly /, "");
					// Avoid trivially inferred types
					const typeIsTrivial = valueType === "number"
						|| valueType === "number[]";

					if (expr.getParent() === parseImplBlock) {
						// Top level, create a variable declaration
						const index = expr.getChildIndex();
						parseImplBlock.insertVariableStatement(index + 1, {
							declarationKind: VariableDeclarationKind.Let,
							declarations: [{
								name: identifier,
								type: typeIsTrivial ? undefined : valueType,
								initializer: value.getFullText(),
							}],
						});
						expr.remove();
					} else {
						// Not top level, create an assignment instead
						left.replaceWithText(identifier);
						// Find the position to create the declaration
						let cur: Node = expr;
						while (cur.getParent() !== parseImplBlock) {
							cur = cur.getParent()!;
						}
						const index = cur.getChildIndex();
						parseImplBlock.insertVariableStatement(index, {
							declarationKind: VariableDeclarationKind.Let,
							declarations: [{
								name: identifier,
								type: typeIsTrivial ? undefined : valueType,
							}],
						});
					}

					properties.set(identifier, valueType);
				} else {
					left.replaceWithText(identifier);
				}
			}

			// Add a new parse method after the constructor
			const ctorIndex = ctor.getChildIndex();
			const method = ctor.getParent().insertMethod(ctorIndex + 1, {
				name: "parse",
				parameters: [{
					name: "payload",
					type: "Buffer",
				}, {
					name: "options",
					type: "CommandClassDeserializationOptions",
				}],
				isStatic: true,
				statements:
					// For parse/create constructors, take the then block
					ifStatement
						? ifStatement.getThenStatement()
							.getChildSyntaxList()!
							.getFullText()
						// else take the whole constructor without "super()"
						: methodBody.getStatementsWithComments().filter((s) =>
							!s.getText().startsWith("super(")
						).map((s) => s.getText()),
				returnType: clsName,
			}).toggleModifier("public", true);

			// Instantiate the class at the end of the parse method
			method.getFirstDescendantByKind(SyntaxKind.Block)!.addStatements(`
return new ${clsName}({
	nodeId: options.context.sourceNodeId,
	${[...properties.keys()].join(",\n")}
})`);

			if (ifStatement) {
				// Replace the `if` block with its else block
				ifStatement.replaceWithText(
					ifStatement.getElseStatement()!.getChildSyntaxList()!
						.getFullText().trimStart(),
				);
			} else {
				// preserve only the super() call
				methodBody.getStatementsWithComments().slice(1).forEach(
					(stmt) => {
						stmt.remove();
					},
				);
				// And add a best-guess implementation for the constructor
				methodBody.addStatements("\n\n// TODO: Check implementation:");
				methodBody.addStatements(
					[...properties.keys()].map((id) => {
						if (id.startsWith("_")) id = id.slice(1);
						return `this.${id} = options.${id};`;
					}).join("\n"),
				);

				// Also we probably need to define the options type
				const klass = ctor.getParent();
				file.insertInterface(klass.getChildIndex(), {
					leadingTrivia: "// @publicAPI\n",
					name: `${clsName}Options`,
					isExported: true,
					properties: [...properties.keys()].map((id) => {
						if (id.startsWith("_")) id = id.slice(1);
						return {
							name: id,
							hasQuestionToken: properties.get(id)?.includes(
								"undefined",
							),
							type: properties.get(id)?.replace(
								"| undefined",
								"",
							),
						};
					}),
				});
			}
		}

		await file.save();
	}
}

void main().catch(async (e) => {
	await fs.writeFile(`${e.filePath}.old`, e.oldText);
	await fs.writeFile(`${e.filePath}.new`, e.newText);
	console.error(`Error refactoring file ${e.filePath}
  old text: ${e.filePath}.old
  new text: ${e.filePath}.new`);

	process.exit(1);
});
