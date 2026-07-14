# Design Spec: Google Drive Client-Direct Resumable Upload

This specification outlines the transition from server-mediated file uploads (which are subject to Vercel's 4.5MB request body size limit) to a client-direct resumable upload architecture.

## Proposed Changes

### API Changes

#### [MODIFY] [route.ts](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/api/attachments/upload/route.ts)
We will split the endpoint functionality:
- If a client requests `POST /api/attachments/upload` with JSON containing `{ name, mimeType, size }`:
  - Perform credentials configuration check. If missing, return mock indicators.
  - Call Google Drive API to initiate a resumable session and retrieve the session URL.
  - Return the session URL (`uploadUrl`).
- We will support a secondary path `POST /api/attachments/upload?action=complete` or a separate route `/api/attachments/upload/complete/route.ts`:
  - Let's support an action query parameter on the existing route: `POST /api/attachments/upload?action=complete`.
  - Accept `{ fileId }`.
  - Update Google Drive file permissions to public view.

---

### Component Changes

#### [MODIFY] [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx)
- Modify file upload handler to:
  1. Call `/api/attachments/upload` with metadata to obtain `uploadUrl`.
  2. If mock, simulate upload and trigger save.
  3. Otherwise, perform a binary `PUT` request with progress tracking directly to the Google Drive session URL.
  4. Call `/api/attachments/upload?action=complete` to set public permissions.
  5. Save to database using existing logic.

#### [MODIFY] [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx)
- Align the file upload logic (`handleFileAttach`) to use the exact same two-step resumable upload logic as `CardPopover.tsx` to handle large files successfully.

---

## Verification Plan

### Automated Tests
- Run `npm run test` to verify that there are no regressions in existing components.

### Manual Verification
- Test file attachments with files smaller than 4.5MB.
- Test file attachments with files larger than 4.5MB (e.g. 5MB to 10MB) on Vercel deployment if staging is available, or simulate slow connection uploads locally.
- Verify that Google Drive file permissions are correctly set to public.
