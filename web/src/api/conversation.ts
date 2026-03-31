import { post } from "./index";

export interface ConversationItem {
  id: string;
  user_id: string;
  title: string;
  summary?: string | null;
}

export const conversationApi = {
  createConversation(title = "New Conversation") {
    return post<ConversationItem>("/conversations", { title });
  },
};
