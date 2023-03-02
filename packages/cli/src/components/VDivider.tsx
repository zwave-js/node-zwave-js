import { Box, measureElement, Text, TextProps, type DOMElement } from "ink";
import { useEffect, useRef, useState } from "react";

export interface VDividerProps extends TextProps {
	character?: string;
}

export const VDivider: React.FC<VDividerProps> = ({
	character = "│",
	...textProps
}) => {
	const ref = useRef<DOMElement>(null);
	const [text, setText] = useState<string>(character);

	useEffect(() => {
		if (ref.current) {
			const height = Math.max(1, measureElement(ref.current).height);
			if (Number.isNaN(height)) {
				setText(character);
			} else {
				setText(new Array(height).fill(character).join("\n"));
			}
		}
	});

	return (
		<Box marginX={1} width={1} ref={ref}>
			<Text {...textProps}>{text}</Text>
		</Box>
	);
};
