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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    if (!fileId) {
      return new Response("No fileId provided", { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    // Fallback Mock Mode if configuration is missing
    if (!clientId || !clientSecret || !refreshToken) {
      console.warn("Missing Google configuration. Mocking proxy image.");
      const transparentPixel = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      return new Response(transparentPixel, {
        headers: { "Content-Type": "image/gif" }
      });
    }

    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(`Failed to fetch file from Google Drive: ${errText}`, { status: response.status });
    }

    const mimeType = response.headers.get("Content-Type") || "application/octet-stream";
    const fileBuffer = await response.arrayBuffer();

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    console.error("API Proxy error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
