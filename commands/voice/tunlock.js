const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "tunlock",
  description: "Unlock the text chat in your voice channel",
  category: "voice",
  cooldown: 8,
  async execute(message) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);

    const timeLeft = cooldownHandler.checkCooldown("tunlock", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("tunlock", message.author.id, 8);

    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・You must be in a voice channel to unlock its chat***`, theme.color);
    }

    const voiceData = await DynamicVoice.findOne({ 
      channelId: member.voice.channel.id,
      guildId: guild.id
    });
    
    if (!voiceData) {
      return sendEmbed(message, `***${theme.emojis.info}・This is not a temporary voice channel***`, theme.color);
    }

    if (voiceData.ownerId !== member.id) {
      return sendEmbed(message, `***${theme.emojis.info}・You must be the owner to unlock this chat***`, theme.color);
    }

    const currentPerms = member.voice.channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    
    if (!currentPerms || !currentPerms.deny.has(PermissionFlagsBits.SendMessages)) {
      return sendEmbed(message, `***${theme.emojis.info}・${member} Voice channel chat is already unlocked***`, theme.color);
    }

    try {
      await member.voice.channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: true,
      });
      
      return sendEmbed(message, `***${theme.emojis.unlock}・${member} Voice channel chat has been unlocked***`, theme.color);
    } catch (error) {
      console.error("Error unlocking voice channel chat:", error);
      return sendEmbed(message,
        `***${theme.emojis.no} ${member}, failed to unlock chat: ${error.message}***`,
        theme.color
      );
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