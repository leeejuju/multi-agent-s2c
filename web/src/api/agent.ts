import { post } from "./index";

type AgentConfig = {
    model?: string;
    stream?: boolean;
    enable_think?: boolean;
};

type Send2AgentResponse = {
    content: string;
};

export const agentApi = {
    /**
     * Send a request to the agent.
     * @param {string} agentId Agent identifier.
     * @param {Object} data User input payload.
     * @param {AgentConfig} config Basic runtime config.
     * @param options Native fetch options.
     */
    send2Agent: (
        agentId: string,
        data: Record<string, unknown>,
        config: AgentConfig = {},
        options: RequestInit = {},
    ) => {
        const headers = new Headers(options.headers);
        headers.set("Content-Type", "application/json");

        return post<Send2AgentResponse>(
            `/chat/agent/${agentId}/run`,
            JSON.stringify({ ...data, ...config }),
            {
                ...options,
                headers,
            },
        );
    },
};
