import { Guild, Role, TextChannel } from "discord.js";
import Makibot from "../Makibot";
import Settings from "./settings";

export default class Server {
  constructor(private guild: Guild) {}

  private getRoleByName(name: string): Role {
    if (name && this.guild.roles.exists("name", name)) {
      return this.guild.roles.find("name", name);
    }
    return null;
  }

  private getRoleByID(id: string): Role {
    if (id && this.guild.roles.exists("id", id)) {
      return this.guild.roles.find("id", id);
    }
    return null;
  }

  private getTextChannelByName(name: string): TextChannel {
    if (name && this.guild.channels.exists("name", name)) {
      const channel = this.guild.channels.find("name", name);
      if (channel.type === "text") {
        return channel as TextChannel;
      }
    }
    return null;
  }

  private getTextChannelByID(id: string): TextChannel {
    if (id && this.guild.channels.exists("id", id)) {
      const channel = this.guild.channels.find("id", id);
      if (channel.type === "text") {
        return channel as TextChannel;
      }
    }
    return null;
  }

  get settings(): Settings {
    return new Settings(this.guild);
  }

  get helperRole(): Role {
    const helperRoleName = process.env.HELPER_ROLE || "helpers";
    return this.getRoleByName(helperRoleName);
  }

  get modsRole(): Role {
    const modsRoleName = process.env.MODS_ROLE || "mods";
    return this.getRoleByName(modsRoleName);
  }

  get verifiedRole(): Role {
    const verifiedRoleName = process.env.VERIFY_ROLE || "verified";
    return this.getRoleByName(verifiedRoleName);
  }

  get warnRole(): Role {
    const warnRoleName = process.env.WARN_ROLE || "warn";
    return this.getRoleByName(warnRoleName);
  }

  get publicModlogChannel(): TextChannel {
    const modlogChannelName = process.env.PUBLIC_MODLOG_CHANNEL || "public-modlog";
    return this.getTextChannelByName(modlogChannelName);
  }

  get modlogChannel(): TextChannel {
    return this.getTextChannelByID(process.env.MODLOG);
  }

  get captchasChannel(): TextChannel {
    const captchasChannelName = process.env.VERIFY_CHANNEL || "captchas";
    return this.getTextChannelByName(captchasChannelName);
  }

  get pinboardChannel(): TextChannel {
    const pinboardChannelName = this.settings.pinPinboard;
    return this.getTextChannelByName(pinboardChannelName);
  }
}
