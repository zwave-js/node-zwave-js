import { Box } from "ink";

export interface CenterProps {
	// empty
}

export const Center: React.FC<React.PropsWithChildren<CenterProps>> = (
	props,
) => {
	return (
		<Box flexDirection="column" justifyContent="center">
			{props.children}
		</Box>
	);
};
