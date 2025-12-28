const { ContainerBuilder, TextDisplayBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const DynamicVoice = require('../../models/DynamicVoice');
const themeManager = require('../../utils/themeManager');
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: 'cam',
  aliases: ['stream', 'video'],
  description: 'Enable/disable video streaming in your voice channel',
  category: "voice",
  cooldown:8,
  async execute(message, args) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);
    const action = args[0]?.toLowerCase();

    const timeLeft = cooldownHandler.checkCooldown("cam", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("cam", message.author.id, 8);

    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・You must be in a voice channel to use it***`, theme.color);
    }

    const voiceData = await DynamicVoice.findOne({
      channelId: member.voice.channel.id,
      guildId: guild.id
    }) || { streamingEnabled: true };

    if (!voiceData) {
      return sendEmbed(message, `***${theme.emojis.info}・This is not a temporary voice channel***`, theme.color);
    }

    if (voiceData.ownerId !== member.id) {
      return sendEmbed(message, `***${theme.emojis.info}・You must be the owner to use it***`, theme.color);
    }

    if (!action || !['on', 'off', 'enable', 'disable'].includes(action)) {
        return sendEmbed(message, `***${theme.emojis.info}・Please specify \`'on'\` or \`'off'\`***`, theme.color);
    }

    const newState = action === 'on' || action === 'enable';

    const currentPermissions = member.voice.channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    const currentStreamingAllowed = currentPermissions
      ? currentPermissions.allow.has(PermissionFlagsBits.Stream)
      : true; 

    if (currentStreamingAllowed === newState) {
        const response = newState
          ? `***${theme.emojis.camon}・Streaming is already **enabled** in this channel***`
          : `***${theme.emojis.camoff}・Streaming is already **disabled** in this channel***`;
        return sendEmbed(message, response, theme.color);
      }
    try {
      await member.voice.channel.permissionOverwrites.edit(guild.roles.everyone, {
        [PermissionFlagsBits.Stream]: newState, 
      });

      const status = newState ? 'enabled' : 'disabled';
      return sendEmbed(message, `***${theme.emojis.yes}・Video streaming has been ${status}***`, theme.color);
    } catch (error) {
      console.error('Error updating streaming settings:', error);
      return sendEmbed(message, `***${theme.emojis.no}・Failed to update streaming: ${error.message}***`, theme.color);
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
