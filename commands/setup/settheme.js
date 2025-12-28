const { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const themeManager = require('../../utils/themeManager');

module.exports = {
  name: 'theme',
  description: 'Set the theme for the bot',
  category: 'setup',
  async execute(message, args) {
    try {
      // Check if user has admin permissions
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const currentTheme = await themeManager.getTheme(message.guild.id) || themeManager.themes.cyan;
        const errorContainer = new ContainerBuilder()
          .setAccentColor(currentTheme.color ? (typeof currentTheme.color === 'string' ? parseInt(currentTheme.color.replace('#', '0x'), 16) : currentTheme.color) : 0xFF0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('***You need Administrator permissions to change the bot theme.***')
          );
        return message.reply({ 
          components: [errorContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const guildId = message.guild.id;
      const theme = args[0]?.toLowerCase();
      
      const validThemes = Object.keys(themeManager.themes);
      const currentTheme = await themeManager.getTheme(guildId) || themeManager.themes.cyan;
      
      // If no theme provided or invalid theme, show available themes
      if (!theme || !validThemes.includes(theme)) {
        const container = new ContainerBuilder()
          .setAccentColor(currentTheme.color ? (typeof currentTheme.color === 'string' ? parseInt(currentTheme.color.replace('#', '0x'), 16) : currentTheme.color) : 0x0099FF)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***## Available Themes***

***Current theme: **${currentTheme.name || 'Default'}****

***Please select a theme from the buttons below or use \`theme [name]\`.***

***Available themes:
${validThemes.map(t => `- \`${t}\``).join('\n')}***`)
          );
        
        // Create buttons in chunks of 5
        const themeChunks = [];
        for (let i = 0; i < validThemes.length; i += 5) {
          themeChunks.push(validThemes.slice(i, i + 5));
        }
        
        const rows = themeChunks.map(chunk => {
          const row = new ActionRowBuilder();
          chunk.forEach(t => {
            const button = new ButtonBuilder()
              .setCustomId(`theme_${t}`)
              .setLabel(t.charAt(0).toUpperCase() + t.slice(1))
              .setStyle(ButtonStyle.Secondary);
            
            // Highlight current theme button
            if (t === currentTheme.name) {
              button.setStyle(ButtonStyle.Success);
            }
            
            row.addComponents(button);
          });
          return row;
        });
  
        // Send message with theme selection buttons
        const reply = await message.reply({ 
          components: [container.addActionRowComponents(...rows)],
          flags: [MessageFlags.IsComponentsV2]
        });
          
        // Create collector for button interactions
        const collector = reply.createMessageComponentCollector({ 
          time: 60000,
          filter: i => i.customId.startsWith('theme_')
        });
          
        collector.on('collect', async i => {
          // Check if the interaction is from the command author
          if (i.user.id !== message.author.id) {
            const errorContainer = new ContainerBuilder()
              .setAccentColor(currentTheme.color ? (typeof currentTheme.color === 'string' ? parseInt(currentTheme.color.replace('#', '0x'), 16) : currentTheme.color) : 0xFF0000)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent('***Only the command initiator can select a theme.***')
              );
            return i.reply({ 
              components: [errorContainer], 
              flags: [MessageFlags.IsComponentsV2, 64] 
            });
          }
          
          // Extract selected theme from button ID
          const selectedTheme = i.customId.split('_')[1];
          
          try {
            // Set the new theme
            await themeManager.setTheme(guildId, selectedTheme);
            const updatedTheme = themeManager.themes[selectedTheme];
            
            // Show success message
            const successContainer = new ContainerBuilder()
              .setAccentColor(updatedTheme.color ? (typeof updatedTheme.color === 'string' ? parseInt(updatedTheme.color.replace('#', '0x'), 16) : updatedTheme.color) : 0x00FF00)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`## Theme Updated\n\nThe bot theme has been updated to **${selectedTheme}**.`)
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(updatedTheme.footer || 'Theme updated successfully')
              );
              
            await i.update({ 
              components: [successContainer], 
              flags: [MessageFlags.IsComponentsV2] 
            });
            collector.stop();
          } catch (error) {
            console.error('Error updating theme from button:', error);
            const errorContainer = new ContainerBuilder()
              .setAccentColor(currentTheme.color ? (typeof currentTheme.color === 'string' ? parseInt(currentTheme.color.replace('#', '0x'), 16) : currentTheme.color) : 0xFF0000)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent('***An error occurred while changing the theme.***')
              );
            await i.update({ 
              components: [errorContainer], 
              flags: [MessageFlags.IsComponentsV2] 
            });
            collector.stop();
          }
        });
          
        // Clean up buttons after collector ends
        collector.on('end', () => {
          if (!reply.deleted) {
            reply.edit({ components: [] }).catch(err => 
              console.error('Error removing buttons after timeout:', err)
            );
          }
        });
          
        return;
      }
      
      // If a valid theme is provided in the command
      try {
        await themeManager.setTheme(guildId, theme);
        const updatedTheme = themeManager.themes[theme];
        
        const container = new ContainerBuilder()
          .setAccentColor(updatedTheme.color ? (typeof updatedTheme.color === 'string' ? parseInt(updatedTheme.color.replace('#', '0x'), 16) : updatedTheme.color) : 0x00FF00)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`## Theme Updated\n\nThe bot theme has been updated to **${theme}**.`)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(updatedTheme.footer || 'Theme updated successfully')
          );
        await message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      } catch (themeError) {
        console.error('Error setting theme:', themeError);
        const errorContainer = new ContainerBuilder()
          .setAccentColor(currentTheme.color ? (typeof currentTheme.color === 'string' ? parseInt(currentTheme.color.replace('#', '0x'), 16) : currentTheme.color) : 0xFF0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***Failed to set theme to "${theme}". Please try again.***`)
          );
        await message.reply({ 
          components: [errorContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
      
    } catch (error) {
      console.error('Error in theme command:', error);
      
      // Use a default color in case theme is undefined in the error handler
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent('***An error occurred while processing the theme command.***')
        );
        
      await message.reply({ 
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  },
};