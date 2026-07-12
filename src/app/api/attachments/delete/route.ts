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

export async function DELETE(request: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "No fileId provided" }, { status: 400 });
    }

    // If configuration is missing, mock delete
    if (!clientId || !clientSecret || !refreshToken) {
      console.warn("Missing Google Refresh Token configuration. Mocking delete.");
      return NextResponse.json({ success: true, message: "Mock delete success" });
    }

    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    const deleteResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!deleteResponse.ok) {
      const errText = await deleteResponse.text();
      // Báo cảnh báo nhưng không ném lỗi ngắt luồng xóa database nếu file không tồn tại trên Drive nữa
      console.warn(`Failed to delete file from Google Drive (fileId: ${fileId}): ${errText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("API Delete error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
