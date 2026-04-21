const SLACK_INCOMING_WEBHOOK_PREFIX = "https://hooks.slack.com/services/";

export function assertSlackIncomingWebhookUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error("Invalid webhook URL.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Slack webhook URL must use https.");
  }
  if (!parsed.href.startsWith(SLACK_INCOMING_WEBHOOK_PREFIX)) {
    throw new Error(
      "Use a Slack Incoming Webhook URL (starts with https://hooks.slack.com/services/).",
    );
  }
}

export function slackWebhookPublicMeta(url: string): string {
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return "slack";
  }
}
