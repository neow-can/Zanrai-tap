const { ContainerBuilder, TextDisplayBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const DynamicVoice = require('../../models/DynamicVoice');
const GuildConfig = require('../../models/GuildConfig'); // Fixed extra slash in path
const themeManager = require('../../utils/themeManager');
const devs = require('../../utils/devs.json');
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: 'unfm',
  description: 'Unmute all users in your voice channel',
  category: "voice",
  cooldown: 8,
  async execute(message) {
    const { member, guild } = message;
    
    try {
      // Fetch theme first to use in all responses
      const theme = await themeManager.getTheme(guild.id);
      
      // Check if user is in a voice channel first
      if (!member.voice.channel) {
        return sendEmbed(message, `***${theme.emojis.no}・You must be in a voice channel***`, theme.color);
      }

      // Check cooldown before doing intensive operations
      const timeLeft = cooldownHandler.checkCooldown("unfm", message.author.id, 8);
      if (timeLeft) {
        message.delete().catch(err => console.error("Failed to delete message:", err));
        const cooldownMsg = await sendEmbed(message, `***Please wait ${timeLeft} seconds***`, theme.color);
        setTimeout(() => cooldownMsg.delete().catch(err => console.error("Failed to delete cooldown message:", err)), 5000);
        return;
      }
      
      // Apply cooldown
      cooldownHandler.applyCooldown("unfm", message.author.id, 8);
      
      // Check if the voice channel is a dynamic voice channel
      const voiceData = await DynamicVoice.findOne({
        channelId: member.voice.channel.id,
        guildId: guild.id
      });
      
      if (!voiceData) {
        return sendEmbed(message, `***${theme.emojis.no}・This is not a Tempy Voice channel***`, theme.color);
      }
      
      // Fetch guild configuration
      const guildSettings = await GuildConfig.findOne({ guildId: guild.id });
      if (!guildSettings) {
        return sendEmbed(message, `***${theme.emojis.no}・Server configuration not found***`, theme.color);
      }
      
      const staffRoleIds = guildSettings.staffroleId || [];
      
      // Check permissions
      const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
      const isStaff = staffRoleIds.some(id => member.roles.cache.has(id));
      const isDev = devs.developerIds?.includes(message.author.id);
      const hasPermission = isAdmin || isStaff || isDev;
      
      if (!hasPermission) {
        return sendEmbed(message, `***${theme.emojis.no}・You don't have permission to use this command***`, theme.color);
      }
      
      const channel = member.voice.channel;
      
      // Check if the channel is force muted
      const everyonePerms = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
      if (!everyonePerms?.deny.has(PermissionFlagsBits.Speak)) {
        return sendEmbed(message, `***${theme.emojis.info}・The channel is not force muted***`, theme.color);
      }
      
      // Unmute all members and restore speak permissions
      try {
        await Promise.all([
          ...channel.members.map(async (target) => {
            // Skip the command user if needed and add error handling
            if (target.voice.serverMute) {
              return target.voice.setMute(false).catch(err => {
                console.error(`Failed to unmute ${target.user.tag}:`, err);
              });
            }
            return Promise.resolve(); // Skip if not server-muted
          }),
          channel.permissionOverwrites.edit(guild.roles.everyone, {
            Speak: null // Resets the permission instead of setting to true
          })
        ]);
      } catch (error) {
        console.error('Error during unmute operations:', error);
        return sendEmbed(message, `***${theme.emojis.no}・Error occurred while unmuting users: ${error.message}***`, theme.color);
      }
      
      // Clear any tracked muted members if using a mutedMembers tracking system
      // This would need to be integrated with the fm command's tracking
      if (global.mutedMembers) {
        channel.members.forEach(m => {
          if (global.mutedMembers.has(m.id) && global.mutedMembers.get(m.id) === channel.id) {
            global.mutedMembers.delete(m.id);
          }
        });
      }
      
      return sendEmbed(message, `***${theme.emojis.yes}・Unmuted all users in <#${channel.id}>***`, theme.color);
    } catch (error) {
      console.error('Unmute error:', error);
      return sendEmbed(message, `***${theme.emojis.no}・Failed to unmute: ${error.message}***`, theme.color);
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