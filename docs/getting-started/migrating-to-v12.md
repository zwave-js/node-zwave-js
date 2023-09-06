# Migrating to v12

A bit earlier than expected, but there were some necessary breaking changes queueing up. And with the upcoming end-of-life of Node.js 16, it's now time to get them out of the way.

## Reference the endpoint in `"notification"` events

Endpoints can send notifications, but when those were translated to `"notification"` events, the endpoint was not included in the event, only the node. To solve this, the first parameter of the event callback is now the endpoint that sent the notification. This can still be the node itself (which inherits from `Endpoint`), but this is no longer guaranteed.

```diff
type ZWaveNotificationCallback = (
-	node: ZWaveNode,
+	endpoint: Endpoint,
	ccId: CommandClasses,
	args: Record<string, unknown>,
): void;
```

## `ZWaveHost.getNextSupervisionSessionId` requires a node ID now

This change only concerns custom implementations of the `ZWaveHost` interface and should not affect most users/codebases. The `Supervision` session IDs must be tracked per node now and not globally:

```diff
interface ZWaveHost {
	// ...
-	getNextSupervisionSessionId(): number;
+	getNextSupervisionSessionId(nodeId: number): number;
}
```
