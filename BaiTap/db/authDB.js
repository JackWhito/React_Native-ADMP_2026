import { openDatabaseAsync } from "expo-sqlite";

let db = null;
let initializing = false;

export const initAuthDB = async () => {
  if (db) return db;
  if (initializing) return null;

  initializing = true;
  console.log("Opening SQLite DB...");

  try {
    db = await openDatabaseAsync("auth.db");

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS auth_user (
        id TEXT PRIMARY KEY NOT NULL,
        data TEXT NOT NULL
      );
    `);

    console.log("SQLite DB ready");
    return db;
  } catch (e) {
    console.error("SQLite init failed:", e);
    throw e;
  } finally {
    initializing = false;
  }
};

export const saveAuthUser = async (user) => {
  const database = await initAuthDB();
  if (!database) throw new Error("DB not ready");

  await database.runAsync(
    "REPLACE INTO auth_user (id, data) VALUES (?, ?);",
    "me",
    JSON.stringify(user)
  );
  console.log("user saved")
};

export const getAuthUser = async () => {
  const database = await initAuthDB();
  if (!database) return null;
  const row = await database.getFirstAsync(
    "SELECT data FROM auth_user WHERE id = ?;",
    "me"
  );
  return row ? JSON.parse(row.data) : null;
};

export const clearAuthUser = async () => {
  const database = await initAuthDB();
  if (!database) return;

  await database.execAsync("DELETE FROM auth_user;");
};
