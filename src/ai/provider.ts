import type { ToolSet } from 'ai';
import type { ModelProvider, ModelRequest, ModelResponse } from '../core/types/index.js';

export type { ModelProvider, ModelRequest, ModelResponse };

/**
 * A model provider the agent can call. Its signature uses types from the AI SDK
 * (`ai`), so it can change when that package has a major release.
 *
 * @experimental Use `createAiProvider` and pass the result to `Agent`; do not
 * depend on implementing this interface yet.
 */
export interface AiProvider extends ModelProvider {
  generate(request: ModelRequest & { tools?: ToolSet; maxSteps?: number }): Promise<ModelResponse & {
    steps?: number;
    toolCalls?: number;
  }>;
}
