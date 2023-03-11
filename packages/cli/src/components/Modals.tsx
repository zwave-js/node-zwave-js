import { Box, Text, TextProps, useInput } from "ink";
import { UncontrolledTextInput } from "ink-text-input";
import type { ReactNode } from "react";
import { Center } from "./Center.js";

export type ModalState = {
	message: ReactNode;
	color?: TextProps["color"];
} & (
	| {
			type: "message";
			onSubmit: () => void;
	  }
	| {
			type: "query" | "queryInline";
			initial?: string;
			onSubmit: (input: string) => void;
			onCancel?: () => void;
	  }
);

export type ModalMessageProps = Omit<
	ModalState & { type: "message" },
	"message" | "type"
>;

export const ModalMessage: React.FC<
	React.PropsWithChildren<ModalMessageProps>
> = (props) => {
	useInput((input, key) => {
		if (key.return) {
			props.onSubmit();
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
					<Text bold>ENTER</Text> to continue...
				</Text>
			</Box>
		</Center>
	);
};

export type ModalQueryProps = Omit<
	ModalState & { type: "query" },
	"message" | "type"
>;

export const ModalQuery: React.FC<React.PropsWithChildren<ModalQueryProps>> = (
	props,
) => {
	useInput((input, key) => {
		if (key.escape && props.onCancel) {
			props.onCancel();
		}
		// Submitting is handled by the input component
	});

	return (
		<Center>
			<Box
				flexDirection="column"
				borderColor={props.color ?? "white"}
				borderStyle="round"
				minWidth={40}
				paddingY={1}
				paddingX={2}
			>
				<Text color={props.color}>{props.children}</Text>
				<Box borderStyle="round" borderColor="gray">
					<UncontrolledTextInput
						initialValue={props.initial}
						onSubmit={props.onSubmit}
					></UncontrolledTextInput>
				</Box>
				<Text dimColor>
					<Text bold>ENTER</Text> to confirm, <Text bold>ESCAPE</Text>{" "}
					to cancel
				</Text>
			</Box>
		</Center>
	);
};

export type InlineQueryProps = Omit<
	ModalState & { type: "queryInline" },
	"message" | "type"
>;

export const InlineQuery: React.FC<
	React.PropsWithChildren<InlineQueryProps>
> = (props) => {
	useInput((input, key) => {
		if (key.escape && props.onCancel) {
			props.onCancel();
		}
		// Submitting is handled by the input component
	});

	return (
		<Box
			flexDirection="row"
			alignItems="center"
			justifyContent="space-between"
			paddingY={0}
			paddingX={1}
		>
			<Text color={props.color}>{props.children}: </Text>
			<Box borderStyle="round" borderColor="gray" flexGrow={1}>
				<UncontrolledTextInput
					initialValue={props.initial}
					onSubmit={props.onSubmit}
				></UncontrolledTextInput>
			</Box>
		</Box>
	);
};
