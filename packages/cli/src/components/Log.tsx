import { Box, DOMElement, measureElement, Spacer, Text } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LinesBuffer } from "../lib/logging.js";
import { HotkeyLabel } from "./HotkeyLabel.js";

export interface LogProps {
	buffer: LinesBuffer;
}

export const Log: React.FC<LogProps> = (props) => {
	const ref = useRef<DOMElement>(null);
	const [logHeight, setLogHeight] = useState(0);
	const [scrollOffset, setScrollOffset] = useState(0);
	const [log, setLog] = useState<string>("");

	const renderLog = useCallback(() => {
		const lines = props.buffer.getView(
			Math.max(props.buffer.size - logHeight, 0),
			props.buffer.size,
		);
		setLog(lines.join("\n"));
	}, [props.buffer, logHeight]);

	const measure = useCallback(() => {
		if (ref.current) {
			const height = measureElement(ref.current).height;
			if (!Number.isNaN(height)) setLogHeight(height);
		}
	}, [ref, setLogHeight]);

	useEffect(() => {
		// For some reason, the measurement can be wrong shortly after rendering
		// so we measure a second time after a short delay
		measure();
		setTimeout(measure, 30);
	});

	// Update the log state whenever `buffer` emits a change event
	useEffect(() => {
		const listener = () => {
			renderLog();
		};

		props.buffer.on("change", listener);
		return () => {
			props.buffer.off("change", listener);
		};
	}, [props.buffer, scrollOffset, logHeight]);

	// Render the log initially AND when the log height changes
	useEffect(() => {
		renderLog();
	}, [logHeight]);

	return (
		<Box
			minWidth={104}
			flexGrow={1}
			ref={ref}
			flexDirection="row"
			alignItems="stretch"
		>
			<Text>{log}</Text>
			<Spacer />
			<Box flexDirection="column" width={1}>
				<HotkeyLabel hotkey="upArrow" />
				<Text>█</Text>
				<Spacer />
				<HotkeyLabel hotkey="downArrow" />
			</Box>
		</Box>
	);
};
