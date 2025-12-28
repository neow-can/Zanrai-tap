const { ContainerBuilder, TextDisplayBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');
const themeManager = require('../../utils/themeManager');

module.exports = {
  name: 'updatesetup',
  description: 'Update the voice channel and category',
  category: 'setup',
  async execute(message, args) {
    try {
      // Check if user has administrator permissions
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const noPermContainer = new ContainerBuilder()
          .setAccentColor(0xff0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`❌・You don't have permission to update the guild configuration.`)
          );
        return message.reply({ 
          components: [noPermContainer], 
          flags: [MessageFlags.IsComponentsV2],
          ephemeral: true 
        });
      }

      // Fetch theme for consistent styling
      let theme;
      try {
        theme = await themeManager.getTheme(message.guild.id);
      } catch (error) {
        console.error('Error fetching theme:', error);
        theme = { 
          color: '#ff0000',
          emojis: {
            no: '❌',
            yes: '✅',
            info: 'ℹ️'
          }
        };
      }

      // Check if args are provided
      if (!args || args.length < 2) {
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`${theme.emojis.no}・Please provide a voice channel ID and category ID.`)
          );
        return message.reply({ 
          components: [container], 
          flags: [MessageFlags.IsComponentsV2],
          ephemeral: true 
        });
      }

      const voiceChannelId = args[0];
      const categoryId = args[1];

      // Validate channel IDs format
      const snowflakeRegex = /^\d{17,19}$/;
      if (!snowflakeRegex.test(voiceChannelId) || !snowflakeRegex.test(categoryId)) {
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`${theme.emojis.no}・The provided IDs are not valid Discord IDs.`)
          );
        return message.reply({ 
          components: [container], 
          flags: [MessageFlags.IsComponentsV2],
          ephemeral: true 
        });
      }

      // Get the channels from cache
      const voiceChannel = message.guild.channels.cache.get(voiceChannelId);
      const category = message.guild.channels.cache.get(categoryId);

      // Check if channels exist
      if (!voiceChannel) {
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`${theme.emojis.no}・The provided voice channel ID does not exist in this server.`)
          );
        return message.reply({ 
          components: [container], 
          flags: [MessageFlags.IsComponentsV2],
          ephemeral: true 
        });
      }

      if (!category) {
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`${theme.emojis.no}・The provided category ID does not exist in this server.`)
          );
        return message.reply({ 
          components: [container], 
          flags: [MessageFlags.IsComponentsV2],
          ephemeral: true 
        });
      }

      // Check channel types using the correct Discord.js v14 constants
      if (voiceChannel.type !== 2) { // 2 is GUILD_VOICE
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`${theme.emojis.no}・The provided channel is not a voice channel.`)
          );
        return message.reply({ 
          components: [container], 
          flags: [MessageFlags.IsComponentsV2],
          ephemeral: true 
        });
      }

      if (category.type !== 4) { // 4 is GUILD_CATEGORY
        const container = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`${theme.emojis.no}・The provided channel is not a category.`)
          );
        return message.reply({ 
          components: [container], 
          flags: [MessageFlags.IsComponentsV2],
          ephemeral: true 
        });
      }

      // Ask for confirmation
      const confirmContainer = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`${theme.emojis.info}・Are you sure you want to update the voice channel and category? Reply with **yes** to confirm or **no** to cancel.`)
        );
      
      const confirmMsg = await message.reply({ 
        components: [confirmContainer], 
        flags: [MessageFlags.IsComponentsV2],
        ephemeral: true 
      });
      
      // Create a filter for the collector
      const filter = m => m.author.id === message.author.id && ['yes', 'no'].includes(m.content.toLowerCase());
      
      // Create a message collector
      const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });
      
      collector.on('collect', async m => {
        // Delete the user's response message if possible
        if (!m.deleted) {
          try {
            await m.delete();
          } catch (error) {
            console.error('Failed to delete response message:', error);
          }
        }
        
        // Process the response
        if (m.content.toLowerCase() === 'yes') {
          try {
            // Update the database
            await GuildConfig.findOneAndUpdate(
              { guildId: message.guild.id },
              {
                voiceChannelId: voiceChannel.id,
                categoryId: category.id,
              },
              { upsert: true, new: true }
            );

            const successContainer = new ContainerBuilder()
              .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`## Configuration Updated\n\n${theme.emojis.yes}・Voice channel and category updated successfully!\n\n**Voice Channel:** <#${voiceChannel.id}>\n**Category:** ${category.name}`)
              );
            
            await message.reply({ 
              components: [successContainer], 
              flags: [MessageFlags.IsComponentsV2, 64] 
            });
          } catch (dbError) {
            console.error('Database error:', dbError);
            
            const errorContainer = new ContainerBuilder()
              .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`${theme.emojis.no}・Failed to update the configuration: ${dbError.message}`)
              );
            
            await message.reply({ 
              components: [errorContainer], 
              flags: [MessageFlags.IsComponentsV2, 64] 
            });
          }
        } else {
          const cancelContainer = new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`${theme.emojis.info}・Update operation cancelled.`)
            );
          
          await message.reply({ 
            components: [cancelContainer], 
            flags: [MessageFlags.IsComponentsV2, 64] 
          });
        }
      });
      
      collector.on('end', collected => {
        if (collected.size === 0) {
          const timeoutContainer = new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`${theme.emojis.no}・Update operation timed out.`)
            );
          
          message.reply({ 
            components: [timeoutContainer], 
            flags: [MessageFlags.IsComponentsV2, 64] 
          }).catch(console.error);
        }
      });
    } catch (error) {
      console.error('Updatesetup command error:', error);
      
      // Try to use theme colors if available, otherwise use a default red color
      let errorColor;
      let errorEmoji = '❌';
      try {
        const theme = await themeManager.getTheme(message.guild.id);
        errorColor = theme.color;
        errorEmoji = theme.emojis.no || '❌';
      } catch {
        errorColor = '#ff0000';
      }
      
      const errorContainer = new ContainerBuilder()
        .setAccentColor(typeof errorColor === 'string' ? parseInt(errorColor.replace('#', '0x'), 16) : 0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`${errorEmoji}・An error occurred: ${error.message}`)
        );
      
      message.reply({ 
        components: [errorContainer], 
        flags: [MessageFlags.IsComponentsV2, 64] 
      }).catch(console.error);
    }
  },
};