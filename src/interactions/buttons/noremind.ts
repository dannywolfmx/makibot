import { ButtonInteraction } from "discord.js";
import { ButtonInteractionHandler } from "../../lib/interaction";
import Member from "../../lib/member";
import { createToast } from "../../lib/response";

export default class NoRemindButton implements ButtonInteractionHandler {
  name = "dont_remind_question";

  async handleGuild(event: ButtonInteraction): Promise<void> {
    if (event.channel.isThread()) {
      const originalMessage = await event.channel.fetchStarterMessage();
      if (originalMessage.author.id === event.user.id) {
        const member = new Member(originalMessage.member);
        await member.snoozeThreadChannelHelp();
        const toast = createToast({
          title: "Recordaré tu decisión de no repetirte esto por 30 días",
          severity: "info",
        });
        await event.reply({
          ephemeral: true,
          embeds: [toast],
        });
      } else {
        const toast = createToast({
          title: "Este no es tu hilo, no puedes pulsar este botón...",
          severity: "error",
        });
        await event.reply({
          ephemeral: true,
          embeds: [toast],
        });
      }
    } else {
      const toast = createToast({
        title: "Botón no apto fuera de un hilo",
        description: "Este botón sólo se puede usar en un hilo",
        severity: "error",
      });
      return event.reply({ embeds: [toast] });
    }
  }
}
