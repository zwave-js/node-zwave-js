# Supervision CC

?> CommandClass ID: `0x6c`

## Supervision CC methods

### `sendReport`

```ts
async sendReport(
	options: SupervisionCCReportOptions & {
		encapsulationFlags?: EncapsulationFlags;
	},
): Promise<void>;
```
