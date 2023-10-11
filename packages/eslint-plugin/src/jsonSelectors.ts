export const ROOT = "Program > JSONExpressionStatement > JSONObjectExpression";
export const CONFIG_PARAM =
	"JSONProperty[key.value='paramInformation'] > JSONArrayExpression > JSONObjectExpression";
export const CONFIG_OPTIONS =
	`${CONFIG_PARAM} > JSONProperty[key.value='options']`;
export const CONFIG_OPTION =
	`${CONFIG_OPTIONS} > JSONArrayExpression > JSONObjectExpression`;
