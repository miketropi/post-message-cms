/**
 * Google Chat incoming webhooks use the Chat API on chat.googleapis.com.
 * @see https://developers.google.com/chat/how-tos/webhooks
 */
export function assertGoogleChatIncomingWebhookUrl(url: string): void {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    throw new Error("Invalid webhook URL.");
  }
  if (u.protocol !== "https:") {
    throw new Error("Google Chat webhook URL must use https.");
  }
  if (u.hostname.toLowerCase() !== "chat.googleapis.com") {
    throw new Error(
      "Use a Google Chat incoming webhook URL (host must be chat.googleapis.com).",
    );
  }
  const p = u.pathname;
  if (!p.includes("/spaces/") || !p.includes("/messages")) {
    throw new Error(
      "The URL path should look like /v1/spaces/.../messages (from the Google Chat space webhook).",
    );
  }
}

export function googleChatWebhookPublicMeta(url: string): string {
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return "google_chat";
  }
}
