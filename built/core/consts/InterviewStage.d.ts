export declare enum InterviewStage {
    /** The interview process hasn't started for this node */
    None = 0,
    /** The node's protocol information has been queried from the controller */
    ProtocolInfo = 1,
    /** The node has been queried for supported and controlled command classes */
    NodeInfo = 2,
    /**
     * Information for all command classes has been queried.
     * This includes static information that is requested once as well as dynamic
     * information that is requested on every restart.
     */
    CommandClasses = 3,
    /**
     * Device information for the node has been loaded from a config file.
     * If defined, some of the reported information will be overwritten based on the
     * config file contents.
     */
    OverwriteConfig = 4,
    /** The interview process has finished */
    Complete = 5
}
//# sourceMappingURL=InterviewStage.d.ts.map