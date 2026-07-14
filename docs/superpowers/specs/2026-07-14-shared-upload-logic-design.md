# Design Spec: Centralized File Upload and Paste Image Fix

This specification details centralizing the resumable file upload logic to Google Drive into a shared utility file, and using it to resolve the paste-image clipboard bug and description image upload bugs in `CardDetailModal.tsx`.

## Proposed Changes

### Shared Utility

#### [NEW] [upload.ts](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/lib/upload.ts)
Create a new file to encapsulate the Google Drive resumable upload flow:
- `uploadFileToDrive(file: File, onProgress?: (percent: number) => void): Promise<UploadedFileResponse>`
- This function handles:
  1. Initiating the session (`POST /api/attachments/upload` with JSON body).
  2. Uploading chunk-by-chunk (`PUT /api/attachments/upload?action=chunk`).
  3. Completing the session (`POST /api/attachments/upload?action=complete` with JSON body).
  4. Correctly falling back to Mock Mode if the API indicates a mock upload is being run.

---

### Component Changes

#### [MODIFY] [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx)
- Import `uploadFileToDrive` from `src/lib/upload`.
- Refactor `handleFileAttach` to delegate upload to `uploadFileToDrive`.
- Refactor `handleImageAttach` to delegate upload to `uploadFileToDrive`.
- Refactor `handleDescImageAttach` to use `uploadFileToDrive` instead of the deprecated `FormData` post.
- Refactor `createPasteHandler` (in `useEffect`) to use `uploadFileToDrive` instead of the deprecated `FormData` post.

#### [MODIFY] [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx)
- Import `uploadFileToDrive` from `src/lib/upload`.
- Refactor `handleFileAttach` to use `uploadFileToDrive`, updating the state using the `onProgress` callback.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify there are no TypeScript compilation errors.

### Manual Verification
- Copy an image to the clipboard, click inside details or description textareas, and press Ctrl+V to paste. Confirm the image is uploaded successfully and correctly rendered as markdown.
- Click "📎 Đính kèm tệp tin" in the description section to upload an image. Confirm it works.
- Attach files in both `CardPopover.tsx` and `CardDetailModal.tsx`. Verify that progress bars increment correctly during upload.
