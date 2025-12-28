const { ContainerBuilder, TextDisplayBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const DynamicVoice = require('../../models/DynamicVoice');
const GuildConfig = require('../../models/GuildConfig'); // Fixed extra slash in path
const themeManager = require('../../utils/themeManager');
const devs = require('../../utils/devs.json');
const cooldownHandler = require("../../events/cooldown");

// Use a WeakMap to avoid memory leaks when guilds are deleted
const mutedMembersCache = new Map();

// Get or create a muted members map for a specific guild
function getMutedMembers(guildId) {
  if (!mutedMembersCache.has(guildId)) {
    mutedMembersCache.set(guildId, new Map());
  }
  return mutedMembersCache.get(guildId);
}

module.exports = {
  name: 'fm',
  description: 'Force mute all users in your voice channel',
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
      const timeLeft = cooldownHandler.checkCooldown("fm", message.author.id, 8);
      if (timeLeft) {
        message.delete().catch(err => console.error("Failed to delete message:", err));
        const cooldownMsg = await sendEmbed(message, `***Please wait ${timeLeft} seconds***`, theme.color);
        setTimeout(() => cooldownMsg.delete().catch(err => console.error("Failed to delete cooldown message:", err)), 5000);
        return;
      }
      
      // Apply cooldown
      cooldownHandler.applyCooldown("fm", message.author.id, 8);
      
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
      
      // Check if the channel is already force muted
      const everyonePerms = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
      if (everyonePerms?.deny.has(PermissionFlagsBits.Speak)) {
        return sendEmbed(message, `***${theme.emojis.info}・The channel is already force muted***`, theme.color);
      }
      
      const ownerId = voiceData.ownerId;
      const mutedMembers = getMutedMembers(guild.id);
      
      // Filter members to mute (exclude owner and command user)
      const membersToMute = channel.members.filter(m => 
        m.id !== ownerId && 
        m.id !== member.id && 
        !m.user.bot // Also exclude bots
      );
      
      // Track muted members for unmuting when they leave
      membersToMute.forEach(m => mutedMembers.set(m.id, channel.id));
      
      // Apply mutes and set permissions
      try {
        await Promise.all([
          ...membersToMute.map(async (target) => {
            // Add error handling for each individual mute operation
            return target.voice.setMute(true).catch(err => {
              console.error(`Failed to mute ${target.user.tag}:`, err);
            });
          }),
          channel.permissionOverwrites.edit(guild.roles.everyone, {
            Speak: false
          })
        ]);
      } catch (error) {
        console.error('Error during mute operations:', error);
        return sendEmbed(message, `***${theme.emojis.no}・Error occurred while muting users: ${error.message}***`, theme.color);
      }
      
      // Set up the voiceStateUpdate listener if it doesn't exist
      if (!guild.voiceStateListener) {
        guild.voiceStateListener = (oldState, newState) => {
          const mutedMembers = getMutedMembers(oldState.guild.id);
          
          // If member left a channel or moved to a different channel
          if (oldState.channelId && (!newState.channelId || newState.channelId !== oldState.channelId)) {
            const memberId = oldState.member.id;
            
            // Check if they were in our muted list
            if (mutedMembers.has(memberId)) {
              if (mutedMembers.get(memberId) === oldState.channelId) {
                // Unmute them and remove from tracking
                oldState.member.voice.setMute(false)
                  .catch(err => console.error(`Failed to unmute ${oldState.member.user.tag}:`, err));
                mutedMembers.delete(memberId);
              }
            }
          }
        };
        
        // Register the listener
        guild.client.on('voiceStateUpdate', guild.voiceStateListener);
      }
      
      return sendEmbed(message, `***${theme.emojis.yes}・Force muted all users in <#${channel.id}>***`, theme.color);
    } catch (error) {
      console.error('Force mute error:', error);
      return sendEmbed(message, `***${theme.emojis.no}・Failed to force mute: ${error.message}***`, theme.color);
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