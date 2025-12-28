const { ContainerBuilder, TextDisplayBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');
const themeManager = require('../../utils/themeManager');

module.exports = {
  name: 'rejected',
  description: 'Set a voice channel for rejected users',
  category: 'setup',
  async execute(message, args) {
    try {
      const { member, guild } = message;
      const guildId = guild.id;
      
      // Check if user has administrator permissions
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        const noPermContainer = new ContainerBuilder()
          .setAccentColor(0xff0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***❌・You don't have permission to configure the rejected voice channel.***`)
          );
        return message.reply({ 
          components: [noPermContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      // Fetch theme for consistent styling
      let theme;
      try {
        theme = await themeManager.getTheme(guildId);
      } catch (themeError) {
        console.error('Theme manager error:', themeError);
        theme = { 
          color: '#ff0000', 
          emojis: { 
            info: '📝', 
            yes: '✅', 
            no: '❌' 
          } 
        };
      }
      
      // Check if channel ID was provided
      const voiceChannelId = args[0];
      if (!voiceChannelId) {
        const helpContainer = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.info}・Please provide a voice channel ID. You can right-click on a voice channel and select "Copy ID" to get it.***`)
          );
        return message.reply({ 
          components: [helpContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
      
      // Check if the provided ID is valid
      const voiceChannel = guild.channels.cache.get(voiceChannelId);
      if (!voiceChannel) {
        const invalidContainer = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.no}・The provided ID does not match any channel in this server.***`)
          );
        return message.reply({ 
          components: [invalidContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
      
      // Check if the channel is a voice channel
      if (voiceChannel.type !== ChannelType.GuildVoice) {
        const wrongTypeContainer = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.no}・The provided ID is not a voice channel. Please provide a valid voice channel ID.***`)
          );
        return message.reply({ 
          components: [wrongTypeContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
      
      // Check if the bot has permissions to connect to the voice channel
      const botMember = guild.members.me || guild.members.cache.get(guild.client.user.id);
      if (!botMember) {
        const errorContainer = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.no}・Could not get bot member. Please try again.***`)
          );
        return message.reply({ 
          components: [errorContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
      
      if (!voiceChannel.permissionsFor(botMember).has(PermissionFlagsBits.Connect)) {
        const noPermContainer = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.no}・The bot doesn't have permission to connect to this voice channel. Please give the bot "Connect" permission.***`)
          );
        return message.reply({ 
          components: [noPermContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
      
      try {
        // Update the guild configuration
        const updatedConfig = await GuildConfig.findOneAndUpdate(
          { guildId: guildId },
          { rejectedVoiceChannelId: voiceChannel.id },
          { upsert: true, new: true }
        );
        
        // Check if update was successful
        if (!updatedConfig) {
          throw new Error('Failed to update database');
        }
        
        const successContainer = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.yes}・Rejected voice channel set to **<#${voiceChannel.id}>**!***`)
          );
        
        return message.reply({ 
          components: [successContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        const dbErrorContainer = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.no}・Failed to update the rejected voice channel: ${dbError.message}***`)
          );
        
        return message.reply({ 
          components: [dbErrorContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
    } catch (error) {
      console.error('Rejected command error:', error);
      
      // Use default color for error as we might not be able to access the theme
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***❌・An error occurred: ${error.message}***`)
        );
      
      return message.reply({ 
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  },
};