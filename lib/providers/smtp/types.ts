/**
 * Per-destination SMTP (encrypted in DB), unrelated to `SMTP_*` in `.env`
 * (used only for app account email).
 */
export type SmtpMailStoredSecret = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string;
};
