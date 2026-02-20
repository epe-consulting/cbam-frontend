const BLOB_CONTAINER_URL = import.meta.env.VITE_BLOB_CONTAINER_URL || '';
const BLOB_SAS_TOKEN = import.meta.env.VITE_BLOB_SAS_TOKEN || '';

export interface BlobUploadResult {
  success: boolean;
  blobUrl: string;
  error?: string;
}

export interface BlobReportItem {
  name: string;
  url: string;
  lastModified: string;
  contentLength: number;
}

export interface BlobListResult {
  success: boolean;
  reports: BlobReportItem[];
  error?: string;
}

export async function uploadReportToBlob(
  companyId: number,
  fileName: string,
  htmlContent: string,
): Promise<BlobUploadResult> {
  const blobPath = `${companyId}/${fileName}`;
  const url = `${BLOB_CONTAINER_URL}/${blobPath}?${BLOB_SAS_TOKEN}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: htmlContent,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        blobUrl: '',
        error: `Upload failed (${response.status}): ${errorText}`,
      };
    }

    return { success: true, blobUrl: `${BLOB_CONTAINER_URL}/${blobPath}` };
  } catch (err) {
    return {
      success: false,
      blobUrl: '',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function listCompanyReports(companyId: number): Promise<BlobListResult> {
  const url = `${BLOB_CONTAINER_URL}?restype=container&comp=list&prefix=${companyId}/&${BLOB_SAS_TOKEN}`;

  try {
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, reports: [], error: `List failed (${response.status}): ${errorText}` };
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const blobs = doc.querySelectorAll('Blob');
    const reports: BlobReportItem[] = [];

    blobs.forEach((blob) => {
      const name = blob.querySelector('Name')?.textContent ?? '';
      const lastModified = blob.querySelector('Properties > Last-Modified')?.textContent ?? '';
      const contentLength = parseInt(blob.querySelector('Properties > Content-Length')?.textContent ?? '0', 10);
      reports.push({
        name,
        url: `${BLOB_CONTAINER_URL}/${name}`,
        lastModified,
        contentLength,
      });
    });

    reports.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    return { success: true, reports };
  } catch (err) {
    return {
      success: false,
      reports: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
