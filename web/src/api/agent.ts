import { post } from "./index";
import type { AttachmentItem } from "./file";

/**
 * Domain model definitions for Agent interaction
 */
export interface AgentConfig {
  model?: string;
  stream?: boolean;
  enable_think?: boolean;
}

export interface Send2AgentPayload {
  input: string;
  conversation_id?: string;
  attachments?: AttachmentItem[];
}

export interface AgentResponse {
  content: string;
  conversation_id?: string;
  usage?: {
    total_tokens: number;
  };
}

/**
 * Agent API module
 */
export const agentApi = {
  /**
   * Send a message to the specified agent.
   * @param agentId The identifier of the agent.
   * @param payload User input and session data.
   * @param config Runtime agent configuration.
   * @param options Additional fetch options (e.g., signal for abort).
   */
  async send2Agent(
    agentId: string,
    payload: Send2AgentPayload,
    config: AgentConfig = {},
    options: RequestInit = {},
  ): Promise<AgentResponse> {
    return post<AgentResponse>(
      `/chat/agent/${agentId}/run`,
      {
        ...payload,
        config,
      },
      options,
    );
  },
};
