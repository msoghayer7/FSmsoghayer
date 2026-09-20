import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import type { JournalEntry, JournalEntryStatus } from '../../api/types';
import { formatCurrency } from '../../utils/format';
import { StatusBadge } from '../../components/StatusBadge';

const STATUS_LABELS: Record<string, string> = { DRAFT: 'مسودة', POSTED: 'مرحّل' };
const TABS: { value: JournalEntryStatus | ''; label: string }[] = [
  { value: '', label: 'الكل' },
  { value: 'DRAFT', label: 'مسودات بانتظار الاعتماد' },
  { value: 'POSTED', label: 'مرحّلة' },
];

interface ImportResult {
  createdCount: number;
  created: { referenceGroup: string; entryId: string; entryNumber: string }[];
  errors: { referenceGroup: string; message: string }[];
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [tab, setTab] = useState<JournalEntryStatus | ''>('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    apiClient.get<JournalEntry[]>('/journal-entries', { params: tab ? { status: tab } : {} }).then((r) => setEntries(r.data));
  };

  useEffect(load, [tab]);

  const downloadTemplate = async () => {
    const response = await apiClient.get('/journal-entries/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'قالب-استيراد-القيود.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportResult(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<ImportResult>('/journal-entries/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(data);
      load();
    } catch (err) {
      setImportError(apiErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>القيود اليومية</h1>
      </div>

      <div className="card">
        <h2>استيراد قيود من Excel</h2>
        <p className="muted small">
          الأسطر التي تشترك في نفس "رقم المرجع" تُجمع في قيد واحد. يجب أن يكون كل قيد متوازنًا (مجموع المدين = مجموع الدائن). تُنشأ
          القيود المستوردة كمسودات بانتظار الاعتماد.
        </p>
        <div className="actions-row" style={{ borderTop: 'none', paddingTop: 0 }}>
          <button className="btn btn-secondary" onClick={downloadTemplate}>
            تنزيل نموذج الاستيراد
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileChange} disabled={uploading} />
        </div>
        {importError && <div className="alert alert-error">{importError}</div>}
        {importResult && (
          <div className={importResult.errors.length ? 'alert alert-error' : 'alert alert-info'}>
            تم إنشاء {importResult.createdCount} قيد كمسودة.
            {importResult.errors.length > 0 && (
              <ul style={{ margin: '0.5rem 0 0', paddingInlineStart: '1.2rem' }}>
                {importResult.errors.map((e) => (
                  <li key={e.referenceGroup}>
                    {e.referenceGroup}: {e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="actions-row" style={{ borderTop: 'none', paddingTop: 0, marginBottom: '1rem' }}>
          {TABS.map((t) => (
            <button
              key={t.value}
              className={tab === t.value ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small'}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>رقم القيد</th>
              <th>التاريخ</th>
              <th>البيان</th>
              <th>الإجمالي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link to={`/journal-entries/${e.id}`}>{e.entryNumber}</Link>
                </td>
                <td>{e.entryDate}</td>
                <td>{e.description}</td>
                <td>{formatCurrency(e.lines.reduce((s, l) => s + Number(l.debit), 0))}</td>
                <td>
                  <StatusBadge label={STATUS_LABELS[e.status] ?? e.status} status={e.status} />
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  لا توجد قيود
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
