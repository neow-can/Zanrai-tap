const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "rejectrole",
  description: "Block a role from accessing your voice channel (mention or ID)",
  aliases: ["denyrole","rrole" ],
  category: "voice",
  cooldown: 8,
  async execute(message, args) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);

    const timeLeft = cooldownHandler.checkCooldown("rejectrole", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("rejectrole", message.author.id, 8);

    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・You must be in a voice channel to use this command***`, theme.color);
    }

    const voiceData = await DynamicVoice.findOne({ 
      channelId: member.voice.channel.id,
      guildId: guild.id
    });
    
    if (!voiceData) {
      return sendEmbed(message, `***${theme.emojis.info}・This is not a temporary voice channel***`, theme.color);
    }

    if (voiceData.ownerId !== member.id) {
      return sendEmbed(message, `***${theme.emojis.info}・You must be the owner to reject roles***`, theme.color);
    }

    const targetId = message.mentions.roles.first()?.id || args[0];
    if (!targetId) {
      return sendEmbed(message, `***${theme.emojis.no}・Please provide a valid role***`, theme.color);
    }

    const targetRole = await guild.roles.fetch(targetId).catch(() => null);
    if (!targetRole) {
      return sendEmbed(message, `***${theme.emojis.no}・Role not found***`, theme.color);
    }

    try {
      await member.voice.channel.permissionOverwrites.edit(targetRole, {
        ViewChannel: true,
        Connect: false,
      });

      return sendEmbed(message, `***${theme.emojis.yes}・Rejected ${targetRole} from your voice channel***`, theme.color);
    } catch (error) {
      console.error("Error rejecting role:", error);
      return sendEmbed(message,`***${theme.emojis.no}・Failed to reject role: ${error.message}***`,theme.color);
    }
  }
};

function sendEmbed(message, description, color) {
    const container = new ContainerBuilder()
      .setAccentColor(typeof color === 'string' ? parseInt(color.replace('#', '0x'), 16) : color)
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(description)
      );
    return message.channel.send({
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
}