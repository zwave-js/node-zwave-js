import { Box, BoxProps, Text } from "ink";
import type React from "react";
import { getInnerBoxProps, getOuterBoxProps } from "../lib/boxProps";

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
						marginLeft={i > 0 ? 2 : 0}
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

export const Frame: React.FC<React.PropsWithChildren<FrameProps>> = (props) => {
	const { topLabels, bottomLabels, ...boxProps } = props;

	const hasTopLabels = topLabels && Object.values(topLabels).some(Boolean);
	const hasBottomLabels =
		bottomLabels && Object.values(bottomLabels).some(Boolean);

	// Apply some defaults
	boxProps.borderStyle ??= "round";
	boxProps.paddingX ??= 1;

	if (hasTopLabels || hasBottomLabels) {
		const outerBoxProps = getOuterBoxProps(boxProps);
		const innerBoxProps = getInnerBoxProps(boxProps);

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
