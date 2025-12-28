const { ContainerBuilder, TextDisplayBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');
const themeManager = require('../../utils/themeManager');

module.exports = {
  name: 'events-category',
  description: 'Set up a category for event channels',
  category: 'setup',
  usage: '[categoryID]',
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
              .setContent(`***❌・You don't have permission to configure events category.***`)
          );
        return message.reply({ 
          components: [noPermContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
      
      // Get the theme early to ensure consistent styling throughout
      let theme;
      try {
        theme = await themeManager.getTheme(guildId);
      } catch (themeError) {
        console.error('Theme manager error:', themeError);
        // Fallback theme if theme manager fails
        theme = {
          color: '#ff0000',
          emojis: {
            info: 'ℹ️',
            yes: '✅',
            no: '❌'
          }
        };
      }
      
      // Check if category ID was provided
      const categoryId = args[0];
      if (!categoryId) {
        const helpContainer = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***## Events Category Setup***

***${theme.emojis.info}・Please provide a category ID. You can right-click on a category and select "Copy ID" to get it.***

***Usage: events-category [categoryID]***`)
          );
        return message.reply({ 
          components: [helpContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
      
      // Check if the provided ID is valid
      const category = guild.channels.cache.get(categoryId);
      if (!category) {
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
      
      // Check if the channel is a category
      if (category.type !== ChannelType.GuildCategory) {
        const wrongTypeContainer = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme.emojis.no}・The provided ID is not a category. Please provide a valid category ID.***`)
          );
        return message.reply({ 
          components: [wrongTypeContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
      
      try {
        // Update the guild configuration
        const updatedConfig = await GuildConfig.findOneAndUpdate(
          { guildId: guildId },
          { eventsCategoryId: category.id },
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
              .setContent(`## Events Category Setup\n\n${theme.emojis.yes}・Event channels category set to **${category.name}**!`)
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
              .setContent(`***${theme.emojis.no}・Failed to update the events category: ${dbError.message}***`)
          );
        
        return message.reply({ 
          components: [dbErrorContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
    } catch (error) {
      console.error('Events category command error:', error);
      
      // Try to use theme colors if available, otherwise use a default red color
      let errorColor = '#ff0000';
      let errorEmoji = '❌';
      
      try {
        const theme = await themeManager.getTheme(message.guild.id);
        errorColor = theme.color;
        errorEmoji = theme.emojis.no || '❌';
      } catch (themeError) {
        console.error('Theme error in catch block:', themeError);
      }
      
      const errorContainer = new ContainerBuilder()
        .setAccentColor(typeof errorColor === 'string' ? parseInt(errorColor.replace('#', '0x'), 16) : 0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${errorEmoji}・An error occurred: ${error.message}***`)
        );
      
      return message.reply({ 
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  },
};