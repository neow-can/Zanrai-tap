const { ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const DynamicVoice = require('../../models/DynamicVoice');
const GuildConfig = require('../../models/GuildConfig');
const themeManager = require('../../utils/themeManager');
const devs = require('../../utils/devs.json');
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: 'top',
  description: 'Move your voice channel to the top of voice channels list',
  category: "voice",
  cooldown: 8,
  async execute(message) {
    const { member, guild } = message;

    try {
      const theme = await themeManager.getTheme(guild.id);
      const serverIcon = guild.iconURL({ dynamic: true, size: 128 });

      if (!member.voice.channel) {
        return sendEmbed(message, `***${theme.emojis.no}・You must be in a voice channel***`, theme.color, serverIcon);
      }

      const timeLeft = cooldownHandler.checkCooldown("top", message.author.id, 8);
      if (timeLeft) {
        message.delete().catch(console.error);
        const cooldownMsg = await sendEmbed(message, `***Please wait ${timeLeft} seconds***`, theme.color, serverIcon);
        setTimeout(() => cooldownMsg.delete().catch(console.error), 5000);
        return;
      }

      cooldownHandler.applyCooldown("top", message.author.id, 8);

      const voiceData = await DynamicVoice.findOne({ 
        channelId: member.voice.channel.id,
        guildId: guild.id
      });

      if (!voiceData) {
        return sendEmbed(message, `***${theme.emojis.info}・This is not a temporary voice channel***`, theme.color, serverIcon);
      }

      const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
      if (!guildConfig) {
        return sendEmbed(message, `***${theme.emojis.no}・Server configuration not found***`, theme.color, serverIcon);
      }

      const mainVoiceChannelId = guildConfig.voiceChannelId;
      const staffRoleIds = guildConfig.staffroleId || [];

      const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
      const isStaff = staffRoleIds.some(id => member.roles.cache.has(id));
      const isDev = devs.developerIds?.includes(message.author.id);
      const hasPermission = isAdmin || isStaff || isDev;

      if (!hasPermission) {
        return sendEmbed(message, `***${theme.emojis.no}・You don't have permission to use this command***`, theme.color, serverIcon);
      }

      const channel = member.voice.channel;

      if (!channel.parent) {
        return sendEmbed(message, `***${theme.emojis.no}・This voice channel is not in a category***`, theme.color, serverIcon);
      }

      const voiceChannels = channel.parent.children.cache
        .filter(c => c.type === ChannelType.GuildVoice)
        .sort((a, b) => a.position - b.position);

      if (voiceChannels.size === 0) {
        return sendEmbed(message, `***${theme.emojis.no}・No voice channels found in this category***`, theme.color, serverIcon);
      }

      let targetPosition = 0;
      if (mainVoiceChannelId) {
        const mainChannel = voiceChannels.find(c => c.id === mainVoiceChannelId);
        if (mainChannel) {
          targetPosition = mainChannel.position + 1;
        }
      }

      if (channel.position === targetPosition) {
        return sendEmbed(message, `***${theme.emojis.info}・This channel is already at the top position***`, theme.color, serverIcon);
      }

      await channel.setPosition(targetPosition);

      return sendEmbed(message, `***${theme.emojis.yes}・Moved <#${channel.id}> to the top of voice channels***`, theme.color, serverIcon);

    } catch (error) {
      console.error('Move to top error:', error);
      const theme = await themeManager.getTheme(message.guild.id);
      const serverIcon = message.guild.iconURL({ dynamic: true, size: 128 });
      return sendEmbed(message, `***${theme.emojis.no}・Failed to move channel: ${error.message}***`, theme.color, serverIcon);
    }
  }
};

function sendEmbed(message, description, color, thumbnailUrl) {
  const section = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(description)
    );

  if (thumbnailUrl) {
    section.setThumbnailAccessory(
      new ThumbnailBuilder().setURL(thumbnailUrl)
    );
  }

  const container = new ContainerBuilder()
    .setAccentColor(typeof color === 'string' ? parseInt(color.replace('#', '0x'), 16) : color)
    .addSectionComponents(section);

  return message.channel.send({ 
    components: [container],
    flags: [MessageFlags.IsComponentsV2]
  });
}
