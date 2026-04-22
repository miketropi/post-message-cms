import "server-only";

import {
  assertDiscordBotDestination,
  discordDestinationPublicMeta,
  normalizeDiscordBotToken,
} from "@/lib/providers/discord/validate";
import { discordSecretToJson, parseDiscordSecretJson } from "@/lib/providers/discord/secret";
import {
  assertTelegramBotDestination,
  telegramDestinationPublicMeta,
} from "@/lib/providers/telegram/validate";
import { telegramSecretToJson, parseTelegramSecretJson } from "@/lib/providers/telegram/secret";
import {
  parseSmtpMailSecretJson,
  smtpMailPublicMeta,
  smtpMailSecretToJson,
} from "@/lib/providers/smtp/secret";
import {
  assertSmtpEmailField,
  assertSmtpHost,
  assertSmtpPort,
} from "@/lib/providers/smtp/validate";
import {
  PROVIDER_DISCORD_BOT,
  PROVIDER_GOOGLE_CHAT_INCOMING_WEBHOOK,
  PROVIDER_SLACK_INCOMING_WEBHOOK,
  PROVIDER_SMTP_MAIL,
  PROVIDER_TEAMS_INCOMING_WEBHOOK,
  PROVIDER_TELEGRAM_BOT,
} from "@/lib/providers/types";
import {
  assertSlackIncomingWebhookUrl,
  slackWebhookPublicMeta,
} from "@/lib/providers/slack/validate";
import {
  assertGoogleChatIncomingWebhookUrl,
  googleChatWebhookPublicMeta,
} from "@/lib/providers/google-chat/validate";
import {
  assertTeamsIncomingWebhookUrl,
  teamsWebhookPublicMeta,
} from "@/lib/providers/teams/validate";
import { normalizeBranchKeyInput } from "@/lib/messages/routing";
import { encryptString } from "@/lib/secrets";

export type AdminDestinationRequestBody = {
  workspaceId?: string;
  label?: string;
  provider?: string;
  webhookUrl?: string;
  botToken?: string;
  channelId?: string;
  chatId?: string;
  toEmail?: string;
  smtpHost?: string;
  smtpPort?: number | string;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  branchKey?: string;
  enabled?: boolean;
};

type BuildContext = {
  /** Provider to build (POST: from body; PATCH: existing row) */
  provider: string;
  /**
   * When editing, the decrypted `secretEncrypted` to merge with partial
   * form fields (e.g. empty password or unchanged Slack URL).
   */
  previousDecrypted: string | null;
};

type BuildOk = {
  ok: true;
  secretEncrypted: string;
  publicMeta: string;
  provider: string;
};

type BuildErr = { ok: false; error: string; status: number };

/**
 * Build encrypted secret + publicMeta from the same JSON the admin create/edit
 * form sends. Used by POST and PATCH.
 */
export function buildDestinationFromBody(
  body: AdminDestinationRequestBody,
  ctx: BuildContext,
): BuildOk | BuildErr {
  const { provider, previousDecrypted: prev } = ctx;

  if (provider === PROVIDER_SLACK_INCOMING_WEBHOOK) {
    const fromBody = body.webhookUrl?.trim() ?? "";
    const webhookUrl =
      fromBody ||
      (prev && !fromBody && !prev.trim().startsWith("{")
        ? prev.trim()
        : "");
    if (!webhookUrl) {
      return { ok: false, error: "webhookUrl is required for Slack.", status: 400 };
    }
    try {
      assertSlackIncomingWebhookUrl(webhookUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid webhook URL.";
      return { ok: false, error: msg, status: 400 };
    }
    return {
      ok: true,
      secretEncrypted: encryptString(webhookUrl),
      publicMeta: slackWebhookPublicMeta(webhookUrl),
      provider: PROVIDER_SLACK_INCOMING_WEBHOOK,
    };
  }

  if (provider === PROVIDER_TEAMS_INCOMING_WEBHOOK) {
    const fromBody = body.webhookUrl?.trim() ?? "";
    const webhookUrl =
      fromBody ||
      (prev && !fromBody && !prev.trim().startsWith("{")
        ? prev.trim()
        : "");
    if (!webhookUrl) {
      return {
        ok: false,
        error: "webhookUrl is required for Microsoft Teams.",
        status: 400,
      };
    }
    try {
      assertTeamsIncomingWebhookUrl(webhookUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid webhook URL.";
      return { ok: false, error: msg, status: 400 };
    }
    return {
      ok: true,
      secretEncrypted: encryptString(webhookUrl),
      publicMeta: teamsWebhookPublicMeta(webhookUrl),
      provider: PROVIDER_TEAMS_INCOMING_WEBHOOK,
    };
  }

  if (provider === PROVIDER_GOOGLE_CHAT_INCOMING_WEBHOOK) {
    const fromBody = body.webhookUrl?.trim() ?? "";
    const webhookUrl =
      fromBody ||
      (prev && !fromBody && !prev.trim().startsWith("{")
        ? prev.trim()
        : "");
    if (!webhookUrl) {
      return {
        ok: false,
        error: "webhookUrl is required for Google Chat.",
        status: 400,
      };
    }
    try {
      assertGoogleChatIncomingWebhookUrl(webhookUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid webhook URL.";
      return { ok: false, error: msg, status: 400 };
    }
    return {
      ok: true,
      secretEncrypted: encryptString(webhookUrl),
      publicMeta: googleChatWebhookPublicMeta(webhookUrl),
      provider: PROVIDER_GOOGLE_CHAT_INCOMING_WEBHOOK,
    };
  }

  if (provider === PROVIDER_DISCORD_BOT) {
    let botToken = body.botToken?.trim() ?? "";
    let channelId = body.channelId?.trim() ?? "";
    if (prev) {
      try {
        const old = parseDiscordSecretJson(prev);
        if (!botToken) {
          botToken = old.botToken;
        }
        if (!channelId) {
          channelId = old.channelId;
        }
      } catch {
        /* */
      }
    }
    if (!botToken || !channelId) {
      return {
        ok: false,
        error: "botToken and channelId are required for Discord.",
        status: 400,
      };
    }
    try {
      assertDiscordBotDestination(botToken, channelId);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Invalid Discord credentials.";
      return { ok: false, error: m, status: 400 };
    }
    return {
      ok: true,
      secretEncrypted: encryptString(
        discordSecretToJson({
          botToken: normalizeDiscordBotToken(botToken),
          channelId,
        }),
      ),
      publicMeta: discordDestinationPublicMeta(channelId),
      provider: PROVIDER_DISCORD_BOT,
    };
  }

  if (provider === PROVIDER_TELEGRAM_BOT) {
    let botToken = body.botToken?.trim() ?? "";
    let chatId = body.chatId?.trim() ?? "";
    if (prev) {
      try {
        const old = parseTelegramSecretJson(prev);
        if (!botToken) {
          botToken = old.botToken;
        }
        if (!chatId) {
          chatId = old.chatId;
        }
      } catch {
        /* */
      }
    }
    if (!botToken || !chatId) {
      return {
        ok: false,
        error: "botToken and chatId are required for Telegram.",
        status: 400,
      };
    }
    try {
      assertTelegramBotDestination(botToken, chatId);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Invalid Telegram credentials.";
      return { ok: false, error: m, status: 400 };
    }
    return {
      ok: true,
      secretEncrypted: encryptString(
        telegramSecretToJson({ botToken, chatId }),
      ),
      publicMeta: telegramDestinationPublicMeta(chatId),
      provider: PROVIDER_TELEGRAM_BOT,
    };
  }

  if (provider === PROVIDER_SMTP_MAIL) {
    const portRaw = body.smtpPort;
    const portNumeric =
      typeof portRaw === "number"
        ? portRaw
        : parseInt(String(portRaw ?? ""), 10);
    const portInputEmpty =
      portRaw === undefined ||
      portRaw === null ||
      (typeof portRaw === "string" && portRaw.trim() === "");
    const portFromInput = Number.isFinite(portNumeric) ? portNumeric : NaN;
    let host = body.smtpHost?.trim() ?? "";
    let from = body.smtpFrom?.trim() ?? "";
    let toEmail = body.toEmail?.trim() ?? "";
    let smtpUser = body.smtpUser?.trim() || undefined;
    let smtpPass = body.smtpPass?.trim() || undefined;
    let old: ReturnType<typeof parseSmtpMailSecretJson> | null = null;
    if (prev) {
      try {
        old = parseSmtpMailSecretJson(prev);
      } catch {
        old = null;
      }
    }
    let port = portInputEmpty
      ? (old?.port ?? 587)
      : (Number.isFinite(portFromInput) ? portFromInput : 587);
    let secure: boolean;
    if (body.smtpSecure === undefined) {
      secure = old?.secure ?? (port === 465);
    } else if (typeof body.smtpSecure === "boolean") {
      secure = body.smtpSecure;
    } else {
      secure = body.smtpSecure === "true" || port === 465;
    }
    if (old) {
      if (!host) {
        host = old.host;
      }
      if (!from) {
        from = old.from;
      }
      if (!toEmail) {
        toEmail = old.to;
      }
      if (!smtpUser && old.user) {
        smtpUser = old.user;
      }
      if (smtpPass === undefined || smtpPass === "") {
        smtpPass = old.pass;
      }
    }
    if (!toEmail) {
      return {
        ok: false,
        error: "toEmail (recipient) is required for SMTP mail.",
        status: 400,
      };
    }
    try {
      assertSmtpHost(host);
      assertSmtpPort(port);
      assertSmtpEmailField("From", from);
      assertSmtpEmailField("To (recipient)", toEmail);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Invalid SMTP fields.";
      return { ok: false, error: m, status: 400 };
    }
    const secret = {
      host,
      port,
      secure,
      user: smtpUser,
      pass: smtpPass,
      from,
      to: toEmail,
    };
    return {
      ok: true,
      secretEncrypted: encryptString(smtpMailSecretToJson(secret)),
      publicMeta: smtpMailPublicMeta(secret),
      provider: PROVIDER_SMTP_MAIL,
    };
  }

  return {
    ok: false,
    error: `Unknown provider "${provider}".`,
    status: 400,
  };
}

export function parseBranchKeyInput(body: AdminDestinationRequestBody) {
  return normalizeBranchKeyInput(body.branchKey);
}

/**
 * For GET: expose decrypted values to the admin form (admin session only).
 */
export function getDestinationCredentialsForForm(
  provider: string,
  decrypted: string,
):
  | { slack: { webhookUrl: string } }
  | { teams: { webhookUrl: string } }
  | { googleChat: { webhookUrl: string } }
  | { discord: { botToken: string; channelId: string } }
  | { telegram: { botToken: string; chatId: string } }
  | {
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        user?: string;
        from: string;
        to: string;
        hasPassword: boolean;
      };
    }
  | null {
  try {
    switch (provider) {
      case PROVIDER_SLACK_INCOMING_WEBHOOK: {
        return { slack: { webhookUrl: decrypted.trim() } };
      }
      case PROVIDER_TEAMS_INCOMING_WEBHOOK: {
        return { teams: { webhookUrl: decrypted.trim() } };
      }
      case PROVIDER_GOOGLE_CHAT_INCOMING_WEBHOOK: {
        return { googleChat: { webhookUrl: decrypted.trim() } };
      }
      case PROVIDER_DISCORD_BOT: {
        const c = parseDiscordSecretJson(decrypted);
        return { discord: { botToken: c.botToken, channelId: c.channelId } };
      }
      case PROVIDER_TELEGRAM_BOT: {
        const c = parseTelegramSecretJson(decrypted);
        return { telegram: { botToken: c.botToken, chatId: c.chatId } };
      }
      case PROVIDER_SMTP_MAIL: {
        const s = parseSmtpMailSecretJson(decrypted);
        return {
          smtp: {
            host: s.host,
            port: s.port,
            secure: s.secure,
            user: s.user,
            from: s.from,
            to: s.to,
            hasPassword: Boolean(s.pass),
          },
        };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
