import { Text } from "ink";
import { useMenu } from "../hooks/useMenu";
import {
	destroyDriverMenuItem,
	exitMenuItem,
	toggleLogMenuItem,
} from "../lib/menu";

export interface MainMenuPageProps {
	// TODO:
}

export const MainMenuPage: React.FC<MainMenuPageProps> = (props) => {
	useMenu([toggleLogMenuItem, destroyDriverMenuItem, exitMenuItem]);

	return <Text>TODO</Text>;
};
