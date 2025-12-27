
export enum Role {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // Base64
  content?: string; // Text
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  files: FileMetadata[];
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: number;
  activeKBId?: string;
  settings: {
    useReasoning: boolean;
    useWebSearch: boolean;
    useMaps: boolean;
  };
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  thought?: string;
  timestamp: number;
  attachments?: FileMetadata[];
  toolInvocations?: { name: string; args: any }[];
  groundingSources?: { title: string; uri: string }[];
}
