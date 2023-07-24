import { useState } from "react";

export function useForceRerender() {
	const [value, setValue] = useState(0);
	return () => setValue((value) => value + 1);
}
