import type { Response } from 'express';

const CONTENT_TYPES = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
} as const;

export function sendReportFile(res: Response, buffer: Buffer, format: 'xlsx' | 'pdf', baseName: string): void {
  res.setHeader('Content-Type', CONTENT_TYPES[format]);
  res.setHeader('Content-Disposition', `attachment; filename="${baseName}.${format}"`);
  res.send(buffer);
}
