const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertSmtpEmailField(label: string, raw: string): void {
  const t = raw.trim();
  if (!t) {
    throw new Error(`${label} is required.`);
  }
  if (!EMAIL_LIKE.test(t)) {
    throw new Error(`Enter a valid email for ${label.toLowerCase()}.`);
  }
}

export function assertSmtpHost(raw: string): void {
  const t = raw.trim();
  if (!t) {
    throw new Error("SMTP host is required.");
  }
}

export function assertSmtpPort(port: number): void {
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error("SMTP port must be between 1 and 65535.");
  }
}
