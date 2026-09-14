const Database = require("better-sqlite3");
const path = require("path");
const crypto = require("crypto");

const db = new Database(path.join(__dirname, "zulu.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo chat',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  source_chat_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, memory_key),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_user ON chats(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_chat ON messages(chat_id, id);
CREATE INDEX IF NOT EXISTS idx_memory_user ON memories(user_id, updated_at DESC);
`);

const q = {
  createUser: db.prepare("INSERT INTO users (id, token_hash) VALUES (?, ?)"),
  userByToken: db.prepare("SELECT id, display_name, created_at FROM users WHERE token_hash=?"),
  userById: db.prepare("SELECT id, display_name, created_at FROM users WHERE id=?"),
  setName: db.prepare("UPDATE users SET display_name=? WHERE id=?"),

  createChat: db.prepare("INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)"),
  chatOwned: db.prepare("SELECT * FROM chats WHERE id=? AND user_id=?"),
  listChats: db.prepare("SELECT id,title,created_at,updated_at FROM chats WHERE user_id=? ORDER BY updated_at DESC LIMIT ?"),
  touchChat: db.prepare("UPDATE chats SET updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?"),
  setChatTitle: db.prepare("UPDATE chats SET title=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?"),
  delChat: db.prepare("DELETE FROM chats WHERE id=? AND user_id=?"),

  addMsg: db.prepare("INSERT INTO messages (chat_id,user_id,role,content) VALUES (?,?,?,?)"),
  listMsg: db.prepare("SELECT id,role,content,created_at FROM messages WHERE chat_id=? AND user_id=? ORDER BY id ASC LIMIT ?"),
  recentMsg: db.prepare("SELECT role,content FROM messages WHERE chat_id=? AND user_id=? ORDER BY id DESC LIMIT ?"),

  listMem: db.prepare("SELECT id,category,memory_key,memory_value,source_chat_id,created_at,updated_at FROM memories WHERE user_id=? ORDER BY updated_at DESC LIMIT ?"),
  upsertMem: db.prepare(`
    INSERT INTO memories (user_id,category,memory_key,memory_value,source_chat_id)
    VALUES (?,?,?,?,?)
    ON CONFLICT(user_id,memory_key) DO UPDATE SET
      category=excluded.category,
      memory_value=excluded.memory_value,
      source_chat_id=excluded.source_chat_id,
      updated_at=CURRENT_TIMESTAMP
  `),
  delMem: db.prepare("DELETE FROM memories WHERE id=? AND user_id=?"),
};

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  createUser() {
    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString("hex");
    q.createUser.run(id, hashToken(token));
    return { id, token };
  },
  authByToken(token) {
    if (!token) return null;
    return q.userByToken.get(hashToken(token)) || null;
  },
  setDisplayName(userId, name) {
    q.setName.run(name, userId);
    return q.userById.get(userId);
  },
  createChat(userId, title="Novo chat") {
    const id = crypto.randomUUID();
    q.createChat.run(id, userId, title);
    return q.chatOwned.get(id, userId);
  },
  getChat(userId, chatId) { return q.chatOwned.get(chatId, userId) || null; },
  listChats(userId, limit=100) { return q.listChats.all(userId, limit); },
  deleteChat(userId, chatId) { return q.delChat.run(chatId, userId).changes > 0; },
  setChatTitle(userId, chatId, title) { q.setChatTitle.run(title, chatId, userId); },
  addMessage(userId, chatId, role, content) {
    q.addMsg.run(chatId, userId, role, content);
    q.touchChat.run(chatId, userId);
  },
  listMessages(userId, chatId, limit=500) { return q.listMsg.all(chatId, userId, limit); },
  recentMessages(userId, chatId, limit=16) { return q.recentMsg.all(chatId, userId, limit).reverse(); },
  listMemories(userId, limit=200) { return q.listMem.all(userId, limit); },
  upsertMemory(userId, category, key, value, sourceChatId=null) { q.upsertMem.run(userId, category, key, value, sourceChatId); },
  deleteMemory(userId, id) { return q.delMem.run(id, userId).changes > 0; }
};
