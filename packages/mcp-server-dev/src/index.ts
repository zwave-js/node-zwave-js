#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { DEVICES_DIR, resolveDeviceConfigPath } from "./configEnv.js";
import { McpToolRegistry } from "./registry.js";
import type { ConsentPrompt, ElicitConsentFn } from "./semantic/embedding.js";
import { SemanticSearchService } from "./semantic/service.js";
import {
	autofixConfigTool,
	createFindSimilarParametersTool,
	createSearchParameterDefinitionsTool,
	createSuggestParameterPurposeTool,
	findTemplateDefinitionTool,
	findTemplateReferencesTool,
	formatTool,
	lintConfigTool,
	resolveImportTool,
	resolveParamTool,
} from "./tools/index.js";
import { errorResult } from "./tools/results.js";

class DevMCPServer {
	private server: Server;
	private registry: McpToolRegistry;
	private semanticSearch: SemanticSearchService;

	constructor() {
		this.server = new Server(
			{
				name: "zwave-dev",
				version: "1.0.0",
			},
			{
				capabilities: {
					tools: {},
				},
			},
		);

		// Elicitation is a *client* capability the server merely requests via
		// server.elicitInput(); it must not be declared in the server's own
		// capabilities above. Whether it's actually supported is only known
		// after the client connects and advertises its capabilities, so this
		// getter is re-evaluated lazily, on the first local model download
		// that actually needs a consent decision.
		this.semanticSearch = new SemanticSearchService({
			getElicit: () => this.getElicitConsentFn(),
		});

		this.registry = new McpToolRegistry();
		this.registerTools();
		this.setupToolHandlers();
	}

	private getElicitConsentFn(): ElicitConsentFn | undefined {
		if (!this.server.getClientCapabilities()?.elicitation) return undefined;
		return async (prompt: ConsentPrompt) => {
			const result = await this.server.elicitInput({
				message:
					`The local semantic search model "${prompt.modelId}" `
					+ `(revision ${prompt.revision}) is not cached yet. Downloading `
					+ `it from ${prompt.source} (license: ${prompt.license}) will `
					+ `fetch approximately ${prompt.approxSizeMb} MB and store it `
					+ `under ${prompt.cacheDir}. Approve the download?`,
				requestedSchema: {
					type: "object",
					properties: {
						decision: {
							type: "string",
							title: "Model download",
							description:
								`Download and cache ${prompt.modelId}@${prompt.revision} `
								+ `(~${prompt.approxSizeMb} MB, ${prompt.license})`,
							enum: ["decline", "approve"],
							enumNames: [
								"Do not download",
								"Download and cache model",
							],
							default: "decline",
						},
					},
					required: ["decision"],
				},
			});
			if (result.action === "cancel") return { decision: "cancel" };
			return {
				decision:
					result.action === "accept"
					&& result.content?.decision === "approve"
						? "approve"
						: "decline",
			};
		};
	}

	private registerTools() {
		// Register all available tools
		this.registry.register(formatTool);
		this.registry.register(autofixConfigTool);
		this.registry.register(lintConfigTool);
		this.registry.register(resolveParamTool);
		this.registry.register(resolveImportTool);
		this.registry.register(findTemplateDefinitionTool);
		this.registry.register(findTemplateReferencesTool);
		this.registry.register(
			createSearchParameterDefinitionsTool(this.semanticSearch),
		);
		this.registry.register(
			createFindSimilarParametersTool(this.semanticSearch),
		);
		this.registry.register(
			createSuggestParameterPurposeTool(this.semanticSearch),
		);
	}

	private setupToolHandlers() {
		this.server.setRequestHandler(ListToolsRequestSchema, () => {
			return {
				tools: this.registry.getAll().map((tool) => ({
					name: tool.name,
					description: tool.description,
					inputSchema: tool.inputSchema,
					annotations: tool.annotations,
				})),
			};
		});

		this.server.setRequestHandler(
			CallToolRequestSchema,
			async (request) => {
				const { name, arguments: args } = request.params;

				const tool = this.registry.get(name);
				if (!tool) {
					throw new Error(`Unknown tool: ${name}`);
				}

				// Tools must only read and write device config files
				const pathArgs = { ...args };
				for (const key of ["filename", "templateFile"]) {
					const value = pathArgs[key];
					if (typeof value !== "string" || !value) continue;
					const resolved = await resolveDeviceConfigPath(value);
					if (!resolved) {
						return errorResult(
							`Error: ${key} must be located inside ${DEVICES_DIR}`,
						);
					}
					pathArgs[key] = resolved;
				}

				return await tool.handler(pathArgs);
			},
		);
	}

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error("Z-Wave Development MCP server running on stdio");
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const server = new DevMCPServer();
	server.run().catch((error) => {
		console.error("Server error:", error);
		process.exit(1);
	});
}
