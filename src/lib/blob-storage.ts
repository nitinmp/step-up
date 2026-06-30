import { del, put } from "@vercel/blob";

import { appConfig } from "@/config";

const BLOB_ACCESS = "private" as const;

export function photoProxyUrl(blobUrl: string): string {
  return `/api/blob?url=${encodeURIComponent(blobUrl)}`;
}

export async function deleteBlobUrl(url: string | null | undefined) {
  if (!url || !appConfig.blobReadWriteToken) {
    return;
  }

  try {
    await del(url, { token: appConfig.blobReadWriteToken });
  } catch (error) {
    console.error("Failed to delete blob", url, error);
  }
}

export async function uploadBlob(
  pathname: string,
  body: File | Blob | ArrayBuffer | Buffer,
  contentType: string,
) {
  return put(pathname, body, {
    access: BLOB_ACCESS,
    token: appConfig.blobReadWriteToken,
    contentType,
  });
}
