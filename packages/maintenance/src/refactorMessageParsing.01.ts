import fs from "node:fs/promises";
import {
	type Node,
	Project,
	SyntaxKind,
	VariableDeclarationKind,
} from "ts-morph";

async function main() {
	const project = new Project({
		tsConfigFilePath: "packages/zwave-js/tsconfig.json",
	});
	// project.addSourceFilesAtPaths("packages/cc/src/cc/**/*CC.ts");

	const sourceFiles = project.getSourceFiles().filter((file) =>
		file.getFilePath().includes("lib/serialapi/")
	);
	for (const file of sourceFiles) {
		// const filePath = path.relative(process.cwd(), file.getFilePath());

		// Remove `extends MessageBaseOptions`
		const ifaceExtends = file.getDescendantsOfKind(
			SyntaxKind.InterfaceDeclaration,
		)
			.map((iface) =>
				[
					iface,
					iface.getExtends().filter((ext) =>
						ext.getText() === "MessageBaseOptions"
					),
				] as const
			)
			.filter(([, exts]) => exts.length > 0);
		for (const [self, exts] of ifaceExtends) {
			for (const ext of exts) {
				self.removeExtends(ext);
				self.toggleModifier("export", true);
			}
		}

		const msgImplementations = file.getDescendantsOfKind(
			SyntaxKind.ClassDeclaration,
		).filter((cls) => {
			if (cls.getExtends()?.getText() === "Message") return true;

			const name = cls.getName();
			if (!name) return false;
			// if (name.endsWith("Base")) return false;
			return name.includes("Request")
				|| name.endsWith("Response")
				|| name.endsWith("TransmitReport")
				|| name.endsWith("StatusReport")
				|| name.endsWith("Callback");
		});
		const ctors = msgImplementations.map((cls) => {
			const ctors = cls.getConstructors();
			if (ctors.length !== 1) return;
			const ctor = ctors[0];

			// Make sure we have exactly one parameter
			const ctorParams = ctor.getParameters();
			if (ctorParams.length !== 1) return;
			const ctorParam = ctorParams[0];

			if (cls.getName()!.startsWith("SendDataMulticastRequest")) debugger;

			// with a union type where one is MessageDeserializationOptions
			const types = ctorParam.getDescendantsOfKind(
				SyntaxKind.TypeReference,
			).map((t) => t.getText());
			let otherType: string | undefined;
			if (
				types.length === 1
				&& types[0] === "MessageDeserializationOptions"
			) {
				// No other type, need to implement the constructor too
				// There is also no if statement
				return [cls.getName(), ctor, undefined, undefined] as const;
			} else if (
				types.length === 1
				&& types[0] === "MessageOptions"
			) {
				// Actually MessageBaseOptions | MessageDeserializationOptions
				otherType = "MessageBaseOptions";
			} else if (
				types.length === 2
				&& types.includes("MessageDeserializationOptions")
			) {
				// ABCOptions | MessageDeserializationOptions
				otherType = types.find(
					(type) => type !== "MessageDeserializationOptions",
				);
			} else if (
				types.length === 3
				&& types.includes("MessageDeserializationOptions")
				&& types.some((generic) =>
					types.some((type) => type.includes(`<${generic}>`))
				)
			) {
				// ABCOptions<Foo> | MessageDeserializationOptions
				otherType = types.find(
					(type) =>
						types.some((other) => type.includes(`<${other}>`)),
				);
			} else if (
				types.length === 3
				&& types.includes("MessageDeserializationOptions")
				&& types.includes("MessageBaseOptions")
			) {
				// (ABCOptions & MessageBaseOptions) | MessageDeserializationOptions
				otherType = types.find(
					(type) =>
						type !== "MessageDeserializationOptions"
						&& type !== "MessageBaseOptions",
				);
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

		// Add required imports
		const hasRawImport = file.getImportDeclarations().some(
			(decl) =>
				decl.getNamedImports().some((imp) =>
					imp.getName() === "MessageRaw"
				),
		);
		if (!hasRawImport) {
			const existing = file.getImportDeclaration((decl) =>
				decl.getModuleSpecifierValue().startsWith("@zwave-js/serial")
			);
			if (!existing) {
				file.addImportDeclaration({
					moduleSpecifier: "@zwave-js/serial",
					namedImports: [{
						name: "MessageRaw",
						isTypeOnly: true,
					}],
				});
			} else {
				existing.addNamedImport({
					name: "MessageRaw",
					isTypeOnly: true,
				});
			}
		}

		const hasContextImport = file.getImportDeclarations().some(
			(decl) =>
				decl.getNamedImports().some((imp) =>
					imp.getName() === "MessageParsingContext"
				),
		);
		if (!hasContextImport) {
			const existing = file.getImportDeclaration((decl) =>
				decl.getModuleSpecifierValue().startsWith("@zwave-js/serial")
			);
			if (!existing) {
				file.addImportDeclaration({
					moduleSpecifier: "@zwave-js/serial",
					namedImports: [{
						name: "MessageParsingContext",
						isTypeOnly: true,
					}],
				});
			} else {
				existing.addNamedImport({
					name: "MessageParsingContext",
					isTypeOnly: true,
				});
			}
		}

		// Remove old imports
		const oldImports = file.getImportDeclarations().flatMap((decl) =>
			decl.getNamedImports().filter(
				(imp) =>
					imp.getName() === "MessageDeserializationOptions"
					|| imp.getName() === "gotDeserializationOptions",
			)
		);
		for (const imp of oldImports) {
			imp.remove();
		}

		for (const [clsName, ctor, otherType, ifStatement] of ctors) {
			// Update the constructor signature
			if (otherType === "MessageBaseOptions") {
				ctor.getParameters()[0].setType(
					"MessageBaseOptions",
				);
			} else if (otherType) {
				ctor.getParameters()[0].setType(
					otherType + " & MessageBaseOptions",
				);
			} else {
				ctor.getParameters()[0].setType(
					`${clsName}Options & MessageBaseOptions`,
				);
			}

			// Replace "this.payload" with "raw.payload"
			const methodBody = ctor.getBody()!.asKind(SyntaxKind.Block)!;
			methodBody
				?.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
				.filter((expr) => expr.getText() === "this.payload")
				.forEach((expr) => {
					expr.replaceWithText("raw.payload");
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
					if (
						identifier === "ownNodeId"
						|| identifier === "_ownNodeId"
					) return;
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

			// Replace all occurences of this.xxx with just xxx
			const thisAccesses = parseImplBlock.getDescendantsOfKind(
				SyntaxKind.PropertyAccessExpression,
			)
				.filter((expr) =>
					!!expr.getExpressionIfKind(SyntaxKind.ThisKeyword)
				);
			for (const expr of thisAccesses) {
				expr.replaceWithText(expr.getName());
			}

			// Replace options.ctx with ctx
			const optionsDotCtx = parseImplBlock.getDescendantsOfKind(
				SyntaxKind.PropertyAccessExpression,
			)
				.filter((expr) => expr.getText() === "options.ctx");
			for (const expr of optionsDotCtx) {
				expr.replaceWithText("ctx");
			}

			// Add a new parse method after the constructor
			const ctorIndex = ctor.getChildIndex();
			const method = ctor.getParent().insertMethod(ctorIndex + 1, {
				name: "from",
				parameters: [{
					name: "raw",
					type: "MessageRaw",
				}, {
					name: "ctx",
					type: "MessageParsingContext",
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
