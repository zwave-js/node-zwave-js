import { describe, expect, it, vi } from "vitest";

import { ConsentRequiredError } from "../semantic/consent.js";
import type { SemanticSearchService } from "../semantic/service.js";

import { createSearchParameterDefinitionsTool } from "./searchParameterDefinitions.js";

function fakeService(
	overrides: Partial<SemanticSearchService> = {},
): SemanticSearchService {
	return {
		search: vi.fn().mockResolvedValue({
			parameters: [],
			templates: [],
		}),
		...overrides,
	} as unknown as SemanticSearchService;
}

describe("createSearchParameterDefinitionsTool", () => {
	it("exposes the documented tool name and requires query in its schema", () => {
		const tool = createSearchParameterDefinitionsTool(fakeService());
		expect(tool.name).toBe("search_parameter_definitions");
		expect(tool.inputSchema.required).toEqual(["query"]);
	});

	it("rejects a missing query without calling the service", async () => {
		const service = fakeService();
		const tool = createSearchParameterDefinitionsTool(service);
		const result = await tool.handler(undefined as any);
		expect(result.isError).toBe(true);
		expect(JSON.stringify(result.content)).toContain("invalid_argument");
		expect(service.search).not.toHaveBeenCalled();
	});

	it("rejects an empty/whitespace-only query", async () => {
		const service = fakeService();
		const tool = createSearchParameterDefinitionsTool(service);
		const result = await tool.handler({ query: "   " });
		expect(result.isError).toBe(true);
		expect(service.search).not.toHaveBeenCalled();
	});

	it("rejects an invalid kind filter", async () => {
		const service = fakeService();
		const tool = createSearchParameterDefinitionsTool(service);
		const result = await tool.handler({
			query: "ramp rate",
			kind: "bogus",
		} as any);
		expect(result.isError).toBe(true);
		expect(JSON.stringify(result.content)).toContain("kind");
		expect(service.search).not.toHaveBeenCalled();
	});

	it("clamps limit to the documented [1, 50] range and defaults to 10", async () => {
		const service = fakeService();
		const tool = createSearchParameterDefinitionsTool(service);

		await tool.handler({ query: "ramp rate" });
		expect(service.search).toHaveBeenLastCalledWith(
			"ramp rate",
			expect.anything(),
			10,
		);

		await tool.handler({ query: "ramp rate", limit: 999 });
		expect(service.search).toHaveBeenLastCalledWith(
			"ramp rate",
			expect.anything(),
			50,
		);

		await tool.handler({ query: "ramp rate", limit: 0 });
		expect(service.search).toHaveBeenLastCalledWith(
			"ramp rate",
			expect.anything(),
			1,
		);
	});

	it("passes manufacturer/purpose/kind filters through to the service", async () => {
		const service = fakeService();
		const tool = createSearchParameterDefinitionsTool(service);
		await tool.handler({
			query: "ramp rate",
			manufacturer: "Fibaro",
			purpose: "dimming.ramp_rate",
			kind: "parameter",
		} as any);
		expect(service.search).toHaveBeenCalledWith(
			"ramp rate",
			{
				manufacturer: "Fibaro",
				purpose: "dimming.ramp_rate",
				kind: "parameter",
			},
			10,
		);
	});

	it("returns the service result as JSON on success", async () => {
		const service = fakeService({
			search: vi.fn().mockResolvedValue({
				parameters: [{ id: "p1" }],
				templates: [],
			}),
		});
		const tool = createSearchParameterDefinitionsTool(service);
		const result = await tool.handler({ query: "ramp rate" });
		expect(result.isError).toBeFalsy();
		expect(JSON.stringify(result.content)).toContain("p1");
	});

	it("translates a thrown consent-required error into a structured response, not a crash", async () => {
		const service = fakeService({
			search: vi
				.fn()
				.mockRejectedValue(
					new ConsentRequiredError(
						"/cache/models",
						"/cache/consent.json",
					),
				),
		});
		const tool = createSearchParameterDefinitionsTool(service);
		const result = await tool.handler({ query: "ramp rate" });
		expect(result.isError).toBe(true);
		expect(JSON.stringify(result.content)).toContain(
			"model_download_consent_required",
		);
	});
});
