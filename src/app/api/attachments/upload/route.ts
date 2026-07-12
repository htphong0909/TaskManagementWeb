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

    // Developer Mock Mode Fallback if config is missing
    if (!clientId || !clientSecret || !refreshToken) {
      console.warn("Missing Google Refresh Token configuration. Running in API Mock Mode.", {
        clientIdMissing: !clientId,
        clientSecretMissing: !clientSecret,
        refreshTokenMissing: !refreshToken
      });
      const formData = await request.formData();
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      await new Promise(resolve => setTimeout(resolve, 800));
      return NextResponse.json({
        name: file.name,
        url: "https://drive.google.com/file/d/mock-server-" + Date.now(),
        fileId: "mock-server-" + Date.now(),
        mimeType: file.type || "application/octet-stream"
      });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    // Google Drive multipart upload
    const metadata: Record<string, unknown> = {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const boundary = "boundary_string_pastel";
    const headerPart = 
      `\r\n--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`;

    const footerPart = `\r\n--${boundary}--`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(headerPart, "utf8"),
      fileBuffer,
      Buffer.from(footerPart, "utf8")
    ]);

    const uploadResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: bodyBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      throw new Error(`Failed to upload to Google Drive: ${errText}`);
    }

    const data = await uploadResponse.json();

    // Set permission to anyone with link can read
    try {
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${data.id}/permissions`,
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
    } catch (e) {
      console.warn("Failed to set file permission:", e);
    }

    return NextResponse.json({
      name: data.name,
      url: data.webViewLink,
      fileId: data.id,
      mimeType: data.mimeType,
    });
  } catch (error: unknown) {
    console.error("API Upload error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
