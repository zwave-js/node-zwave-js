import { Box } from "ink";
import type { OuterBoxProps } from "../lib/boxProps";

export interface CenterProps
	extends Omit<OuterBoxProps, "flexDirection" | "justifyContent"> {
	// empty
}

export const Center: React.FC<React.PropsWithChildren<CenterProps>> = (
	props,
) => {
	const { children, ...boxProps } = props;
	return (
		<Box
			{...boxProps}
			flexDirection="column"
			justifyContent="center"
			alignItems="center"
			flexGrow={1}
		>
			{children}
		</Box>
	);
};
