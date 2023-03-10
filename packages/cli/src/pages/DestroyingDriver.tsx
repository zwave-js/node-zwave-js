import { Text } from "ink";
import Spinner from "ink-spinner";
import { useEffect } from "react";
import { Center } from "../components/Center.js";
import { useDriver } from "../hooks/useDriver.js";
import { CLIPage, useNavigation } from "../hooks/useNavigation.js";

export const DestroyingDriverPage: React.FC = () => {
	const { destroyDriver } = useDriver();
	const { navigate } = useNavigation();

	// When opening this page, destroy the driver
	useEffect(() => {
		destroyDriver().then(() => {
			navigate(CLIPage.Prepare);
		});
	}, []);

	return (
		<Center>
			<Text>
				<Text color="red">
					<Spinner type="dots" />
				</Text>{" "}
				Destroying driver...
			</Text>
		</Center>
	);
};
