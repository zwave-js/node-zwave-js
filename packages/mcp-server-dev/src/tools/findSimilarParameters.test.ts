import { describe, expect, it, vi } from "vitest";

import {
	SemanticSearchError,
	type SemanticSearchService,
} from "../semantic/service.js";

import { createFindSimilarParametersTool } from "./findSimilarParameters.js";

function fakeService(
	overrides: Partial<SemanticSearchService> = {},
): SemanticSearchService {
	return {
		findSimilar: vi.fn().mockResolvedValue({
			parameters: [],
			templates: [],
		}),
		...overrides,
	} as unknown as SemanticSearchService;
}

describe("createFindSimilarParametersTool", () => {
	it("exposes the documented tool name and requires filename+parameter in its schema", () => {
		const tool = createFindSimilarParametersTool(fakeService());
		expect(tool.name).toBe("find_similar_parameters");
		expect(tool.inputSchema.required).toEqual(["filename", "parameter"]);
	});

	it("rejects a missing filename without calling the service", async () => {
		const service = fakeService();
		const tool = createFindSimilarParametersTool(service);
		const result = await tool.handler(undefined as any);
		expect(result.isError).toBe(true);
		expect(JSON.stringify(result.content)).toContain("filename");
		expect(service.findSimilar).not.toHaveBeenCalled();
	});

	it("rejects a missing or non-numeric parameter", async () => {
		const service = fakeService();
		const tool = createFindSimilarParametersTool(service);

		let result = await tool.handler({ filename: "/a/b.json" });
		expect(result.isError).toBe(true);
		expect(service.findSimilar).not.toHaveBeenCalled();

		result = await tool.handler({
			filename: "/a/b.json",
			parameter: "1",
		} as any);
		expect(result.isError).toBe(true);
		expect(service.findSimilar).not.toHaveBeenCalled();
	});

	it("clamps limit to the documented [1, 50] range and defaults to 10", async () => {
		const service = fakeService();
		const tool = createFindSimilarParametersTool(service);

		await tool.handler({ filename: "/a/b.json", parameter: 5 });
		expect(service.findSimilar).toHaveBeenLastCalledWith(
			"/a/b.json",
			5,
			undefined,
			undefined,
			10,
		);

		await tool.handler({
			filename: "/a/b.json",
			parameter: 5,
			limit: 500,
		});
		expect(service.findSimilar).toHaveBeenLastCalledWith(
			"/a/b.json",
			5,
			undefined,
			undefined,
			50,
		);
	});

	it("passes valueBitMask and firmwareVersion through to the service", async () => {
		const service = fakeService();
		const tool = createFindSimilarParametersTool(service);
		await tool.handler({
			filename: "/a/b.json",
			parameter: 5,
			valueBitMask: 0xff,
			firmwareVersion: "1.5",
		});
		expect(service.findSimilar).toHaveBeenCalledWith(
			"/a/b.json",
			5,
			0xff,
			"1.5",
			10,
		);
	});

	it("returns the service result as JSON on success", async () => {
		const service = fakeService({
			findSimilar: vi.fn().mockResolvedValue({
				parameters: [{ id: "p1" }],
				templates: [],
				templateImportSuggestions: [],
				purposeSuggestions: [],
			}),
		});
		const tool = createFindSimilarParametersTool(service);
		const result = await tool.handler({
			filename: "/a/b.json",
			parameter: 5,
		});
		expect(result.isError).toBeFalsy();
		expect(JSON.stringify(result.content)).toContain("p1");
	});

	it("translates a thrown SemanticSearchError into a structured response, not a crash", async () => {
		const service = fakeService({
			findSimilar: vi
				.fn()
				.mockRejectedValue(
					new SemanticSearchError(
						"Multiple $if variants exist for this parameter",
						"ambiguous_parameter",
					),
				),
		});
		const tool = createFindSimilarParametersTool(service);
		const result = await tool.handler({
			filename: "/a/b.json",
			parameter: 5,
		});
		expect(result.isError).toBe(true);
		expect(JSON.stringify(result.content)).toContain("ambiguous_parameter");
	});
});
