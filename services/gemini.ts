
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { ChatMessage, FileMetadata, Role } from "../types";

export class GeminiService {
  constructor() {}

  private mapHistoryToContents(history: ChatMessage[]) {
    return history.map(m => {
      const parts: any[] = [];
      if (m.content) parts.push({ text: m.content });
      if (m.attachments) {
        for (const attachment of m.attachments) {
          if (attachment.type.startsWith('image/')) {
            parts.push({ inlineData: { data: attachment.data, mimeType: attachment.type } });
          } else if (attachment.type === 'application/pdf') {
            parts.push({ inlineData: { data: attachment.data, mimeType: attachment.type } });
          }
        }
      }
      return { role: m.role === Role.USER ? 'user' : 'model', parts };
    });
  }

  async generateStream(
    history: ChatMessage[],
    knowledgeBase: FileMetadata[],
    onChunk: (text: string, thought: string, sources?: any[]) => void,
    onToolCall?: (tool: string, args: any) => void
  ) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const lastMessage = history[history.length - 1];
    const userContent = lastMessage.content || "";
    
    const hasLocationQuery = /near|at|map|restaurant|where|direction|location/i.test(userContent);
    const hasRecentQuery = /news|today|recent|weather|price|search|current/i.test(userContent);
    
    let modelName = 'gemini-3-pro-preview';
    const tools: any[] = [];

    if (hasLocationQuery) {
      modelName = 'gemini-2.5-flash';
      tools.push({ googleMaps: {} });
    } else if (hasRecentQuery) {
      modelName = 'gemini-3-flash-preview';
      tools.push({ googleSearch: {} });
    }

    // Build KB Context - Better separation and instructions
    let kbInstruction = "";
    const kbParts: any[] = [];
    
    if (knowledgeBase.length > 0) {
      kbInstruction = `
[SYSTEM INSTRUCTION: KNOWLEDGE BASE]
You have access to a collection of uploaded documents. 
CRITICAL: When answering, check ALL documents. If multiple documents are present, distinguish between them. 
The user might ask about the latest file uploaded; if so, identify which one is most recent or relevant.
Always cite the source using the format: [Source: Filename, Page/Index].
If a document is a PDF or Image, use the visual parts provided. If it is Text, read the provided text content.

[DOCUMENTS LIST]:
${knowledgeBase.map((f, i) => `${i+1}. ${f.name} (${f.type})`).join('\n')}
`;
      
      kbParts.push({ text: kbInstruction });

      // Add each file's content/data as a distinct part
      for (const file of knowledgeBase) {
        if (file.content) {
          // Send text content as text
          kbParts.push({ text: `--- START OF FILE: ${file.name} ---\n${file.content}\n--- END OF FILE: ${file.name} ---` });
        } else if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
          // Send binary data as inlineData
          kbParts.push({ text: `[Visual data for file: ${file.name}]` });
          kbParts.push({ inlineData: { data: file.data, mimeType: file.type } });
        }
      }
    }

    const contents = this.mapHistoryToContents(history.slice(0, -1));

    const currentTurnParts: any[] = [...kbParts];
    
    // Add current message attachments
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
      thinkingConfig: { thinkingBudget: 16000 },
      tools: tools.length > 0 ? tools : undefined,
    };

    if (hasLocationQuery) {
      try {
        const pos: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        config.toolConfig = { retrievalConfig: { latLng: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } } };
      } catch (e) { console.warn("Geo failed"); }
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
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      throw err;
    }
  }
}
