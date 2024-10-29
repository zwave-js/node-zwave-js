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
		file.getFilePath().endsWith("ZnifferMessages.ts")
	);
	for (const file of sourceFiles) {
		// const filePath = path.relative(process.cwd(), file.getFilePath());

		const msgImplementations = file.getDescendantsOfKind(
			SyntaxKind.ClassDeclaration,
		).filter((cls) => {
			return (cls.getExtends()?.getText() === "ZnifferMessage");
		});
		const ctors = msgImplementations.map((cls) => {
			const ctors = cls.getConstructors();
			if (ctors.length !== 1) return;
			const ctor = ctors[0];

			// Make sure we have exactly one parameter
			const ctorParams = ctor.getParameters();
			if (ctorParams.length !== 1) return;
			const ctorParam = ctorParams[0];

			// with a union type where one is MessageDeserializationOptions
			const types = ctorParam.getDescendantsOfKind(
				SyntaxKind.TypeReference,
			).map((t) => t.getText());
			if (
				types.length !== 1
				|| types[0] !== "ZnifferMessageOptions"
			) {
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

			return [cls.getName(), ctor, ifStatement] as const;
		}).filter((ctor) => ctor != undefined);

		if (!ctors.length) continue;

		for (const [clsName, ctor, ifStatement] of ctors) {
			// Update the constructor signature

			ctor.getParameters()[0].setType(
				`${clsName}Options & ZnifferMessageBaseOptions`,
			);

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
					type: "ZnifferMessageRaw",
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
return new this({
	${[...properties.keys()].join(",\n")}
})`);

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
