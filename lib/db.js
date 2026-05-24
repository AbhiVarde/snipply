import { openDB } from "idb";

const DB_NAME = "snipply";
const STORE = "components";

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    },
  });
}

export async function saveLocal(component) {
  const db = await getDB();
  await db.put(STORE, { ...component, savedAt: Date.now() });
}

export async function getLocal(id) {
  const db = await getDB();
  return db.get(STORE, id);
}

export async function getAllLocal() {
  const db = await getDB();
  return db.getAll(STORE);
}
