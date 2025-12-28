const { ContainerBuilder, TextDisplayBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const DynamicVoice = require('../../models/DynamicVoice');
const themeManager = require('../../utils/themeManager');
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: 'soundboard',
  aliases: ['sb'],
  description: 'Enable/disable SoundBoard in your voice channel',
  category: "voice",
  cooldown:8,
  async execute(message, args) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);
    const action = args[0]?.toLowerCase();

    const timeLeft = cooldownHandler.checkCooldown("soundboard", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("soundboard", message.author.id, 8);

    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・You must be in a voice channel to use it***`, theme.color);
    }

    const voiceData = await DynamicVoice.findOne({
      channelId: member.voice.channel.id,
      guildId: guild.id
    });

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
    const currentPerms = member.voice.channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    if (newState ? 
        currentPerms?.allow.has(PermissionFlagsBits.UseSoundboard) : 
        currentPerms?.deny.has(PermissionFlagsBits.UseSoundboard)) {
      const currentState = newState ? 'ON ' : 'OFF ';
      return sendEmbed(message,
        `***${theme.emojis.sb}・SoundBoard is already ${currentState} in this channel***`,
        theme.color
      );
    }

    try {
      await member.voice.channel.permissionOverwrites.edit(guild.roles.everyone, {
        UseSoundboard: newState,
      });

      const status = newState ? `enabled ${theme.emojis.sb}` : ` disabled ${theme.emojis.sb} `; 
      return sendEmbed(message, `***${theme.emojis.yes}・SoundBoard has been ${status}***`,theme.color);
    } catch (error) {
      console.error('Error updating SoundBoard settings:', error);
      return sendEmbed(message,`***${theme.emojis.no}・Failed to update SoundBoard: ${error.message}***`,theme.color);
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