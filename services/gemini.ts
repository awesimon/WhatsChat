
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage, FileMetadata, Role, ChatSession } from "../types";

export class GeminiService {
  constructor() {}

  private mapHistoryToContents(history: ChatMessage[]) {
    return history.map(m => {
      const parts: any[] = [];
      if (m.content) parts.push({ text: m.content });
      if (m.attachments) {
        for (const attachment of m.attachments) {
          if (attachment.type.startsWith('image/') || attachment.type === 'application/pdf') {
            parts.push({ inlineData: { data: attachment.data, mimeType: attachment.type } });
          }
        }
      }
      return { role: m.role === Role.USER ? 'user' : 'model', parts };
    });
  }

  async generateStream(
    session: ChatSession,
    knowledgeBase: FileMetadata[],
    onChunk: (text: string, thought: string, sources?: any[]) => void,
    onToolCall?: (tool: string, args: any) => void
  ) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const history = session.messages;
    const lastMessage = history[history.length - 1];
    const userContent = lastMessage.content || "";
    
    // Config based on session settings
    const { useReasoning, useWebSearch, useMaps } = session.settings;
    
    let modelName = useReasoning ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    const tools: any[] = [];

    if (useWebSearch) tools.push({ googleSearch: {} });
    if (useMaps) {
      modelName = 'gemini-2.5-flash'; // Required for maps
      tools.push({ googleMaps: {} });
    }

    let kbParts: any[] = [];
    if (knowledgeBase.length > 0) {
      const kbHeader = `[KNOWLEDGE BASE] The following documents are provided for context. Search them carefully for relevant information. Use citations.\n\n`;
      kbParts.push({ text: kbHeader });
      for (const file of knowledgeBase) {
        if (file.content) {
          kbParts.push({ text: `FILE: ${file.name}\nCONTENT:\n${file.content}\n---\n` });
        } else {
          kbParts.push({ inlineData: { data: file.data, mimeType: file.type } });
        }
      }
    }

    const contents = this.mapHistoryToContents(history.slice(0, -1));
    const currentTurnParts: any[] = [...kbParts];

    if (lastMessage.attachments) {
      for (const attachment of lastMessage.attachments) {
        if (attachment.type.startsWith('image/') || attachment.type === 'application/pdf') {
          currentTurnParts.push({ inlineData: { data: attachment.data, mimeType: attachment.type } });
        }
      }
    }
    
    currentTurnParts.push({ text: userContent });
    contents.push({ role: 'user', parts: currentTurnParts });

    const config: any = {
      thinkingConfig: { thinkingBudget: useReasoning ? 32000 : 0 },
      tools: tools.length > 0 ? tools : undefined,
    };

    if (useMaps) {
      try {
        const pos: any = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }));
        config.toolConfig = { retrievalConfig: { latLng: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } } };
      } catch (e) { /* ignore */ }
    }

    try {
      const responseStream = await ai.models.generateContentStream({ model: modelName, contents, config });
      let fullText = "", fullThought = "";
      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        const thoughtPart = (c as any).candidates?.[0]?.content?.parts?.find((p: any) => p.thought);
        if (thoughtPart) fullThought += thoughtPart.thought;
        fullText += c.text || "";
        const sources = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
        onChunk(fullText, fullThought, sources);
        const parts = (c as any).candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.functionCall && onToolCall) onToolCall(part.functionCall.name, part.functionCall.args);
          }
        }
      }
    } catch (err: any) { throw err; }
  }
}
