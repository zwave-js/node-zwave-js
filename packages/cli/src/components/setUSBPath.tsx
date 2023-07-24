import { Box, Text, useInput } from "ink";
import { UncontrolledTextInput } from "ink-text-input";

export interface SetUSBPathProps {
	path?: string;
	onSubmit: (path: string) => void;
	onCancel: () => void;
}

export const SetUSBPath: React.FC<SetUSBPathProps> = (props) => {
	useInput((input, key) => {
		if (key.escape) props.onCancel();
	});

	return (
		<Box flexDirection="column" alignSelf="center" minWidth={40}>
			<Text>Enter USB path:</Text>
			<Box borderStyle="round" borderColor="gray">
				<UncontrolledTextInput
					initialValue={props.path}
					onSubmit={props.onSubmit}
				></UncontrolledTextInput>
			</Box>
			<Text dimColor>
				<Text bold>ENTER</Text> to confirm, <Text bold>ESCAPE</Text> to
				cancel
			</Text>
		</Box>
	);
};
