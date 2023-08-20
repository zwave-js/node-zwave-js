import type tslib from "typescript/lib/tsserverlibrary";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function init(modules: { typescript: typeof tslib }) {
	const ts = modules.typescript;

	function findChildContainingPosition(
		sourceFile: tslib.SourceFile,
		position: number,
	): tslib.Node | undefined {
		function find(node: tslib.Node): tslib.Node | undefined {
			const text = sourceFile.text.slice(node.getStart(), node.getEnd());
			if (position >= node.getStart() && position <= node.getEnd()) {
				return ts.forEachChild(node, find) || node;
			}
		}
		return find(sourceFile);
	}

	function create(info: tslib.server.PluginCreateInfo) {
		// Get a list of things to remove from the completion list from the config object.
		// If nothing was specified, we'll just remove 'caller'
		const whatToRemove: string[] = info.config.remove || ["caller"];

		// Diagnostic logging
		info.project.projectService.logger.info(
			"I'm getting set up now! Check the log for this message.",
		);

		// Set up decorator object
		const proxy: tslib.LanguageService = Object.create(null);
		for (const k of Object.keys(info.languageService) as Array<
			keyof tslib.LanguageService
		>) {
			const x = info.languageService[k]!;
			// @ts-expect-error - JS runtime trickery which is tricky to type tersely
			// prettier-ignore
			// eslint-disable-next-line @typescript-eslint/ban-types
			proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args);
		}

		// Remove specified entries from completion list
		proxy.getCompletionsAtPosition = (fileName, position, options) => {
			const prior = info.languageService.getCompletionsAtPosition(
				fileName,
				position,
				options,
			);
			if (!prior) return;

			const program = info.languageService.getProgram();
			const sourceFile = program?.getSourceFile(fileName);
			const checker = program?.getTypeChecker();

			if (!sourceFile || !checker) return;

			const node = findChildContainingPosition(sourceFile, position);
			if (!node) return;

			const siblings = node.parent.getChildren();
			const index = siblings.indexOf(node);
			let dot: tslib.Node | undefined;
			let thing: tslib.Node | undefined;
			if (
				index >= 2 &&
				siblings[index - 1]?.kind === ts.SyntaxKind.DotToken
			) {
				dot = siblings[index - 1];
				thing = siblings[index - 2];
			} else {
				return prior;
			}

			// What is being auto-completed on?
			const typeOfThing = checker.getTypeAtLocation(thing);
			const symbolOfThing = typeOfThing.getSymbol();

			const isCCAPIs =
				symbolOfThing?.name === "CCAPIs" &&
				symbolOfThing.flags === ts.SymbolFlags.Interface &&
				symbolOfThing.declarations?.[0].getSourceFile().fileName ===
					"/home/dominic/Repositories/node-zwave-js/packages/cc/build/lib/API.d.ts";

			// const isZWaveController =
			// 	symbolOfThing?.name === "ZWaveController" &&
			// 	symbolOfThing.valueDeclaration?.kind ===
			// 		ts.SyntaxKind.ClassDeclaration &&
			// 	symbolOfThing.valueDeclaration.getSourceFile().fileName ===
			// 		"/home/dominic/Repositories/node-zwave-js/packages/zwave-js/src/lib/controller/Controller.ts";

			if (isCCAPIs) {
				return {
					...prior,
					entries: [
						...prior.entries,
						{
							name: "AAABB",
							kind: ts.ScriptElementKind.memberVariableElement,
							kindModifiers:
								ts.ScriptElementKindModifier.ambientModifier,
							insertText: `["AAA BB"]`,
							sortText: "AAA BB",
							replacementSpan: {
								start: dot.getStart(),
								length: position - dot.getStart(),
							},
						},
						{
							name: "AAACC",
							kind: ts.ScriptElementKind.memberVariableElement,
							kindModifiers:
								ts.ScriptElementKindModifier.ambientModifier,
							insertText: "AAACC",
							sortText: "AAACC",
						},
					],
				};
			} else {
				return prior;
			}
		};

		return proxy;
	}

	return { create };
}

/** from given position we find the child node that contains it */
export = init;
