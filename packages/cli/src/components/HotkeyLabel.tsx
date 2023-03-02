import { Text, TextProps, useInput } from "ink";

export interface HotkeyLabelProps extends TextProps {
	label: string;
	hotkey?: string;
	onPress?: () => void;
}

export const HotkeyLabel: React.FC<HotkeyLabelProps> = (props) => {
	const { label, hotkey, ...textProps } = props;
	// Apply some default text props
	textProps.color ??= "green";
	textProps.bold ??= true;

	const { color, children, ...rest } = textProps;

	useInput((input, key) => {
		if (hotkey && input === hotkey) {
			props.onPress?.();
		}
	});

	if (!hotkey) {
		return <Text {...textProps}>{label}</Text>;
	} else if (hotkey.length !== 1) {
		throw new Error("Hotkey must be a single character");
	}

	const hotkeyIndex = label.toLowerCase().indexOf(hotkey.toLowerCase());

	if (hotkeyIndex === -1) {
		return (
			<Text {...rest}>
				{label} <Text color={color}>({hotkey})</Text>
			</Text>
		);
	} else {
		return (
			<Text {...rest}>
				{label.slice(0, hotkeyIndex)}
				<Text color={color}>
					{label.slice(hotkeyIndex, hotkeyIndex + 1)}
				</Text>
				{label.slice(hotkeyIndex + 1)}
			</Text>
		);
	}
};
