/**
 * 테이블 데이터를 CSV/Excel 형식으로 내보내기
 */

export interface ExportColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  label: string;
  format?: (value: unknown, row: T) => string;
}

/**
 * CSV 문자열 생성
 */
function generateCSV<T>(data: T[], columns: ExportColumn<T>[]): string {
  // BOM 추가 (한글 깨짐 방지)
  const BOM = '\uFEFF';

  // 헤더 행
  const headers = columns.map((col) => col.label).join(',');

  // 데이터 행
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const rowData = row as Record<string, unknown>;
        const value = col.format
          ? col.format(rowData[col.key as string], row)
          : rowData[col.key as string];

        // CSV 이스케이프 처리
        const stringValue = String(value ?? '');
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',');
  });

  return BOM + [headers, ...rows].join('\n');
}

/**
 * CSV 파일로 다운로드
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string = 'export'
): void {
  const csv = generateCSV(data, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Excel 호환 CSV 파일로 다운로드 (탭 구분)
 */
export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string = 'export'
): void {
  // BOM 추가 (한글 깨짐 방지)
  const BOM = '\uFEFF';

  // 헤더 행 (탭 구분)
  const headers = columns.map((col) => col.label).join('\t');

  // 데이터 행 (탭 구분)
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const rowData = row as Record<string, unknown>;
        const value = col.format
          ? col.format(rowData[col.key as string], row)
          : rowData[col.key as string];

        // Excel용 이스케이프 처리
        const stringValue = String(value ?? '');
        if (stringValue.includes('\t') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join('\t');
  });

  const content = BOM + [headers, ...rows].join('\n');
  const blob = new Blob([content], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  downloadBlob(blob, `${filename}.xls`);
}

/**
 * JSON 파일로 다운로드
 */
export function exportToJSON<T>(
  data: T[],
  filename: string = 'export'
): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Blob 다운로드 헬퍼
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 날짜 포맷 헬퍼
 */
export function formatDateForExport(date: string | Date | null): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 날짜시간 포맷 헬퍼
 */
export function formatDateTimeForExport(date: string | Date | null): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
