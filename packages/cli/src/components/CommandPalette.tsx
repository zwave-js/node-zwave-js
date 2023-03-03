import { Box } from "ink";
import React from "react";
import { Frame } from "./Frame.js";
import { HotkeyLabel, HotkeyLabelProps } from "./HotkeyLabel.js";
import { VDivider } from "./VDivider.js";

export interface CommandPaletteProps {
	label?: React.ReactNode;
	commands: HotkeyLabelProps[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = (props) => {
	return (
		<Frame
			topLabels={{
				left: [props.label ?? "Commands"],
			}}
			flexDirection="row"
			justifyContent="flex-start"
			borderColor="gray"
		>
			{props.commands.map((p, i) => (
				<React.Fragment key={i}>
					{i > 0 && <VDivider dimColor />}
					<Box paddingX={2}>
						<HotkeyLabel {...p} />
					</Box>
				</React.Fragment>
			))}
		</Frame>
	);
};
