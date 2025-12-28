const { joinVoiceChannel } = require('@discordjs/voice');
const themeManager = require('../../utils/themeManager');
const cooldownHandler = require('../../events/cooldown');
const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

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

module.exports = {
  name: 'join',
  description: 'Make the bot join your voice channel and stay 24/7',
  aliases: ['join'],
  category: 'Admin',
  async execute(message, args) {
    const { guild, member } = message;
    const theme = await themeManager.getTheme(guild.id);

    // تحقق من صلاحية Administrator
    if (!member.permissions.has('Administrator')) {
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.no || '❌'}・This order is only for those who have the authority Administrator!***`)
        );
      return message.channel.send({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    // Cooldown check
    const timeLeft = cooldownHandler.checkCooldown('join', message.author.id, 8);
    if (timeLeft) {
      try { await message.delete(); } catch {}
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***⏳ Please wait ${timeLeft} seconds before trying again.***`)
        );
      return message.channel.send({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      }).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }
    cooldownHandler.applyCooldown('join', message.author.id, 8);

    // Determine the target voice channel
    let targetChannel = null;
    if (args && args.length > 0) {
      // If mention, ID, or name is provided
      const arg = args[0];
      // Try to get the channel by mention or ID
      targetChannel = guild.channels.cache.get(arg.replace(/[^0-9]/g, ""));
      // If not found by ID, search by name
      if (!targetChannel) {
        targetChannel = guild.channels.cache.find(
          ch => (ch.type === 2 || ch.type === 'GUILD_VOICE') && ch.name.toLowerCase() === arg.toLowerCase()
        );
      }
      // If not found or not a voice channel
      if (!targetChannel || !(targetChannel.type === 2 || targetChannel.type === 'GUILD_VOICE')) {
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.no}・Could not find the requested voice channel!***`)
          );
        return message.channel.send({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
    } else {
      // If not specified, join the user's voice channel
      if (!member.voice.channel) {
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.no}・You must be in a voice channel or specify one!***`)
          );
        return message.channel.send({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
      targetChannel = member.voice.channel;
    }

    try {
      joinVoiceChannel({
        channelId: targetChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true, // الكاسك مفعّل
      });
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.yes}・Bot has successfully joined <#${targetChannel.id}>!***`)
        );
      return message.channel.send({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    } catch (error) {
      console.error('Join command error:', error);
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.no}・An error occurred while trying to join: ${error.message}***`)
        );
      return message.channel.send({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  },
};




