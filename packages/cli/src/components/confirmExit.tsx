import { Box, Text, useInput } from "ink";

export interface ConfirmExitProps {
	onExit: () => void;
	onCancel: () => void;
}

export const ConfirmExit: React.FC<ConfirmExitProps> = (props) => {
	useInput((input, key) => {
		if (key.return) props.onExit();
		else if (key.escape) props.onCancel();
	});

	return (
		<Box flexDirection="column" justifyContent="center">
			<Text color="red">Are you sure you want to exit?</Text>
			<Text>
				Press <Text bold>RETURN</Text> to exit, or{" "}
				<Text bold>ESCAPE</Text> to cancel.
			</Text>
		</Box>
	);
};
