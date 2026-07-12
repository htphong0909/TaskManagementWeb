import { NextResponse } from "next/server";
import crypto from "crypto";

function generateJWT(email: string, privateKey: string): string {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const base64Claim = Buffer.from(JSON.stringify(claim)).toString("base64url");
  const signatureInput = `${base64Header}.${base64Claim}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, "base64url");

  return `${signatureInput}.${signature}`;
}

async function getAccessToken(email: string, privateKey: string): Promise<string> {
  const jwt = generateJWT(email, privateKey);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to get OAuth token: ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let saPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Developer Mock Mode Fallback if config is missing
    if (!saEmail || !saPrivateKey || !folderId) {
      console.warn("Missing Google Service Account configuration. Running in API Mock Mode.");
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

    if (saPrivateKey.includes("\\n")) {
      saPrivateKey = saPrivateKey.replace(/\\n/g, "\n");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const accessToken = await getAccessToken(saEmail, saPrivateKey);

    // Google Drive multipart upload
    const metadata = {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      parents: [folderId],
    };

    const uploadForm = new FormData();
    uploadForm.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    uploadForm.append("file", file);

    const uploadResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: uploadForm,
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
  } catch (error: any) {
    console.error("API Upload error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
