import { Text, TextProps, useInput } from "ink";

export interface HotkeyLabelProps extends TextProps {
	label?: string;
	hotkey?: string;
	modifiers?: Modifiers;
	onPress?: () => void;
}

type Modifiers = ("ctrl" | "shift")[];

const specialKeys: Record<string, string> = {
	upArrow: "↑",
	downArrow: "↓",
	leftArrow: "←",
	rightArrow: "→",
	pageDown: "PgDn",
	pageUp: "PgUp",
	return: "↲",
	escape: "",
	tab: "↹",
	backspace: "⤆",
	delete: "Del",
};

function modifiersToString(modifiers: Modifiers | undefined = []): string {
	let ret = "";
	if (modifiers.includes("ctrl")) ret += "Ctrl+";
	if (modifiers.includes("shift")) ret += "⇧+";
	return ret;
}

function renderHotkey(hotkey: string, modifiers: Modifiers | undefined) {
	if (hotkey in specialKeys) {
		return modifiersToString(modifiers) + specialKeys[hotkey];
	} else {
		return modifiersToString(modifiers) + hotkey.toUpperCase();
	}
}

export const HotkeyLabel: React.FC<HotkeyLabelProps> = (props) => {
	const { hotkey, label, modifiers, ...textProps } = props;
	// Apply some default text props
	textProps.color ??= "red";
	textProps.bold ??= true;

	const { color, children, ...rest } = textProps;

	useInput((input, key) => {
		if (
			hotkey &&
			(input === hotkey ||
				(hotkey in specialKeys && (key as any)[hotkey])) &&
			(!modifiers || modifiers.every((mod) => key[mod]))
		) {
			props.onPress?.();
		}
	});

	if (!label) {
		if (hotkey) {
			return (
				<Text {...textProps}>{renderHotkey(hotkey, modifiers)}</Text>
			);
		} else {
			throw new Error("At least one of label or hotkey must be provided");
		}
	}

	if (!hotkey) {
		return <Text {...textProps}>{label}</Text>;
	} else if (hotkey.length !== 1 && !(hotkey in specialKeys)) {
		throw new Error("Hotkey must be a single character or a special key");
	}

	const hotkeyIndex =
		hotkey.length === 1 && !modifiers?.length
			? label.toLowerCase().indexOf(hotkey.toLowerCase())
			: -1;
	if (hotkeyIndex >= 0) {
		return (
			<Text {...rest}>
				{label.slice(0, hotkeyIndex)}
				<Text color={color}>
					{label.slice(hotkeyIndex, hotkeyIndex + 1)}
				</Text>
				{label.slice(hotkeyIndex + 1)}
			</Text>
		);
	} else {
		return (
			<Text {...rest}>
				{label}{" "}
				<Text color={color}>({renderHotkey(hotkey, modifiers)})</Text>
			</Text>
		);
	}
};
