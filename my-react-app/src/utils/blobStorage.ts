import { API_BASE_URL, apiRequest } from './api';

export interface BlobUploadResult {
  success: boolean;
  blobUrl: string;
  error?: string;
}

export interface BlobReportItem {
  name: string;
  fileName?: string;
  url: string;
  lastModified: string;
  contentLength: number;
}

export interface BlobListResult {
  success: boolean;
  reports: BlobReportItem[];
  error?: string;
}

/**
 * Upload HTML report via backend (Railway Volume / local disk).
 * Replaces direct Azure Blob uploads.
 */
export async function uploadReportToBlob(
  companyId: number,
  fileName: string,
  htmlContent: string,
): Promise<BlobUploadResult> {
  const result = await apiRequest<{
    success: boolean;
    message?: string;
    report?: { url?: string; name?: string };
  }>('/reports/upload', {
    method: 'POST',
    body: JSON.stringify({ companyId, fileName, htmlContent }),
  });

  if (!result) {
    return { success: false, blobUrl: '', error: 'Session expired. Please log in again.' };
  }

  if (!result.data.success) {
    return {
      success: false,
      blobUrl: '',
      error: result.data.message || `Upload failed (${result.response.status})`,
    };
  }

  const path = result.data.report?.url || '';
  return { success: true, blobUrl: path ? `${API_BASE_URL}${path}` : '' };
}

export async function listCompanyReports(companyId: number): Promise<BlobListResult> {
  const result = await apiRequest<{
    success: boolean;
    message?: string;
    reports?: BlobReportItem[];
  }>(`/reports/company/${companyId}`);

  if (!result) {
    return { success: false, reports: [], error: 'Session expired. Please log in again.' };
  }

  if (!result.data.success) {
    return {
      success: false,
      reports: [],
      error: result.data.message || 'Failed to list reports',
    };
  }

  const reports = (result.data.reports || []).map((r) => ({
    ...r,
    url: r.url?.startsWith('http') ? r.url : `${API_BASE_URL}${r.url}`,
  }));

  return { success: true, reports };
}

/** Fetch report HTML with JWT and open/download via blob URL. */
export async function openReportAuthenticated(report: BlobReportItem): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const url = report.url.startsWith('http')
    ? report.url
    : `${API_BASE_URL}${report.url}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    throw new Error('Session expired');
  }

  if (!response.ok) {
    throw new Error(`Failed to open report (${response.status})`);
  }

  const html = await response.text();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export async function downloadReportAuthenticated(report: BlobReportItem): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const url = report.url.startsWith('http')
    ? report.url
    : `${API_BASE_URL}${report.url}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to download report (${response.status})`);
  }

  const html = await response.text();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = report.fileName || report.name.split('/').pop() || 'report.html';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
