export const CONNECTION_REPORT_CHANNEL = "connectionReport";

export type ConnectionReport = {
  closeCode: number;
  offlineMs: number;
  attempts: number;
  hiddenAtDrop: boolean;
  onlineAtDrop: boolean;
};
