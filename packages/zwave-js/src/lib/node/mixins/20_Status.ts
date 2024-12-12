import { type CommandClasses, InterviewStage } from "@zwave-js/core";
import { type Driver } from "../../driver/Driver.js";
import { cacheKeys } from "../../driver/NetworkCache.js";
import { type DeviceClass } from "../DeviceClass.js";
import {
	type NodeReadyMachine,
	type NodeReadyMachineInput,
	createNodeReadyMachine,
} from "../NodeReadyMachine.js";
import {
	type NodeStatusMachine,
	type NodeStatusMachineInput,
	createNodeStatusMachine,
	nodeStatusMachineStateToNodeStatus,
} from "../NodeStatusMachine.js";
import { NodeStatus } from "../_Types.js";
import { NodeEventsMixin } from "./10_Events.js";

export interface NodeWithStatus {
	/**
	 * Which status the node is believed to be in
	 */
	status: NodeStatus;

	/**
	 * Whether the node is ready to be used
	 */
	ready: boolean;

	/**
	 * @internal
	 * Marks this node as dead (if applicable)
	 */
	markAsDead(): void;

	/**
	 * @internal
	 * Marks this node as alive (if applicable)
	 */
	markAsAlive(): void;

	/**
	 * @internal
	 * Marks this node as asleep (if applicable)
	 */
	markAsAsleep(): void;

	/**
	 * @internal
	 * Marks this node as awake (if applicable)
	 */
	markAsAwake(): void;

	/**
	 * Which interview stage was last completed
	 */
	interviewStage: InterviewStage;
}

export abstract class NodeStatusMixin extends NodeEventsMixin
	implements NodeWithStatus
{
	public constructor(
		nodeId: number,
		driver: Driver,
		index: number,
		deviceClass?: DeviceClass,
		supportedCCs?: CommandClasses[],
	) {
		super(nodeId, driver, index, deviceClass, supportedCCs);

		// Create the state machines
		this.statusMachine = createNodeStatusMachine(this);
		this.readyMachine = createNodeReadyMachine();
	}

	private statusMachine: NodeStatusMachine;

	private _status: NodeStatus = NodeStatus.Unknown;

	/**
	 * Which status the node is believed to be in
	 */
	public get status(): NodeStatus {
		return this._status;
	}

	protected restartStatusMachine(): void {
		this.statusMachine.restart();
		this.onStatusChange(NodeStatus.Unknown);
	}

	protected updateStatusMachine(input: NodeStatusMachineInput): void {
		const newState = this.statusMachine.next(input)?.newState;
		if (newState) {
			this.statusMachine.transition(newState);
			this.onStatusChange(
				nodeStatusMachineStateToNodeStatus(newState.value),
			);
		}
	}

	private onStatusChange(newStatus: NodeStatus) {
		// Ignore duplicate events
		if (newStatus === this._status) return;

		const oldStatus = this._status;
		this._status = newStatus;
		if (this._status === NodeStatus.Asleep) {
			this._emit("sleep", this, oldStatus);
		} else if (this._status === NodeStatus.Awake) {
			this._emit("wake up", this, oldStatus);
		} else if (this._status === NodeStatus.Dead) {
			this._emit("dead", this, oldStatus);
		} else if (this._status === NodeStatus.Alive) {
			this._emit("alive", this, oldStatus);
		}

		// To be marked ready, a node must be known to be not dead.
		// This means that listening nodes must have communicated with us and
		// sleeping nodes are assumed to be ready
		this.updateReadyMachine(
			{
				value: this._status !== NodeStatus.Unknown
						&& this._status !== NodeStatus.Dead
					? "NOT_DEAD"
					: "MAYBE_DEAD",
			},
		);
	}

	/**
	 * @internal
	 * Marks this node as dead (if applicable)
	 */
	public markAsDead(): void {
		this.updateStatusMachine({ value: "DEAD" });
	}

	/**
	 * @internal
	 * Marks this node as alive (if applicable)
	 */
	public markAsAlive(): void {
		this.updateStatusMachine({ value: "ALIVE" });
	}

	/**
	 * @internal
	 * Marks this node as asleep (if applicable)
	 */
	public markAsAsleep(): void {
		this.updateStatusMachine({ value: "ASLEEP" });
	}

	/**
	 * @internal
	 * Marks this node as awake (if applicable)
	 */
	public markAsAwake(): void {
		this.updateStatusMachine({ value: "AWAKE" });
	}

	// The node is only ready when the interview has been completed
	// to a certain degree

	private readyMachine: NodeReadyMachine;
	private _ready: boolean = false;

	protected restartReadyMachine(): void {
		this.readyMachine.restart();
		this.onReadyChange(false);
	}

	protected updateReadyMachine(input: NodeReadyMachineInput): void {
		const newState = this.readyMachine.next(input)?.newState;
		if (newState) {
			this.readyMachine.transition(newState);
			this.onReadyChange(newState.value === "ready");
		}
	}

	private onReadyChange(ready: boolean) {
		// Ignore duplicate events
		if (ready === this._ready) return;

		this._ready = ready;
		if (ready) this._emit("ready", this);
	}

	/**
	 * Whether the node is ready to be used
	 */
	public get ready(): boolean {
		return this._ready;
	}
	protected set ready(ready: boolean) {
		this._ready = ready;
	}

	public get interviewStage(): InterviewStage {
		return (
			this.driver.cacheGet(cacheKeys.node(this.id).interviewStage)
				?? InterviewStage.None
		);
	}
	public set interviewStage(value: InterviewStage) {
		this.driver.cacheSet(cacheKeys.node(this.id).interviewStage, value);
	}
}
