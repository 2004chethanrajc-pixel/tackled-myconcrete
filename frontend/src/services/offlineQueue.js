import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

let db = null;

export const initDB = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('offline_queue.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      file_uris TEXT,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      synced_at TEXT
    );
  `);
  return db;
};

// Copy a file to persistent app storage so it survives cache clears
const persistFile = async (uri) => {
  if (!uri || uri.startsWith(FileSystem.documentDirectory)) return uri;
  try {
    const ext = uri.split('.').pop().toLowerCase();
    const fileName = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const dest = `${FileSystem.documentDirectory}offline_media/${fileName}`;
    await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}offline_media/`, { intermediates: true });
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch (e) {
    console.warn('Could not persist file:', e);
    return uri;
  }
};

export const enqueueReport = async (reportData, imageUris = []) => {
  const database = await initDB();
  const persistedUris = await Promise.all(imageUris.map(persistFile));
  await database.runAsync(
    `INSERT INTO offline_queue (type, payload, file_uris, created_at, status) VALUES (?, ?, ?, ?, 'pending')`,
    ['report', JSON.stringify(reportData), JSON.stringify(persistedUris), new Date().toISOString()]
  );
};

export const enqueueWorklog = async (worklogData) => {
  const database = await initDB();
  await database.runAsync(
    `INSERT INTO offline_queue (type, payload, file_uris, created_at, status) VALUES (?, ?, ?, ?, 'pending')`,
    ['worklog', JSON.stringify(worklogData), JSON.stringify([]), new Date().toISOString()]
  );
};

export const enqueueWorklogImages = async (worklogId, images = []) => {
  const database = await initDB();
  const persistedUris = await Promise.all(images.map(img => persistFile(img.uri)));
  const imagesMeta = images.map((img, i) => ({ ...img, uri: persistedUris[i] }));
  await database.runAsync(
    `INSERT INTO offline_queue (type, payload, file_uris, created_at, status) VALUES (?, ?, ?, ?, 'pending')`,
    ['worklog_images', JSON.stringify({ worklogId }), JSON.stringify(imagesMeta), new Date().toISOString()]
  );
};

export const getPendingItems = async () => {
  const database = await initDB();
  const rows = await database.getAllAsync(`SELECT * FROM offline_queue WHERE status = 'pending' ORDER BY id ASC`);
  return rows.map(row => ({
    ...row,
    payload: JSON.parse(row.payload),
    file_uris: JSON.parse(row.file_uris),
  }));
};

export const getPendingCount = async () => {
  const database = await initDB();
  const result = await database.getFirstAsync(`SELECT COUNT(*) as count FROM offline_queue WHERE status = 'pending'`);
  return result?.count || 0;
};

export const markDone = async (id) => {
  const database = await initDB();
  await database.runAsync(`UPDATE offline_queue SET status = 'done', synced_at = ? WHERE id = ?`, [new Date().toISOString(), id]);
};

export const markFailed = async (id) => {
  const database = await initDB();
  await database.runAsync(`UPDATE offline_queue SET status = 'failed' WHERE id = ?`, [id]);
};

// Delete 'done' rows older than 24 hours and clean up their local files
export const cleanupOldDone = async () => {
  const database = await initDB();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const oldRows = await database.getAllAsync(
    `SELECT id, file_uris FROM offline_queue WHERE status = 'done' AND synced_at < ?`,
    [cutoff]
  );

  for (const row of oldRows) {
    try {
      const uris = JSON.parse(row.file_uris || '[]');
      // uris can be strings (report images) or objects with .uri (worklog images)
      const paths = uris.map(u => (typeof u === 'string' ? u : u?.uri)).filter(Boolean);
      for (const path of paths) {
        if (path && path.startsWith(FileSystem.documentDirectory)) {
          await FileSystem.deleteAsync(path, { idempotent: true });
        }
      }
    } catch (e) {
      console.warn(`[offlineQueue] Could not delete files for row ${row.id}:`, e);
    }
    await database.runAsync(`DELETE FROM offline_queue WHERE id = ?`, [row.id]);
  }

  if (oldRows.length > 0) {
    console.log(`[offlineQueue] Cleaned up ${oldRows.length} old synced item(s)`);
  }
};
