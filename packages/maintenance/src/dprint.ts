import { repoRoot } from "./tsAPITools";

import { formatWithDprint as format } from "@zwave-js/fmt";

export function formatWithDprint(filename: string, sourceText: string): string {
	return format(repoRoot, filename, sourceText);
}
