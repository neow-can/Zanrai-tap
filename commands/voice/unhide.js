const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const GuildConfig = require("../../models/GuildConfig");
const themeManager = require("../../utils/themeManager");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "unhide",
  description: "Unhide your voice channel (make it visible again)",
  category: "voice",
  cooldown: 8,
  async execute(message) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);

    const timeLeft = cooldownHandler.checkCooldown("unhide", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("unhide", message.author.id, 8);

    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・**Error!** You must be in a voice channel to unhide it***`, theme.color);
    }

    const voiceData = await DynamicVoice.findOne({ 
      channelId: member.voice.channel.id,
      guildId: guild.id
    });
    
    if (!voiceData) {
      return sendEmbed(message, `***${theme.emojis.info}・**Warning!** This is not a temporary voice channel***`, theme.color);
    }

    try {
      const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
      
      if (voiceData.ownerId !== member.id) {
        return sendEmbed(message, `***${theme.emojis.no}・**Warning!** You must be the channel owner to unhide it***`, theme.color);
      }

      if (!guildConfig?.hideShowRoleId || !member.roles.cache.has(guildConfig.hideShowRoleId)) {
        return sendEmbed(message, `***${theme.emojis.no}・**Error!** You don't have permission to unhide voice channels***`, theme.color);
      }

      const channel = guild.channels.cache.get(member.voice.channel.id);
      

      await channel.permissionOverwrites.edit(guild.id, {
        ViewChannel: true
      });

      return sendEmbed(message, `***${theme.emojis.yes}・**Success!** Channel <#${member.voice.channel.id}> is now visible***`, theme.color);

    } catch (error) {
      console.error("UnhideVC command error:", error);
      return sendEmbed(message, `***${theme.emojis.no}・**Error!** Failed to unhide channel: ${error.message}***`, theme.color);
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