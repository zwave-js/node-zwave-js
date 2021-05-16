# Supervision CC

?> CommandClass ID: `0x6c`

## Supervision CC methods

### `sendEncapsulated`

```ts
async sendEncapsulated(
	encapsulated: CommandClass,
	// If possible, keep us updated about the progress
	requestStatusUpdates: boolean = true,
): Promise<void>;
```
