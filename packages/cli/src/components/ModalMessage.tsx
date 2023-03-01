import { Box, Text, TextProps, useInput } from "ink";
import type { ReactNode } from "react";
import { Center } from "./Center";

export interface ModalMessageState {
	message: ReactNode;
	color?: TextProps["color"];
}

export interface ModalMessageProps {
	color?: TextProps["color"];
	onContinue: () => void;
}

export const ModalMessage: React.FC<
	React.PropsWithChildren<ModalMessageProps>
> = (props) => {
	useInput((input, key) => {
		if (key.return) {
			props.onContinue();
		}
	});

	return (
		<Center>
			<Box
				flexDirection="column"
				borderColor={props.color ?? "white"}
				borderStyle="round"
				paddingY={1}
				paddingX={2}
			>
				<Text color={props.color}>{props.children}</Text>
				<Text> </Text>
				<Text color="gray">
					Press <Text bold>ENTER</Text> to continue...
				</Text>
			</Box>
		</Center>
	);
};
