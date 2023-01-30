# Inclusion Controller CC

?> CommandClass ID: `0x74`

## Inclusion Controller CC methods

### `initiateStep`

```ts
async initiateStep(
	nodeId: number,
	step: InclusionControllerStep,
): Promise<void>;
```

Instruct the target to initiate the given inclusion step for the given node.

### `completeStep`

```ts
async completeStep(
	step: InclusionControllerStep,
	status: InclusionControllerStatus,
): Promise<void>;
```

Indicate to the other node that the given inclusion step has been completed.
