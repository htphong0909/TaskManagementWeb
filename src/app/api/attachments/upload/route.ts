import { NextResponse } from "next/server";

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to refresh access token: ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const urlObj = new URL(request.url);
    const action = urlObj.searchParams.get("action");

    // 1. Completion Action: Set Permissions
    if (action === "complete") {
      const { fileId } = await request.json();
      if (!fileId) {
        return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
      }

      // Mock mode bypass for completion
      if (!clientId || !clientSecret || !refreshToken) {
        return NextResponse.json({ success: true });
      }

      const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "reader",
            type: "anyone",
          }),
        }
      );
      return NextResponse.json({ success: true });
    }

    // 2. Chunk Upload Action
    if (action === "chunk") {
      const uploadUrl = request.headers.get("x-upload-url");
      const contentRange = request.headers.get("x-content-range");
      const contentType = request.headers.get("content-type") || "application/octet-stream";

      if (!uploadUrl || !contentRange) {
        return NextResponse.json({ error: "Missing x-upload-url or x-content-range headers" }, { status: 400 });
      }

      // Read binary chunk from request body
      const chunkBuffer = Buffer.from(await request.arrayBuffer());

      const googleResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Range": contentRange,
          "Content-Type": contentType,
        },
        body: chunkBuffer,
      });

      // Google returns 308 Resume Incomplete for successful intermediate chunk uploads
      if (googleResponse.status !== 308 && !googleResponse.ok) {
        const errText = await googleResponse.text();
        throw new Error(`Google Drive chunk upload failed with status ${googleResponse.status}: ${errText}`);
      }

      if (googleResponse.status === 200 || googleResponse.status === 201) {
        const data = await googleResponse.json();
        return NextResponse.json({ completed: true, data });
      }

      return NextResponse.json({ completed: false });
    }

    // 3. Initiation Action: Create Session URL
    const { name, mimeType, size } = await request.json();
    if (!name || size === undefined) {
      return NextResponse.json({ error: "Missing name or size in request body" }, { status: 400 });
    }

    // Developer Mock Mode Fallback if config is missing
    if (!clientId || !clientSecret || !refreshToken) {
      console.warn("Missing Google Refresh Token configuration. Running in API Mock Mode.");
      return NextResponse.json({
        uploadUrl: "mock",
        mock: true,
        name,
        mimeType
      });
    }

    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    // Request resumable upload session from Google Drive
    const metadata: Record<string, unknown> = {
      name,
      mimeType: mimeType || "application/octet-stream",
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const initResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,mimeType",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Upload-Content-Type": mimeType || "application/octet-stream",
          "X-Upload-Content-Length": size.toString(),
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initResponse.ok) {
      const errText = await initResponse.text();
      throw new Error(`Google Drive session initiation failed: ${errText}`);
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("Google Drive did not return a Location header for upload session");
    }

    return NextResponse.json({ uploadUrl });
  } catch (error: unknown) {
    console.error("API Upload error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
