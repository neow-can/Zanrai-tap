const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "tlock",
  description: "Lock the text chat in your voice channel",
  category: "voice",
  cooldown: 8,
  async execute(message) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);

    const timeLeft = cooldownHandler.checkCooldown("tlock", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("tlock", message.author.id, 8);

    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・You must be in a voice channel to lock its chat***`, theme.color);
    }

    const voiceData = await DynamicVoice.findOne({ 
      channelId: member.voice.channel.id,
      guildId: guild.id
    });
    
    if (!voiceData) {
      return sendEmbed(message, `***${theme.emojis.info}・This is not a temporary voice channel***`, theme.color);
    }

    if (voiceData.ownerId !== member.id) {
      return sendEmbed(message, `***${theme.emojis.info}・You must be the owner to lock this chat***`, theme.color);
    }

    const currentPerms = member.voice.channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    
    if (currentPerms && currentPerms.deny.has(PermissionFlagsBits.SendMessages)) {

      return sendEmbed(message, `***${theme.emojis.info}・${member} Voice channel chat is already locked***`, theme.color);
    }

    try {
      await member.voice.channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: false
      });
      
      return sendEmbed(message, `***${theme.emojis.lock}・${member} Voice channel chat has been locked***`, theme.color);
    } catch (error) {
      console.error("Error locking voice channel chat:", error);
      return sendEmbed(message,
        `***${theme.emojis.no} ${member}, failed to lock chat: ${error.message}***`,
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