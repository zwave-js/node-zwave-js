import { Box, BoxProps } from "ink";
import { getOuterBoxProps } from "../lib/boxProps.js";

export interface LineProps extends BoxProps {
	orientation: "horizontal" | "vertical";
}

export const Line: React.FC<LineProps> = (props) => {
	const { orientation, ...boxProps } = props;
	const { ...outerBoxProps } = getOuterBoxProps(boxProps);

	return (
		<Box
			{...outerBoxProps}
			borderTop={props.orientation === "horizontal"}
			borderBottom={false}
			borderLeft={props.orientation === "vertical"}
			borderRight={false}
		></Box>
	);
};
