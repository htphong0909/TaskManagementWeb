# Design Spec: Google Drive Chunked Upload via Proxy

This specification details the implementation of a client-side chunked upload mechanism proxied through Next.js API routes. This architecture bypasses Vercel's 4.5MB request body size limit and circumvents Google Drive API's CORS limitations on browser direct requests.

## Proposed Changes

### API Changes

#### [MODIFY] [route.ts](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/api/attachments/upload/route.ts)
Refactor `POST` and add `PUT` support to handle the following actions:
1. **Initiate Session (`POST /api/attachments/upload` with JSON body `{ name, mimeType, size }`)**:
   - Requests a resumable upload session location from Google Drive.
   - Returns `{ uploadUrl }` (or mock indicators if credentials are not configured).
2. **Upload Chunk (`PUT /api/attachments/upload?action=chunk`)**:
   - Expects raw binary data in request body.
   - Extracts custom headers: `x-upload-url`, `x-content-range`, `content-type`.
   - Forwards the binary data to Google Drive.
   - Checks response: HTTP `308` indicates intermediate success; HTTP `200`/`201` indicates completion.
   - Returns `{ completed: true, data }` or `{ completed: false }`.
3. **Complete Permissions (`POST /api/attachments/upload?action=complete` with JSON body `{ fileId }`)**:
   - Sets the Google Drive file permissions to public read access.

---

### Component Changes

#### [MODIFY] [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx)
- Implement client-side slicing of files into 2MB chunks.
- Upload chunks sequentially to `/api/attachments/upload?action=chunk` using standard `fetch` requests with progress updates.
- Call the completion action to make the file public, then save file details to Supabase.

#### [MODIFY] [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx)
- Implement the exact same client-side chunked upload routine for both file attachment (`handleFileAttach`) and inline markdown image upload (`handleImageAttach`).

---

## Verification Plan

### Automated Tests
- Run `npm run test` to verify no regressions.

### Manual Verification
- Test file attachments with files smaller than 2MB (single chunk).
- Test file attachments with files larger than 4.5MB (multiple chunks) to verify Vercel limit bypass.
- Verify upload progress increments smoothly.
- Check that files on Google Drive are public and viewable.
