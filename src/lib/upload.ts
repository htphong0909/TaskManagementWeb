export interface UploadedFileResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  url?: string;
  fileId?: string;
}

export async function uploadFileToDrive(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedFileResponse> {
  // 1. Initiate upload session
  const initRes = await fetch("/api/attachments/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    }),
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(errText || "Không thể khởi tạo phiên tải lên");
  }

  const initData = await initRes.json();

  if (initData.mock) {
    // Mock Mode for developer fallback
    if (onProgress) {
      for (let percent = 10; percent <= 100; percent += 30) {
        onProgress(percent);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    return {
      name: file.name,
      url: "https://drive.google.com/file/d/mock-server-" + Date.now(),
      fileId: "mock-server-" + Date.now(),
      id: "mock-server-" + Date.now(),
      mimeType: file.type || "application/octet-stream"
    };
  }

  // 2. Perform chunked upload
  const totalSize = file.size;
  let offset = 0;
  let completedData = null;
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB

  while (offset < totalSize) {
    const end = Math.min(offset + CHUNK_SIZE, totalSize);
    const chunk = file.slice(offset, end);
    
    const res = await fetch("/api/attachments/upload?action=chunk", {
      method: "PUT",
      headers: {
        "x-upload-url": initData.uploadUrl,
        "x-content-range": `bytes ${offset}-${end - 1}/${totalSize}`,
        "content-type": file.type || "application/octet-stream",
      },
      body: chunk,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Tải phần tệp tại ${offset} thất bại: ${errText}`);
    }

    const result = await res.json();
    offset = end;

    if (onProgress) {
      const percent = Math.round((offset / totalSize) * 100);
      onProgress(percent);
    }

    if (result.completed) {
      completedData = result.data;
    }
  }

  if (!completedData) {
    throw new Error("Không nhận được phản hồi hoàn tất từ Google Drive");
  }

  // 3. Complete Permissions (make file public)
  const completeRes = await fetch("/api/attachments/upload?action=complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId: completedData.id }),
  });

  if (!completeRes.ok) {
    console.warn("Không thể tự động chia sẻ tệp công khai");
  }

  return completedData;
}
