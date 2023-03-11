import { Text, useApp, useInput } from "ink";
import { Center } from "../components/Center.js";
import { useDriver } from "../hooks/useDriver.js";
import { useNavigation } from "../hooks/useNavigation.js";

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
		<Center>
			<Text color="red">Are you sure you want to exit?</Text>
			<Text>
				Press <Text bold>RETURN</Text> to exit, or{" "}
				<Text bold>ESCAPE</Text> to cancel.
			</Text>
		</Center>
	);
};
