/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";

interface FilePickedData {
  name: string;
  url: string;
  fileId: string;
  mimeType: string;
}

export function useGooglePicker(onFilePicked: (file: FilePickedData) => void) {
  const [tokenClient, setTokenClient] = useState<any>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

  const isConfigured = !!(clientId && apiKey && appId);

  const openPicker = useCallback((accessToken: string) => {
    const g = window as any;
    if (!g.google || !g.google.picker) return;

    const view = new g.google.picker.DocsView(g.google.picker.ViewId.DOCS);
    view.setMimeTypes("image/*,application/pdf,application/vnd.google-apps.document,application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    const picker = new g.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setCallback((data: any) => {
        if (data.action === g.google.picker.Action.PICKED) {
          const doc = data.docs[0];
          const fileId = doc[g.google.picker.Document.ID];
          const name = doc[g.google.picker.Document.NAME];
          const url = doc[g.google.picker.Document.URL];
          const mimeType = doc[g.google.picker.Document.MIME_TYPE];
          onFilePicked({ name, url, fileId, mimeType });
        }
      })
      .build();
    picker.setVisible(true);
  }, [apiKey, appId, onFilePicked]);

  useEffect(() => {
    if (!isConfigured) return;

    // Load api.js
    const gapiScript = document.createElement("script");
    gapiScript.src = "https://apis.google.com/js/api.js";
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      const g = window as any;
      if (g.gapi) {
        g.gapi.load("picker", () => {});
      }
    };
    document.body.appendChild(gapiScript);

    // Load gsi/client
    const gisScript = document.createElement("script");
    gisScript.src = "https://accounts.google.com/gsi/client";
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      const g = window as any;
      if (g.google && g.google.accounts && g.google.accounts.oauth2) {
        const client = g.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/drive.readonly",
          callback: (response: any) => {
            if (response.error !== undefined) {
              console.error("Auth error:", response);
              return;
            }
            openPicker(response.access_token);
          },
        });
        setTokenClient(client);
      }
    };
    document.body.appendChild(gisScript);

    return () => {
      if (document.body.contains(gapiScript)) document.body.removeChild(gapiScript);
      if (document.body.contains(gisScript)) document.body.removeChild(gisScript);
    };
  }, [clientId, isConfigured, openPicker]);

  const handlePick = useCallback(() => {
    if (!isConfigured) return false;
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: "consent" });
      return true;
    }
    return false;
  }, [tokenClient, isConfigured]);

  return { isConfigured, handlePick };
}
