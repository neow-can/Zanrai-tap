const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "kick",
  description: "Kick a user from your voice channel",
  category: "voice",
  cooldown: 8,
  async execute(message, args) {
    const { member, guild, mentions } = message;
    const theme = await themeManager.getTheme(guild.id);

    const timeLeft = cooldownHandler.checkCooldown("kick", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("kick", message.author.id, 8);

    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・**Error!** You must be in a voice channel to kick users***`, theme.color);
    }

    const voiceData = await DynamicVoice.findOne({ 
        channelId: member.voice.channel.id,
        guildId: guild.id
      });
      
      if (!voiceData) {
        return sendEmbed(message, `***${theme.emojis.info}・**Warning!** This is not a temporary voice channel***`, theme.color);
      }


    const targetId = message.mentions.members.first()?.id || args[0];
    if (voiceData.ownerId !== member.id) {
        return sendEmbed(message, `***${theme.emojis.info}・**Warning!** You must be the channel owner to kick users***`, theme.color);
      }

    if (!targetId) {
        return sendEmbed(message, `***${theme.emojis.info}・**Warning!** Please provide a valid user***`, theme.color);
      }

    const targetUser = await guild.members.fetch(targetId).catch(() => null);
      if (!targetUser) {
        return sendEmbed(message, `***${theme.emojis.no}・**Error!** User not found***`, theme.color);
      }
    if (targetUser.id === member.id) {
      return sendEmbed(message, `***${theme.emojis.no}・**Warning!** You cannot kick yourself***`, theme.color);
    }

    if (!targetUser.voice.channel || targetUser.voice.channel.id !== member.voice.channel.id) {
      return sendEmbed(message, `***${theme.emojis.no}・**Warning!** User must be in your voice channel***`, theme.color);
    }


    try {
      await targetUser.voice.disconnect();
      return sendEmbed(message, `***${theme.emojis.yes}・**Success!** ${targetUser} has been kicked from <#${member.voice.channel.id}> successfully***`, theme.color);
    } catch (error) {
      console.error("Error kicking user:", error);
      return sendEmbed(message,`***${theme.emojis.no}・**Error!** Failed to kick user: ${error.message}***`,theme.color);
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