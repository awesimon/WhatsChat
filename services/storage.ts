
import { ChatSession, ChatMessage, KnowledgeBase, FileMetadata } from '../types';

const SQLITE_DB_KEY = 'gemini_sqlite_db';

class SQLiteStorage {
  private db: any = null;
  private SQL: any = null;

  private async ensureSqlJsLoaded(): Promise<void> {
    if ((window as any).initSqlJs) return;

    console.log("SQL.js not found on window, loading dynamically...");
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.js";
      // Integrity check removed to prevent 'Failed to fetch' errors on hash mismatch
      script.crossOrigin = "anonymous";
      script.referrerPolicy = "no-referrer";
      script.onload = () => {
        console.log("SQL.js script loaded");
        resolve();
      };
      script.onerror = (e) => {
        console.error("Failed to load SQL.js script", e);
        reject(new Error("Failed to load SQL.js script (Network error)"));
      };
      document.head.appendChild(script);
    });
  }

  async init() {
    if (this.db) return;

    try {
        await this.ensureSqlJsLoaded();
        
        // Wait a tick just in case
        if (!(window as any).initSqlJs) {
             throw new Error("initSqlJs is still not defined after script load");
        }

        // Load SQL.js WASM
        this.SQL = await (window as any).initSqlJs({
          locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
        });

        const savedDb = localStorage.getItem(SQLITE_DB_KEY);
        if (savedDb) {
        const u8 = new Uint8Array(atob(savedDb).split("").map(c => c.charCodeAt(0)));
        this.db = new this.SQL.Database(u8);
        
        // Migration: Add indexingMethod column if it doesn't exist
        try {
            this.db.run("ALTER TABLE kb_files ADD COLUMN indexingMethod TEXT");
        } catch (e) {
            // Column likely exists
        }
        } else {
        this.db = new this.SQL.Database();
        this.createTables();
        }
    } catch (e) {
        console.error("Failed to initialize SQLite storage:", e);
        throw e;
    }
  }

  private createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT,
        lastUpdated INTEGER,
        activeKBId TEXT,
        settings TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sessionId TEXT,
        role TEXT,
        content TEXT,
        thought TEXT,
        timestamp INTEGER,
        attachments TEXT,
        toolInvocations TEXT,
        groundingSources TEXT,
        FOREIGN KEY(sessionId) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS knowledge_bases (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS kb_files (
        id TEXT PRIMARY KEY,
        kbId TEXT,
        name TEXT,
        type TEXT,
        size INTEGER,
        data TEXT,
        content TEXT,
        indexingMethod TEXT,
        FOREIGN KEY(kbId) REFERENCES knowledge_bases(id) ON DELETE CASCADE
      );
    `);
    this.saveToDisk();
  }

  private saveToDisk() {
    try {
        const data = this.db.export();
        // Chunk processing to prevent "Maximum call stack size exceeded"
        const CHUNK_SIZE = 0x8000; // 32768
        const arr = Array.from(data as Uint8Array);
        let binary = '';
        
        for (let i = 0; i < arr.length; i += CHUNK_SIZE) {
            const chunk = arr.slice(i, i + CHUNK_SIZE);
            binary += String.fromCharCode.apply(null, chunk as number[]);
        }
        
        const base64 = btoa(binary);
        localStorage.setItem(SQLITE_DB_KEY, base64);
    } catch (e) {
        console.error("Failed to save DB to disk", e);
    }
  }

  // Session Methods
  async saveSessions(sessions: ChatSession[]) {
    // For simplicity in this implementation, we overwrite or upsert
    // Wrap in transaction for performance
    this.db.run("BEGIN TRANSACTION");
    for (const session of sessions) {
      this.db.run(`INSERT OR REPLACE INTO sessions (id, title, lastUpdated, activeKBId, settings) VALUES (?, ?, ?, ?, ?)`, [
        session.id,
        session.title,
        session.lastUpdated,
        session.activeKBId || null,
        JSON.stringify(session.settings)
      ]);

      // Messages are handled separately or via child sync
      for (const msg of session.messages) {
        this.saveMessage(session.id, msg);
      }
    }
    this.db.run("COMMIT");
    this.saveToDisk();
  }

  private saveMessage(sessionId: string, msg: ChatMessage) {
    this.db.run(`INSERT OR REPLACE INTO messages (id, sessionId, role, content, thought, timestamp, attachments, toolInvocations, groundingSources) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      msg.id,
      sessionId,
      msg.role,
      msg.content,
      msg.thought || null,
      msg.timestamp,
      JSON.stringify(msg.attachments || []),
      JSON.stringify(msg.toolInvocations || []),
      JSON.stringify(msg.groundingSources || [])
    ]);
  }

  async getSessions(): Promise<ChatSession[]> {
    const res = this.db.exec("SELECT * FROM sessions ORDER BY lastUpdated DESC");
    if (res.length === 0) return [];

    const columns = res[0].columns;
    const values = res[0].values;

    const sessions: ChatSession[] = [];
    for (const row of values) {
      const session: any = {};
      columns.forEach((col: string, i: number) => {
        session[col] = row[i];
      });

      // Parse JSON
      try {
        session.settings = JSON.parse(session.settings);
      } catch {
        session.settings = { useReasoning: true, useWebSearch: true, useMaps: false };
      }
      
      // Load Messages for this session
      session.messages = this.getMessages(session.id);
      
      sessions.push(session as ChatSession);
    }
    return sessions;
  }

  private getMessages(sessionId: string): ChatMessage[] {
    const res = this.db.exec(`SELECT * FROM messages WHERE sessionId = ? ORDER BY timestamp ASC`, [sessionId]);
    if (res.length === 0) return [];

    const columns = res[0].columns;
    const values = res[0].values;

    return values.map((row: any[]) => {
      const msg: any = {};
      columns.forEach((col: string, i: number) => {
        msg[col] = row[i];
      });
      try { msg.attachments = JSON.parse(msg.attachments); } catch { msg.attachments = []; }
      try { msg.toolInvocations = JSON.parse(msg.toolInvocations); } catch { msg.toolInvocations = []; }
      try { msg.groundingSources = JSON.parse(msg.groundingSources); } catch { msg.groundingSources = []; }
      return msg as ChatMessage;
    });
  }

  async deleteSession(id: string) {
    this.db.run("DELETE FROM sessions WHERE id = ?", [id]);
    this.db.run("DELETE FROM messages WHERE sessionId = ?", [id]);
    this.saveToDisk();
  }

  // Knowledge Base Methods
  async getKnowledgeBases(): Promise<KnowledgeBase[]> {
    const res = this.db.exec("SELECT * FROM knowledge_bases ORDER BY createdAt DESC");
    if (res.length === 0) return [];

    const columns = res[0].columns;
    const values = res[0].values;

    const kbs: KnowledgeBase[] = [];
    for (const row of values) {
      const kb: any = {};
      columns.forEach((col: string, i: number) => {
        kb[col] = row[i];
      });
      kb.files = this.getFiles(kb.id);
      kbs.push(kb as KnowledgeBase);
    }
    return kbs;
  }

  private getFiles(kbId: string): FileMetadata[] {
    const res = this.db.exec(`SELECT * FROM kb_files WHERE kbId = ?`, [kbId]);
    if (res.length === 0) return [];

    const columns = res[0].columns;
    const values = res[0].values;

    return values.map((row: any[]) => {
      const file: any = {};
      columns.forEach((col: string, i: number) => {
        file[col] = row[i];
      });
      
      // Parse indexingMethod from string/JSON to string[]
      if (file.indexingMethod) {
          try {
              const parsed = JSON.parse(file.indexingMethod);
              file.indexingMethod = Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
              // Handle legacy string data (e.g., "vector") that isn't valid JSON
              file.indexingMethod = [file.indexingMethod];
          }
      } else {
          file.indexingMethod = ['vector']; // Default
      }

      return file as FileMetadata;
    });
  }

  async saveKnowledgeBase(kb: KnowledgeBase) {
    this.db.run(`INSERT OR REPLACE INTO knowledge_bases (id, name, description, createdAt) VALUES (?, ?, ?, ?)`, [
      kb.id,
      kb.name,
      kb.description,
      kb.createdAt
    ]);
    this.db.run("BEGIN TRANSACTION");
    for (const file of kb.files) {
      this.db.run(`INSERT OR REPLACE INTO kb_files (id, kbId, name, type, size, data, content, indexingMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        file.id,
        kb.id,
        file.name,
        file.type,
        file.size,
        file.data,
        file.content || null,
        JSON.stringify(file.indexingMethod || ['vector'])
      ]);
    }
    this.db.run("COMMIT");
    this.saveToDisk();
  }

  async deleteKnowledgeBase(id: string) {
    this.db.run("DELETE FROM knowledge_bases WHERE id = ?", [id]);
    this.db.run("DELETE FROM kb_files WHERE kbId = ?", [id]);
    this.saveToDisk();
  }
  
  async deleteFile(id: string) {
    this.db.run("DELETE FROM kb_files WHERE id = ?", [id]);
    this.saveToDisk();
  }

  async updateSessionTitle(id: string, title: string) {
    this.db.run("UPDATE sessions SET title = ? WHERE id = ?", [title, id]);
    this.saveToDisk();
  }
}

export const storageService = new SQLiteStorage();
