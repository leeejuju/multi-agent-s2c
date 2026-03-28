import { post } from "./index";

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
  session_id?: string;
  [key: string]: any; // Allow for extensibility
}

export interface AgentResponse {
  content: string;
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
    // Encapsulate endpoint path logic
    const endpoint = `/agents/${agentId}/chat`;

    // Explicitly merge payload and config to avoid accidental property overwriting
    const body = {
      ...config,
      ...payload,
    };

    return post<AgentResponse>(endpoint, body, options);
  },
};
