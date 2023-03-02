import { Box, Text, useApp, useInput } from "ink";
import { useDriver } from "../hooks/useDriver";
import { useNavigation } from "../hooks/useNavigation";

export const ConfirmExitPage: React.FC = () => {
	const { exit } = useApp();
	const { destroyDriver } = useDriver();
	const { back } = useNavigation();

	useInput(async (input, key) => {
		if (key.return) {
			await destroyDriver();
			exit();
		} else if (key.escape) {
			back();
		}
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
