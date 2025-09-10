export interface ErrorInfo {
  type: string;
  message: string;
  source: string;
  lineno: number;
  colno: number;
  stack: string;
  userAgent: string;
  url: string;
}
