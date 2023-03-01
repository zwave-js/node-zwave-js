import { pick } from "@zwave-js/shared/safe";
import { Box, Text } from "ink";
import type { ComponentPropsWithoutRef } from "react";

type BoxProps = ComponentPropsWithoutRef<typeof Box>;

// type BoxProps = {
//     readonly position?: "absolute" | "relative" | undefined;
//     readonly marginLeft?: number | undefined;
//     readonly marginRight?: number | undefined;
//     readonly marginTop?: number | undefined;
//     readonly marginBottom?: number | undefined;
//     readonly paddingLeft?: number | undefined;
//     readonly paddingRight?: number | undefined;
//     readonly paddingTop?: number | undefined;
//     readonly paddingBottom?: number | undefined;
//     readonly flexGrow?: number | undefined;
//     readonly flexShrink?: number | undefined;
//     readonly flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined;
//     readonly flexBasis?: string | number | undefined;
//     readonly alignItems?: "flex-start" | "center" | "flex-end" | "stretch" | undefined;
//     readonly alignSelf?: "flex-start" | "center" | "flex-end" | "auto" | undefined;
//     readonly justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | undefined;
//     readonly width?: string | number | undefined;
//     readonly height?: string | number | undefined;
//     readonly minWidth?: string | number | undefined;
//     readonly minHeight?: string | number | undefined;
//     readonly display?: "flex" | "none" | undefined;
//     readonly borderStyle?: keyof cliBoxes.Boxes | undefined;
//     readonly borderColor?: LiteralUnion<ForegroundColor, string> | undefined;
//     readonly margin?: number | undefined;
//     readonly marginX?: number | undefined;
//     readonly marginY?: number | undefined;
//     readonly padding?: number | undefined;
//     readonly paddingX?: number | undefined;
//     readonly paddingY?: number | undefined;
//     children?: React.ReactNode;
//     key?: React.Key | null | undefined;
// }

export interface FrameLabelGroupProps {
	left?: (React.ReactNode | undefined | false)[];
	center?: (React.ReactNode | undefined | false)[];
	right?: (React.ReactNode | undefined | false)[];
}

const FrameLabels: React.FC<{
	labels: React.ReactNode[];
}> = ({ labels }) => {
	return (
		<>
			{labels.map((label, i) => {
				return (
					<Box
						key={i}
						// Allow spaces between labels
						marginLeft={i > 0 ? 1 : 0}
					>
						<Text bold={typeof label !== "object"}> {label} </Text>
					</Box>
				);
			})}
		</>
	);
};

const FrameLabelGroup: React.FC<FrameLabelGroupProps> = (props) => {
	return (
		<>
			<Box>
				{props.left?.some(Boolean) && (
					<FrameLabels labels={props.left.filter(Boolean)} />
				)}
			</Box>
			<Box>
				{props.center?.some(Boolean) && (
					<FrameLabels labels={props.center.filter(Boolean)} />
				)}
			</Box>
			<Box>
				{props.right?.some(Boolean) && (
					<FrameLabels labels={props.right.filter(Boolean)} />
				)}
			</Box>
		</>
	);
};

export interface FrameProps extends BoxProps {
	topLabels?: FrameLabelGroupProps | false;
	bottomLabels?: FrameLabelGroupProps | false;
}

export const Frame: React.FC<FrameProps> = (props) => {
	const { topLabels, bottomLabels, ...boxProps } = props;

	const hasTopLabels = topLabels && Object.values(topLabels).some(Boolean);
	const hasBottomLabels =
		bottomLabels && Object.values(bottomLabels).some(Boolean);

	// Apply some defaults
	boxProps.borderStyle ??= "round";
	boxProps.paddingX ??= 1;

	if (hasTopLabels || hasBottomLabels) {
		const outerBoxProps = pick(boxProps, [
			"position",
			"marginLeft",
			"marginRight",
			"marginTop",
			"marginBottom",
			"margin",
			"marginX",
			"marginY",
			"flexGrow",
			"flexShrink",
			"flexBasis",
			"alignSelf",
			"width",
			"height",
			"minWidth",
			"minHeight",
			"borderStyle",
			"borderColor",
			"key",
		]);

		const innerBoxProps = pick(boxProps, [
			"paddingLeft",
			"paddingRight",
			"paddingTop",
			"paddingBottom",
			"flexDirection",
			"alignItems",
			"justifyContent",
			"padding",
			"paddingX",
			"paddingY",
		]);

		return (
			<Box {...outerBoxProps} flexDirection="column">
				<Box
					marginTop={-1}
					marginLeft={
						(innerBoxProps.padding ??
							innerBoxProps.paddingX ??
							innerBoxProps.paddingLeft ??
							0) - 1
					}
					marginRight={
						(innerBoxProps.padding ??
							innerBoxProps.paddingX ??
							innerBoxProps.paddingRight ??
							0) - 1
					}
					flexDirection="row"
					justifyContent="space-between"
					flexBasis={1}
					flexGrow={0}
				>
					<FrameLabelGroup {...topLabels} />
				</Box>
				<Box {...innerBoxProps} flexGrow={1}>
					{boxProps.children}
				</Box>
				<Box
					marginBottom={-1}
					marginLeft={
						(innerBoxProps.padding ??
							innerBoxProps.paddingX ??
							innerBoxProps.paddingLeft ??
							0) - 1
					}
					marginRight={
						(innerBoxProps.padding ??
							innerBoxProps.paddingX ??
							innerBoxProps.paddingRight ??
							0) - 1
					}
					flexDirection="row"
					justifyContent="space-between"
					flexBasis={1}
					flexGrow={0}
				>
					<FrameLabelGroup {...bottomLabels} />
				</Box>
			</Box>
		);
	} else {
		return <Box {...boxProps}></Box>;
	}
};
