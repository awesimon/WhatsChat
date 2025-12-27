
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
  data: string; // Base64 for binary
  content?: string; // Extracted text for the model to read
  pages?: number;
}

export interface MessagePart {
  text?: string;
  thought?: string;
  toolCall?: {
    name: string;
    args: any;
  };
  image?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Citation {
  startIndex: number;
  endIndex: number;
  uri?: string;
  sourceTitle?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  thought?: string;
  timestamp: number;
  attachments?: FileMetadata[];
  toolInvocations?: { name: string; args: any; result?: any }[];
  groundingSources?: GroundingSource[];
  citations?: Citation[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: number;
  knowledgeBase: FileMetadata[];
}
