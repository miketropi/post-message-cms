/**
 * Microsoft Teams and Power Platform workflow URLs use several host patterns
 * (classic Incoming Webhook, Workflows, Logic Apps, etc.).
 */
function isLikelyMicrosoftWebhookHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "outlook.office.com" || h === "outlook.office365.com") {
    return true;
  }
  if (h.endsWith(".webhook.office.com")) {
    return true;
  }
  if (h.includes("logic.azure.com") || h.includes("azure-apim.net")) {
    return true;
  }
  if (h.includes("powerplatform.com") || h.includes("powerautomate.com")) {
    return true;
  }
  if (h.startsWith("outlook") && h.includes("office.com")) {
    return true;
  }
  if (h.includes("webhook") && h.includes("office")) {
    return true;
  }
  return false;
}

export function assertTeamsIncomingWebhookUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error("Invalid webhook URL.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Teams webhook URL must use https.");
  }
  if (!isLikelyMicrosoftWebhookHost(parsed.hostname)) {
    throw new Error(
      "Use a Microsoft Teams or Power Automate incoming webhook URL (e.g. outlook.office.com, a …webhook.office.com host, or a Power Platform / Logic Apps URL).",
    );
  }
}

export function teamsWebhookPublicMeta(url: string): string {
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return "teams";
  }
}
