import type { APIEmbed, Snowflake } from "discord-api-types";
import {
  CommandInteraction,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  MessageSelectMenu,
  MessageSelectOptionData,
} from "discord.js";

const REASON_OPTIONS: MessageSelectOptionData[] = [
  { label: "Contiene spam y está fuera de un canal aceptable", value: "spam" },
  { label: "Va en contra de las normas de Discord", value: "tos" },
  { label: "Mensaje irrespetuoso o dañino", value: "unrespectful" },
  { label: "Es un copia y pega de un enunciado o de una práctica", value: "copypaste" },
  { label: "Este mensaje es de una calidad demasiado baja", value: "lowquality" },
  { label: "Este mensaje es explícito o NSFW", value: "nsfw" },
];

const ACTION_OPTIONS: MessageSelectOptionData[] = [
  { label: "Avisar amistosamente (sin represaliar)", value: "remind" },
  { label: "Aplicar warn (60 minutos)", value: "warn.hour" },
  { label: "Aplicar warn (24 horas)", value: "warn.day" },
  { label: "Aplicar warn (7 días)", value: "warn.week" },
  { label: "Echar (podrá volver a entrar)", value: "kick" },
  { label: "Banear (no podrá volver a entrar)", value: "ban" },
];

export function getReportReason(value: string): string {
  return REASON_OPTIONS.find((reason) => reason.value === value).label;
}

export interface ModReport {
  message: {
    id: Snowflake;
    author: {
      id: Snowflake;
      username: string;
    };
    content: string;
    embeds: MessageEmbed[] | APIEmbed[];
  };
  report: {
    author: {
      id: Snowflake;
      username: string;
    };
    guild: Snowflake;
    channel: Snowflake;
  };
  interaction: {
    reason: string[];
    action: string[];
    sent: boolean;
  };
}

export function createModReport(event: CommandInteraction): ModReport {
  const message = event.options.getMessage("message", true);
  return {
    message: {
      id: message.id,
      author: {
        id: message.author.id,
        username: message.author.username,
      },
      content: message.content,
      embeds: message.embeds,
    },
    report: {
      author: {
        id: event.user.id,
        username: event.user.username,
      },
      guild: event.guildId,
      channel: event.channel.id,
    },
    interaction: {
      reason: [],
      action: [],
      sent: false,
    },
  };
}

export function renderMenuComponents(tag: ModReport): MessageActionRow[] {
  const reasons = REASON_OPTIONS.map((reason) => {
    return { ...reason, default: tag.interaction.reason.indexOf(reason.value) >= 0 };
  });
  const actions = ACTION_OPTIONS.map((action) => {
    return { ...action, default: tag.interaction.action.indexOf(action.value) >= 0 };
  });
  const canSubmit = tag.interaction.reason.length > 0 && tag.interaction.action.length > 0;
  return [
    new MessageActionRow({
      components: [
        new MessageSelectMenu({
          placeholder: "Razón por la que se aplica la acción",
          options: reasons,
          customId: "modmenu_reason",
        }),
      ],
    }),
    new MessageActionRow({
      components: [
        new MessageSelectMenu({
          placeholder: "Tipo de acción de moderación a tomar",
          options: actions,
          customId: "modmenu_action",
        }),
      ],
    }),
    new MessageActionRow({
      components: [
        new MessageButton({
          customId: "applyModRequest",
          label: "Moderar mensaje",
          style: "PRIMARY",
          disabled: !canSubmit,
        }),
        new MessageButton({
          customId: "cancelModRequest",
          label: "Cancelar",
          style: "DANGER",
        }),
      ],
    }),
  ];
}