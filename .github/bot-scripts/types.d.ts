type Github = ReturnType<typeof import("@actions/github").getOctokit>["rest"];
type Context = typeof import("@actions/github").context;
