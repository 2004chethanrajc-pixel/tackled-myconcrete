import apiClient from '../../services/apiClient';

export const worklogsApi = {
  // GET /api/v1/worklogs/project/:projectId - Get work logs by project
  getWorklogsByProject: async (projectId) => {
    if (!projectId) {
      return { success: true, data: { worklogs: [] } };
    }
    const response = await apiClient.get(`/worklogs/project/${projectId}`);
    return response.data;
  },

  // POST /api/v1/worklogs - Create work log
  createWorklog: async (worklogData) => {
    const response = await apiClient.post('/worklogs', worklogData);
    return response.data;
  },

  // POST /api/v1/worklogs/:id/images - Add images/videos/audio to work log
  addWorklogImages: async (worklogId, images) => {
    const formData = new FormData();
    const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

    for (let index = 0; index < images.length; index++) {
      const image = images[index];
      const uri = image.uri;
      const ext = uri.split('.').pop().toLowerCase();

      // Pre-flight size check (fileSize may be available from ImagePicker)
      if (image.fileSize && image.fileSize > MAX_SIZE_BYTES) {
        const sizeMB = (image.fileSize / (1024 * 1024)).toFixed(1);
        throw new Error(`File "${image.name || `file ${index + 1}`}" is ${sizeMB}MB. Maximum allowed size is 100MB.`);
      }

      const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(ext) || image.type === 'video';
      const isAudio = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'opus'].includes(ext) || image.type === 'audio';
      const isImage = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'avif'].includes(ext) || image.type === 'image';

      if (!isVideo && !isAudio && !isImage) {
        throw new Error(`File "${image.name || ext}" is not supported. Only images (jpg, png, webp), videos (mp4, mov), and audio files are allowed.`);
      }

      let mimeType;
      if (isAudio) {
        mimeType = ext === 'm4a' ? 'audio/mp4' : `audio/${ext}`;
      } else if (isVideo) {
        mimeType = `video/${ext === 'mov' ? 'quicktime' : ext}`;
      } else {
        mimeType = `image/${ext}`;
      }

      const fileName = image.name || `worklog-media-${Date.now()}-${index}.${ext}`;
      formData.append('images', { uri, name: fileName, type: mimeType });
    }

    console.log('Sending FormData to backend...');
    
    const config = {
      headers: {
        'Accept': 'application/json',
        'X-FormData-Request': 'true',
      },
      timeout: 120000, // 2 minutes for large video uploads
    };
    
    const response = await apiClient.post(`/worklogs/${worklogId}/images`, formData, config);
    return response.data;
  },

  // DELETE /api/v1/worklogs/:id/images - Remove image from work log
  removeWorklogImage: async (worklogId, imagePath) => {
    const response = await apiClient.delete(`/worklogs/${worklogId}/images`, {
      data: { imagePath }
    });
    return response.data;
  },
};
