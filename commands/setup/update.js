const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');
const themeManager = require('../../utils/themeManager');

module.exports = {
  name: 'updatesetup',
  description: 'Update the voice channel and category',
  category: 'setup',
  async execute(message, args) {
    try {
      // Fetch the theme first with error handling
      let theme;
      try {
        theme = await themeManager.getTheme(message.guild.id);
      } catch (error) {
        console.error('Error fetching theme:', error);
        theme = { color: '#FF0000' }; // Fallback color if theme fetch fails
      }

      // Check if args are provided
      if (!args || args.length < 2) {
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('***Please provide a voice channel ID and category ID.***')
          );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const voiceChannelId = args[0];
      const categoryId = args[1];

      // Validate channel IDs format (simple check for Discord snowflake format)
      const snowflakeRegex = /^\d{17,19}$/;
      if (!snowflakeRegex.test(voiceChannelId) || !snowflakeRegex.test(categoryId)) {
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('***The provided IDs are not valid Discord IDs.***')
          );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      // Get the channels from cache
      const voiceChannel = message.guild.channels.cache.get(voiceChannelId);
      const category = message.guild.channels.cache.get(categoryId);

      // Check if channels exist and are of correct type
      if (!voiceChannel) {
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('***The provided voice channel ID does not exist in this server.***')
          );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      if (!category) {
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('***The provided category ID does not exist in this server.***')
          );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      // Check channel types using the correct Discord.js v14 constants
      if (voiceChannel.type !== 2) { // 2 is GUILD_VOICE
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('***The provided channel is not a voice channel.***')
          );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      if (category.type !== 4) { // 4 is GUILD_CATEGORY
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('***The provided channel is not a category.***')
          );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      // Check if user has permission to manage channels
      if (!message.member.permissions.has('ManageChannels')) {
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('***You do not have permission to manage channels in this server.***')
          );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
      
      // Update the database
      try {
        await GuildConfig.findOneAndUpdate(
          { guildId: message.guild.id },
          {
            voiceChannelId: voiceChannel.id,
            categoryId: category.id,
          },
          { upsert: true, new: true }
        );

        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('## Update Voice and Category\n\nVoice channel and category updated successfully!')
          );
        
        await message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('## Error\n\nFailed to update the configuration in the database. Please try again later.')
          );
        
        await message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
    } catch (error) {
      console.error('Error in updatesetup command:', error);
      try {
        const container = new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('## Error\n\nAn unexpected error occurred while executing the command.')
          );
        
        await message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      } catch (replyError) {
        console.error('Failed to send error message:', replyError);
      }
    }
  },
};