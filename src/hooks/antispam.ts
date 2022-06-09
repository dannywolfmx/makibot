import { Message } from "discord.js";
import getUrls from "get-urls";

import Member from "../lib/member";
import { Hook } from "../lib/hook";
import { createToast } from "../lib/response";
import { ModEvent } from "../lib/modlog/types";
import { modEventBuilder } from "../lib/modlog/actions";

const ruleset: { [reason: string]: RegExp[] } = {
  "El enlace contiene una invitación de Discord": [
    /discord\.gg\/\w+/,
    /discordapp\.com\/invite\/\w+/,
    /discord\.com\/invite\/\w+/,
    /dsc\.gg\/w+/,
  ],
  "El enlace apunta a una página de perfil de red social": [
    /instagram\.com\/[\w._]+\/?(\?.+)?$/, // intentionally allow instagram.com/p/ for the moment
    /facebook\.com\/groups\/[\w._]+/, // intentionally also capture permalinks for posts in the group
    /facebook\.com\/pages\/[\w._]+\/\d+/,
    /twitter\.com\/\w+\/?(\?.+)?$/, // intentionally allow status because sharing tweets is common
    /https:\/\/(www\.)?twitch.tv\/[a-zA-Z0-9_-]+\/?(videos)?\s/, // Twitch pages,
    /steamcommunity\.com\/id\/\w+/, // Steam profile pages by vanity URL.
    /steamcommunity\.com\/profiles\/\w+/, // Steam profile pages by ID.
  ],
  "El enlace apunta a una tienda de aplicaciones": [/play\.google.com\/store\/apps\/details/],
  "El enlace apunta a un Google Doc": [
    /docs\.google\.com\/document\/d\//, // Google Docs
    /docs\.google\.com\/spreadsheets\/d\//, // Google Docs
    /docs\.google\.com\/presentations\/d\//, // Google Docs
    /docs\.google\.com\/forms\/d\//, // Google Forms
    /forms.gle\/\w+/, // Google Forms shortlink
  ],
};

const disabledLinksReason = "Al perfil se le quitó el permiso para enviar enlaces al servidor";

export function matchesUrlInRuleset(message: string): string | undefined {
  return Object.keys(ruleset).find((rule) => {
    const regexps = ruleset[rule];
    return regexps.some((regexp) => regexp.test(message));
  });
}

function messageContainsURL(message: string): boolean {
  return getUrls(message).size > 0;
}

/**
 * Attempts to preprocess a message in order to detect funky changes designed
 * to bypass antispam systems. Note that you cannot be too strict. For instance,
 * previously this function would strip all spaces, but this would cause
 * sentences such as "Hola. Estoy aquí" to be caught, since they yield
 * "hola.estoyaqui" and "hola.es" gets detected as a link.
 *
 * @param message the raw message received
 */
function normalizeMessageContent(message: Message): string {
  return message.content.toLowerCase();
}

function testModeration(message: Message): string | undefined {
  const member = new Member(message.member);
  const text = normalizeMessageContent(message);

  if (!member.canPostLinks && messageContainsURL(text)) {
    /* The member cannot post links. */
    return disabledLinksReason;
  } else {
    /* The message may or may not contain a link to an invalid site. */
    return matchesUrlInRuleset(text);
  }
}

async function isAllowed(message: Message): Promise<boolean> {
  if (message.author.bot) {
    return true;
  }

  /* Mods are allowed by default, trusted members may be trusted as well. */
  const member = new Member(message.member);
  return member.moderator || (await member.trusted());
}

async function followUp(message: Message, match: string): Promise<void> {
  const toast = createToast({
    title: `@${message.member.user.username}, tu mensaje ha sido retenido por tener un enlace inapropiado`,
    description: [
      `¡Hola! El mensaje que has enviado contiene un mensaje que tiene un enlace`,
      `que no está permitido con tu nivel de reputación actual. El filtro`,
      `ha dicho: ${match}.`,
      `\n\n`,
      `Un evento de moderación se ha generado para que pueda revisar tu enlace`,
      `y te otorgue permiso si da por aprobado el enlace. Por favor, no trates`,
      `de reenviar otro enlace hasta entonces para que el sistema antispam`,
      `no te confunda con un bot (o con un spammer).`,
    ].join(" "),
    severity: "error",
    target: message.member.user,
  });
  await message.channel.send({ embeds: [toast] });
}

async function moderateMessage(message: Message, reason: string): Promise<ModEvent> {
  const member = new Member(message.member);
  if (await member.trippedAntispam()) {
    return modEventBuilder(message, "MUTE", "Mensaje con un enlace no permitido por el filtro");
  } else {
    await member.tripAntispam();
    await followUp(message, reason);
    return modEventBuilder(
      message,
      "DELETE",
      "Mensaje con un enlace no permitido por el filtro: " + reason
    );
  }
}

/**
 * The difference for this function is that it will override the isAllowed() call, thus leveled
 * members, moderators and even bots will have this function evaluate to true. The purposes of
 * the function should be pretty clear.
 *
 * @param msg message to analyze
 */
export function isRussianPropaganda(msg: Message) {
  const content = normalizeMessageContent(msg);
  if (messageContainsURL(content)) {
    const crappyPropagandaSites = [
      "mundo.sputniknews.com",
      "actualidad.rt.com",
      "rt.com",
      "sputniknews.com",
    ];
    for (const site of crappyPropagandaSites) {
      if (content.indexOf(`http://${site}`) > -1 || content.indexOf(`https://${site}`) > -1) {
        return true;
      }
    }
  }
  return false;
}

export default class AntispamService implements Hook {
  name = "antispam";

  async onPremoderateMessage(message: Message): Promise<ModEvent | null> {
    if (isRussianPropaganda(message)) {
      return modEventBuilder(
        message,
        "DELETE",
        "Enlaza a sitio web sospechoso de compartir noticias falsas -- sin efecto de moderación"
      );
    }
    const match = testModeration(message);
    if (match && !(await isAllowed(message))) {
      return moderateMessage(message, match);
    }
    return null;
  }
}
