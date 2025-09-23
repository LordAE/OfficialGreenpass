// src/api/integrations.js
// Real Firebase-backed integrations (safe, tree-shakeable)

// ---- LLM (kept as stub so nothing else breaks)
export async function InvokeLLM({ messages, model }) {
  console.warn('InvokeLLM called – no LLM is configured.');
  return {
    id: 'stub-llm-response',
    choices: [{ message: { role: 'assistant', content: 'LLM is not configured.' } }]
  };
}

// ---- Email (kept as stub; hook your provider later)
export async function SendEmail({ to, subject, text, html }) {
  console.warn('SendEmail called – email service is not configured.');
  return { messageId: 'stub-email-123' };
}

/**
 * Upload a file to Firebase Storage and return a downloadable URL.
 *
 * @param {Object} params
 * @param {File|Blob} params.file - Browser File/Blob to upload
 * @param {string} [params.path]  - Optional folder path, e.g. "events/evt_123/cover"
 * @param {(progress:number)=>void} [params.onProgress] - Optional progress callback (0..100)
 *
 * @returns {Promise<{ file_url: string, storage_path: string, size: number, content_type: string }>}
 */
export async function UploadFile({ file, path, onProgress }) {
  if (!file) throw new Error('UploadFile: "file" is required');

  // Import Firebase only when needed to keep bundles tidy
  const { storage } = await import('@/firebase');
  const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');

  // Build a clean, organized storage path
  const ext = (file.name?.split('.').pop() || 'bin').toLowerCase();
  const safeName = (file.name || `file.${ext}`).replace(/[^\w.\-]/g, '_');
  const folder = path || `uploads/${new Date().toISOString().slice(0, 10)}`; // yyyy-mm-dd
  const storagePath = `${folder}/${Date.now()}_${safeName}`;

  const storageRef = ref(storage, storagePath);
  const metadata = { contentType: file.type || 'application/octet-stream' };
  const task = uploadBytesResumable(storageRef, file, metadata);

  await new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          try { onProgress(pct); } catch { /* ignore */ }
        }
      },
      reject,
      resolve
    );
  });

  const file_url = await getDownloadURL(task.snapshot.ref);
  return {
    file_url,
    storage_path: storagePath,
    size: task.snapshot.totalBytes,
    content_type: metadata.contentType
  };
}

// ---- Image generation (kept as stub)
export async function GenerateImage() {
  console.warn('GenerateImage called – image generation disabled.');
  return { url: 'https://example.com/stub-image' };
}
