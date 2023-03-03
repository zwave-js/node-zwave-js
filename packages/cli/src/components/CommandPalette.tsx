import { Box } from "ink";
import React from "react";
import { Frame } from "./Frame";
import { HotkeyLabel, HotkeyLabelProps } from "./HotkeyLabel";
import { VDivider } from "./VDivider";

export interface CommandPaletteProps {
	commands: HotkeyLabelProps[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = (props) => {
	return (
		<Frame
			topLabels={{
				left: ["Commands"],
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
