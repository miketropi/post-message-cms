/** Slack: Incoming Webhook URL (https://hooks.slack.com/services/...) */
export const PROVIDER_SLACK_INCOMING_WEBHOOK = "slack_incoming_webhook";

/** Microsoft Teams: Incoming Webhook or Power Platform workflow URL */
export const PROVIDER_TEAMS_INCOMING_WEBHOOK = "teams_incoming_webhook";

/** Google Chat: space incoming webhook URL (chat.googleapis.com) */
export const PROVIDER_GOOGLE_CHAT_INCOMING_WEBHOOK =
  "google_chat_incoming_webhook";

/** Discord: bot token + channel ID (REST channel messages) */
export const PROVIDER_DISCORD_BOT = "discord_bot";

/** Telegram: bot token + chat_id (Bot API sendMessage) */
export const PROVIDER_TELEGRAM_BOT = "telegram_bot";

/** SMTP: recipient address; server uses app env (SMTP_HOST, SMTP_FROM, …) */
export const PROVIDER_SMTP_MAIL = "smtp_mail";
