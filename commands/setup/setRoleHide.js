const { ContainerBuilder, TextDisplayBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');
const themeManager = require('../../utils/themeManager');

module.exports = {
  name: 'rolehide',
  description: 'Set a role for hiding/showing channels',
  category: 'setup',
  async execute(message, args) {
    // Check if user has admin permissions
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const theme = await themeManager.getTheme(message.guild.id);
      const errorContainer = new ContainerBuilder()
        .setAccentColor(theme.color ? (typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color) : 0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.no || '❌'}・You need Administrator permissions to use this command.***`)
        );
      return message.reply({ 
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const theme = await themeManager.getTheme(message.guild.id);
    const roleInput = args[0];
    
    // Handle case when no role is provided
    if (!roleInput) {
      const container = new ContainerBuilder()
        .setAccentColor(theme.color ? (typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color) : 0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.no || '❌'}・Please provide a role ID or mention (e.g., \`@RoleName\`).***`)
        );
      return message.reply({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    let role;
    // Handle role mention format
    if (roleInput.startsWith('<@&') && roleInput.endsWith('>')) {
      const roleId = roleInput.slice(3, -1);
      role = message.guild.roles.cache.get(roleId);
    } else {
      // Handle direct role ID
      role = message.guild.roles.cache.get(roleInput);
    }

    // Handle invalid role
    if (!role) {
      const container = new ContainerBuilder()
        .setAccentColor(theme.color ? (typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color) : 0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.no || '❌'}・Could not find a role with the ID or mention provided.***`)
        );
      return message.reply({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    try {
      // Update or create guild configuration with the role ID
      await GuildConfig.findOneAndUpdate(
        { guildId: message.guild.id },
        { hideShowRoleId: role.id },
        { upsert: true, new: true }
      );

      // Success message with proper role mention
      const successContainer = new ContainerBuilder()
        .setAccentColor(theme.color ? (typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color) : 0x00FF00)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.yes || '✅'}・Hide/Show role set to **${role.name}** (<@&${role.id}>)!***`)
        );
      await message.reply({ 
        components: [successContainer],
        flags: [MessageFlags.IsComponentsV2]
      });
    } catch (error) {
      console.error('Error updating guild configuration:', error);
      const errorContainer = new ContainerBuilder()
        .setAccentColor(theme.color ? (typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color) : 0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.no || '❌'}・An error occurred while setting the role. Please try again later.***`)
        );
      await message.reply({ 
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  },
};