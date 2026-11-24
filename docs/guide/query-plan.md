# Query plan

With `AGENT_QUERY_PLAN=on` the agent must submit a structured plan (tables, columns, joins and filters) that is checked against your real schema **before any SQL runs**, and the SQL may only read the planned tables. It is off by default.

```bash
AGENT_QUERY_PLAN=on dbask --mode debug "Revenue by client last month"
```

In debug mode the submitted plan and any plan warnings are printed with the tool trace.

## Should you turn it on?

In the benchmark on MySQL the plan added about 0.7 tool calls and roughly 30% median latency per question without improving accuracy, so it is off by default. Turn it on if you want the agent's assumptions visible in `--mode debug`, or to compare against your own workload.

The Postgres benchmark runs so far are not comparable (different models, and a single run), so there is no Postgres figure yet. See [Evals and benchmarks](/guide/evals).

## SDK

The plan is controlled by `AgentOptions.requirePlan` and returned in `AgentResult.plan`. Both are [experimental](/guide/sdk#sdk-stability) and can change in any release.
