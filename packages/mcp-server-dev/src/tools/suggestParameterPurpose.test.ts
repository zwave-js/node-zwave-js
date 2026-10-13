import { describe, expect, it, vi } from "vitest";

import type { SemanticSearchService } from "../semantic/service.js";

import { createSuggestParameterPurposeTool } from "./suggestParameterPurpose.js";

function fakeService(): SemanticSearchService {
	return {
		suggestPurposesForText: vi.fn().mockResolvedValue({ suggestions: [] }),
		suggestPurposesForParameter: vi.fn().mockResolvedValue({
			suggestions: [],
		}),
	} as unknown as SemanticSearchService;
}

describe("createSuggestParameterPurposeTool", () => {
	it("exposes the dedicated purpose tool", () => {
		expect(createSuggestParameterPurposeTool(fakeService()).name).toBe(
			"suggest_parameter_purpose",
		);
	});

	it("requires exactly one query mode", async () => {
		const service = fakeService();
		const tool = createSuggestParameterPurposeTool(service);
		expect((await tool.handler(undefined as any)).isError).toBe(true);
		expect(
			(
				await tool.handler({
					query: "timer",
					filename: "/device.json",
					parameter: 1,
				} as any)
			).isError,
		).toBe(true);
	});

	it("uses free text and clamps the result limit", async () => {
		const service = fakeService();
		const tool = createSuggestParameterPurposeTool(service);
		await tool.handler({ query: "automatic shutoff", limit: 100 });
		expect(service.suggestPurposesForText).toHaveBeenCalledWith(
			"automatic shutoff",
			20,
		);
	});

	it("resolves a concrete parameter query", async () => {
		const service = fakeService();
		const tool = createSuggestParameterPurposeTool(service);
		await tool.handler({
			filename: "/device.json",
			parameter: 7,
			valueBitMask: 255,
			firmwareVersion: "1.2",
		});
		expect(service.suggestPurposesForParameter).toHaveBeenCalledWith(
			"/device.json",
			7,
			255,
			"1.2",
			5,
		);
	});
});
