
import { ChatSession, ChatMessage, KnowledgeBase, FileMetadata } from '../types';

const SQLITE_DB_KEY = 'gemini_sqlite_db';

class SQLiteStorage {
  private db: any = null;
  private SQL: any = null;

  async init() {
    if (this.db) return;

    // Load SQL.js WASM
    this.SQL = await (window as any).initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
    });

    const savedDb = localStorage.getItem(SQLITE_DB_KEY);
    if (savedDb) {
      const u8 = new Uint8Array(atob(savedDb).split("").map(c => c.charCodeAt(0)));
      this.db = new this.SQL.Database(u8);
    } else {
      this.db = new this.SQL.Database();
      this.createTables();
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
        FOREIGN KEY(kbId) REFERENCES knowledge_bases(id) ON DELETE CASCADE
      );
    `);
    this.saveToDisk();
  }

  private saveToDisk() {
    const data = this.db.export();
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(data)));
    localStorage.setItem(SQLITE_DB_KEY, base64);
  }

  // Session Methods
  async saveSessions(sessions: ChatSession[]) {
    // For simplicity in this implementation, we overwrite or upsert
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
      session.settings = JSON.parse(session.settings);
      
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
      msg.attachments = JSON.parse(msg.attachments);
      msg.toolInvocations = JSON.parse(msg.toolInvocations);
      msg.groundingSources = JSON.parse(msg.groundingSources);
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
    for (const file of kb.files) {
      this.db.run(`INSERT OR REPLACE INTO kb_files (id, kbId, name, type, size, data, content) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        file.id,
        kb.id,
        file.name,
        file.type,
        file.size,
        file.data,
        file.content || null
      ]);
    }
    this.saveToDisk();
  }

  async deleteKnowledgeBase(id: string) {
    this.db.run("DELETE FROM knowledge_bases WHERE id = ?", [id]);
    this.db.run("DELETE FROM kb_files WHERE kbId = ?", [id]);
    this.saveToDisk();
  }

  async updateSessionTitle(id: string, title: string) {
    this.db.run("UPDATE sessions SET title = ? WHERE id = ?", [title, id]);
    this.saveToDisk();
  }
}

export const storageService = new SQLiteStorage();
