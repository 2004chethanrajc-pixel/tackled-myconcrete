import NetInfo from '@react-native-community/netinfo';
import { getPendingItems, markDone, markFailed, cleanupOldDone } from './offlineQueue';
import { reportsApi } from '../features/reports/api';
import { worklogsApi } from '../features/worklogs/api';

let isSyncing = false;

const uploadReportImages = async (imageUris) => {
  if (!imageUris || imageUris.length === 0) return [];
  const formData = new FormData();
  imageUris.forEach((uri, index) => {
    const ext = uri.split('.').pop().toLowerCase();
    const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(ext);
    const mimeType = isVideo ? `video/${ext === 'mov' ? 'quicktime' : ext}` : `image/${ext}`;
    formData.append('images', { uri, name: `report-media-${Date.now()}-${index}.${ext}`, type: mimeType });
  });
  const response = await reportsApi.uploadImages(formData);
  if (response.success) return response.data.images;
  throw new Error('Image upload failed');
};

export const processQueue = async () => {
  if (isSyncing) return;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;

  isSyncing = true;
  try {
    const items = await getPendingItems();
    if (items.length === 0) {
      await cleanupOldDone();
      return;
    }

    console.log(`[SyncService] Processing ${items.length} offline item(s)...`);

    for (const item of items) {
      try {
        if (item.type === 'report') {
          const imagePaths = await uploadReportImages(item.file_uris);
          await reportsApi.submitReport({ ...item.payload, images: imagePaths });
          await markDone(item.id);
          console.log(`[SyncService] Report synced (id=${item.id})`);
        } else if (item.type === 'worklog') {
          await worklogsApi.createWorklog(item.payload);
          await markDone(item.id);
          console.log(`[SyncService] Worklog synced (id=${item.id})`);
        } else if (item.type === 'worklog_images') {
          const { worklogId } = item.payload;
          await worklogsApi.addWorklogImages(worklogId, item.file_uris);
          await markDone(item.id);
          console.log(`[SyncService] Worklog images synced (id=${item.id})`);
        }
      } catch (err) {
        console.warn(`[SyncService] Failed to sync item ${item.id}:`, err.message);
        await markFailed(item.id);
      }
    }

    // Clean up done items older than 24 hours
    await cleanupOldDone();
  } finally {
    isSyncing = false;
  }
};

export const startSyncListener = () => {
  return NetInfo.addEventListener(state => {
    if (state.isConnected) {
      processQueue();
    }
  });
};
