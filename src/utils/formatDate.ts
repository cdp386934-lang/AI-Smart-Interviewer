export function formatDate(iso: string | number | Date): string {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}
