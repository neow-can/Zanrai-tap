const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "owner",
  description: "Show the owner of current voice channel",
  category: "voice",
  cooldown: 8,
  async execute(message) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);

    try {
      const timeLeft = cooldownHandler.checkCooldown("owner", message.author.id, 8);
      if (timeLeft) {
        message.delete();
        return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
          setTimeout(() => msg.delete(), 5000);
        });
      }
  
      cooldownHandler.applyCooldown("owner", message.author.id, 8);
  
      if (!member.voice.channel) {
        return sendEmbed(message, `***${theme.emojis.no}・You must be in a voice channel***`, theme.color);
      }

      const voiceData = await DynamicVoice.findOne({ 
        channelId: member.voice.channel.id 
      });

      if (!voiceData) {
        return sendEmbed(message, `***${theme.emojis.info}・This is not a temporary voice channel***`, theme.color);
      }

      const owner = await guild.members.fetch(voiceData.ownerId).catch(() => null);
      
      if (!owner) {
        return sendEmbed(message, `***${theme.emojis.no}・Could not find the owner of this channel***`, theme.color);
      }

      return sendEmbed(message, `***${theme.emojis.owner}・<#${member.voice.channel.id}> This channel is owned by <@${owner.id}>***`, theme.color);

    } catch (error) {
      console.error("Owner command error:", error);
      return sendEmbed(message, `***${theme.emojis.no} Failed to fetch owner information***`, theme.color);
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
