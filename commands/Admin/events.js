const { ContainerBuilder, TextDisplayBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const DynamicVoice = require('../../models/DynamicVoice');
const GuildConfig = require('../../models/GuildConfig');
const themeManager = require('../../utils/themeManager');
const devs = require('../../utils/devs.json');
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: 'event',
  description: 'Automatically move your voice channel to the predefined category',
  category: "voice",
  cooldown: 8,
  async execute(message) {
    const { member, guild } = message;
    
    try {
      // Fetch theme first to ensure it's available for all responses
      const theme = await themeManager.getTheme(guild.id);
      
      // Check if user is in a voice channel
      if (!member.voice.channel) {
        return sendEmbed(message, `***${theme.emojis.no}・You must be in a voice channel***`, theme.color);
      }

      // Check cooldown before doing any intensive operations
      const timeLeft = cooldownHandler.checkCooldown("event", message.author.id, 8);
      if (timeLeft) {
        message.delete().catch(err => console.error("Failed to delete message:", err));
        const cooldownMsg = await sendEmbed(message, `***Please wait ${timeLeft} seconds***`, theme.color);
        setTimeout(() => cooldownMsg.delete().catch(err => console.error("Failed to delete cooldown message:", err)), 5000);
        return;
      }
      
      // Apply cooldown
      cooldownHandler.applyCooldown("event", message.author.id, 8);
      
      // Check if the current voice channel is a dynamic voice channel
      const voiceData = await DynamicVoice.findOne({ 
        channelId: member.voice.channel.id,
        guildId: guild.id
      });
      
      if (!voiceData) {
        return sendEmbed(message, `***${theme.emojis.info}・This is not a temporary voice channel***`, theme.color);
      }
      
      // Fetch guild configuration
      const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
      if (!guildConfig) {
        return sendEmbed(message, `***${theme.emojis.no}・Server configuration not found***`, theme.color);
      }
      
      const staffRoleIds = guildConfig.staffroleId || [];
      const eventsCategoryId = guildConfig.eventsCategoryId;
      
      // Check permissions
      const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
      const isStaff = staffRoleIds.some(id => member.roles.cache.has(id));
      const isDev = devs.developerIds?.includes(message.author.id);
      const hasPermission = isAdmin || isStaff || isDev;
      
      if (!hasPermission) {
        return sendEmbed(message, `***${theme.emojis.no}・You don't have permission to use this command***`, theme.color);
      }
      
      // Check if events category is configured
      if (!eventsCategoryId) {
        return sendEmbed(message, `***${theme.emojis.no}・No events category has been configured***`, theme.color);
      }
      
      // Get current voice channel and target category
      const channel = member.voice.channel;
      const targetCategory = guild.channels.cache.get(eventsCategoryId);
      
      if (!targetCategory) {
        return sendEmbed(message, `***${theme.emojis.no}・The configured events category doesn't exist***`, theme.color);
      }
      
      if (targetCategory.type !== ChannelType.GuildCategory) {
        return sendEmbed(message, `***${theme.emojis.no}・The configured events category is not a valid category***`, theme.color);
      }
      
      // If channel is already in the target category, no need to move
      if (channel.parentId === targetCategory.id) {
        return sendEmbed(message, `***${theme.emojis.info}・This channel is already in the events category***`, theme.color);
      }
      
      // Move the channel
      await channel.setParent(targetCategory.id, { lockPermissions: false });
      
      return sendEmbed(message, `***${theme.emojis.yes}・Moved <#${channel.id}> to the server's events category***`, theme.color);
    } catch (error) {
      console.error('Auto move error:', error);
      return sendEmbed(message, `***${theme.emojis.no}・Failed to move channel: ${error.message}***`, theme.color);
    }
  }
};

/**
 * Sends a container message
 * @param {Message} message - The original message
 * @param {string} description - The description for the container
 * @param {string|number} color - The color for the container
 * @returns {Promise<Message>} The sent message
 */
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