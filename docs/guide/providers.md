# AI providers

Set `AI_PROVIDER` and `AI_MODEL`, plus the key for that provider (see [Configuration](/guide/configuration#ai-provider)).

| Provider | `AI_PROVIDER` | Credential |
|---|---|---|
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` |
| Google Gemini | `google` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Groq | `groq` | `GROQ_API_KEY` |
| Cerebras | `cerebras` | `CEREBRAS_API_KEY` |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` |
| Ollama (local) | `ollama` | `OLLAMA_BASE_URL` |

`AI_MODEL` must be the exact model ID the provider accepts. Model availability, pricing, quotas and API behavior are controlled by each provider and can change independently of this project.

## Checking the model works

`dbask init` does not call the provider. Run `dbask validate`: it sends one tiny request and confirms the key and model ID are accepted.

## What the provider sees

dbask itself sends nothing anywhere except to your database and the provider you configure. Depending on the question and tool flow, the provider can receive schema metadata, the question text, generated SQL and query results. Review that provider's retention, training and residency terms before using sensitive data. See [Safety model](/guide/safety#data-handling).

## Local models

Ollama-compatible endpoints are supported for local-only inference. This path is not exercised in the benchmark yet, so validate it against your own workload first. Support for local models is planned to improve in 0.3.

## Benchmark model

The published benchmark figures use `gemini-3.5-flash-lite`. Other models can differ a lot in accuracy, cost and speed; see [Evals and benchmarks](/guide/evals).
