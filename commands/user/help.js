const { 
  ContainerBuilder, 
  TextDisplayBuilder,
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuOptionBuilder, 
  SeparatorBuilder, 
  SeparatorSpacingSize, 
  MessageFlags, 
  ComponentType,
  StringSelectMenuBuilder,
  ThumbnailBuilder,
  SectionBuilder
} = require('discord.js');
const themeManager = require('../../utils/themeManager');
const config = require('../../utils/config');
const prefix = config.prefix;
const cooldownHandler = require("../../events/cooldown");

// Enhanced categories with more detailed information
const categories = {
  setup: {
    name: 'Setup Commands',
    emoji: '📁',
    description: 'Essential commands to configure and customize your server settings',
    commands: [
      { name: `\`${prefix}setup\``, description: 'Complete initial bot setup for your server', usage: `${prefix}setup` },
      { name: `\`${prefix}rejected\``, description: 'Configure the rejected channel for moderation', usage: `${prefix}rejected #channel` },
      { name: `\`${prefix}reset\``, description: 'Reset all guild configurations to default', usage: `${prefix}reset` },
      { name: `\`${prefix}events-category\``, description: 'Set category for event voice channels', usage: `${prefix}events-category [category]` },
      { name: `\`${prefix}theme\``, description: 'Customize bot embed colors and appearance', usage: `${prefix}theme [color]` },
      { name: `\`${prefix}rolehide\``, description: 'Set role that can hide voice channels', usage: `rolehide @role` },
      { name: `\`${prefix}rolestaff\``, description: 'Configure staff roles with admin privileges', usage: `rolestaff @role` },
      { name: `\`${prefix}showconfig\``, description: 'Display current server configuration', usage: `showconfig` },
      { name: `\`${prefix}updatesetup\``, description: 'Update existing bot configuration', usage: `updatesetup` },
    ],
  },
  user: {
    name: 'User Commands',
    emoji: '📁',
    description: 'General commands available to all server members',
    commands: [
      { name: `\`${prefix}help\``, description: 'Display this comprehensive help menu', usage: `${prefix}help [command]` },
      { name: `\`${prefix}ping\``, description: 'Check bot latency and connection status', usage: `${prefix}ping` },
      { name: `\`${prefix}man-add\``, description: 'Add trusted users to your voice manager', usage: `man-add @user` },
      { name: `\`${prefix}man-remove\``, description: 'Remove users from your voice manager', usage: `man-remove @user` },
      { name: `\`${prefix}man-list\``, description: 'View all users in your voice manager', usage: `man-list` },
      { name: `\`${prefix}man-clear\``, description: 'Clear all users from voice manager', usage: `man-clear` },
    ],
  },
  voice: {
    name: 'Voice Commands',
    emoji: '📁',
    description: 'Advanced voice channel management and control features',
    commands: [
      { name: `\`${prefix}panel\``, description: 'Create interactive voice control panel', usage: `panel` },
      { name: `\`${prefix}claim\``, description: 'Claim ownership of an abandoned voice channel', usage: `claim` },
      { name: `\`${prefix}limit\``, description: 'Set maximum user limit for voice channel', usage: `limit [number]` },
      { name: `\`${prefix}lock\``, description: 'Lock voice channel from new users', usage: `lock` },
      { name: `\`${prefix}unlock\``, description: 'Unlock voice channel for everyone', usage: `unlock` },
      { name: `\`${prefix}name\``, description: 'Change voice channel name', usage: `name [new name]` },
      { name: `\`${prefix}owner\``, description: 'Check current voice channel owner', usage: `owner` },
      { name: `\`${prefix}permit\``, description: 'Grant user access to voice channel', usage: `permit @user` },
      { name: `\`${prefix}reject\``, description: 'Deny user access to voice channel', usage: `reject @user` },
      { name: `\`${prefix}permitall\``, description: 'Grant access to all server members', usage: `permitall` },
      { name: `\`${prefix}tlock\``, description: 'Lock voice channel text chat', usage: `tlock` },
      { name: `\`${prefix}tunlock\``, description: 'Unlock voice channel text chat', usage: `tunlock` },
      { name: `\`${prefix}transfer\``, description: 'Transfer channel ownership to another user', usage: `transfer @user` },
      { name: `\`${prefix}hide\``, description: 'Hide voice channel from others', usage: `hide` },
      { name: `\`${prefix}unhide\``, description: 'Make voice channel visible again', usage: `unhide` },
      { name: `\`${prefix}permitrole\``, description: 'Grant role access to voice channel', usage: `permitrole @role` },
      { name: `\`${prefix}rejectrole\``, description: 'Deny role access to voice channel', usage: `rejectrole @role` },
      { name: `\`${prefix}kick\``, description: 'Remove user from voice channel', usage: `kick @user` },
      { name: `\`${prefix}sb\``, description: 'Toggle soundboard permissions', usage: `sb [on/off]` },
      { name: `\`${prefix}cam\``, description: 'Toggle camera/streaming permissions', usage: `cam [on/off]` },
      { name: `\`${prefix}activity\``, description: 'Toggle voice activities permissions', usage: `activity [on/off]` },
      { name: `\`${prefix}vcinfo\``, description: 'Display detailed voice channel information', usage: `vcinfo` },
      { name: `\`${prefix}fm\``, description: 'Force mute all users in voice channel', usage: `fm` },
      { name: `\`${prefix}unfm\``, description: 'Force unmute all users in voice channel', usage: `unfm` },
      { name: `\`${prefix}top\``, description: 'Move voice channel to top of category', usage: `top` },
      { name: `\`${prefix}event\``, description: 'Move channel to events category', usage: `event` },
      { name: `\`${prefix}vcreset\``, description: 'Reset temporary voice channel settings', usage: `vcreset` },
    ],
  },
  blacklist: {
    name: 'Commands',
    emoji: '📁',
    description: 'Manage users who are permanently blocked from your voice channels',
    commands: [
      { name: `\`${prefix}bl-add\``, description: 'Add user to voice channel blacklist', usage: `bl-add @user [reason]` },
      { name: `\`${prefix}bl-remove\``, description: 'Remove user from voice blacklist', usage: `bl-remove @user` },
      { name: `\`${prefix}bl-list\``, description: 'View all blacklisted users', usage: `bl-list` },
      { name: `\`${prefix}bl-clear\``, description: 'Clear entire voice blacklist', usage: `bl-clear` },
    ],
  },
  whitelist: {
    name: 'Whitelist Commands',
    emoji: '📁',
    description: 'Manage users who always have access to your voice channels',
    commands: [
      { name: `\`${prefix}wl-add\``, description: 'Add user to voice channel whitelist', usage: `wl-add @user` },
      { name: `\`${prefix}wl-remove\``, description: 'Remove user from voice whitelist', usage: `wl-remove @user` },
      { name: `\`${prefix}wl-list\``, description: 'View all whitelisted users', usage: `wl-list` },
      { name: `\`${prefix}wl-clear\``, description: 'Clear entire voice whitelist', usage: `wl-clear` },
    ],
  },
};

// Utility functions
const sendEmbed = (message, content, color = '#0099ff', ephemeral = false) => {
  const container = new ContainerBuilder()
    .setAccentColor(typeof color === 'string' ? parseInt(color.replace('#', '0x'), 16) : 0x0099ff)
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(content)
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder()
        .setURL(message.guild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
    );
  
  const options = { components: [container], flags: [MessageFlags.IsComponentsV2] };
  if (ephemeral) options.ephemeral = true;
  
  return message.channel.send(options);
};

const createCategoryContainer = (category, theme, user, guild) => {
  const commandsPerPage = 10;
  const totalCommands = category.commands.length;
  const totalPages = Math.ceil(totalCommands / commandsPerPage);
  
  const container = new ContainerBuilder()
    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## ***${category.name}***

***${category.description}***

${category.commands.map((cmd, index) => 
              `***${index + 1}.*** ${cmd.name}
***${cmd.description}***
\`Usage:\` ***${cmd.usage}***
`
            ).join('\n')}`)
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder()
            .setURL(guild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
        )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(`Requested by ${user.tag} - ${totalCommands} commands available`)
    );
  
  return container;
};

const createSelectMenu = () => {
  return new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('Choose a command category to explore')
    .addOptions(
      Object.keys(categories).map(key => ({
        label: categories[key].name,
        description: categories[key].description.substring(0, 100),
        value: key,
        emoji: categories[key].emoji,
      }))
    );
};

module.exports = {
  name: 'help',
  description: 'Display comprehensive help menu with all available commands',
  category: "user",
  cooldown: 5,
  aliases: ['h', 'commands', 'cmd', 'cmds'],
  usage: `${prefix}help [command/category]`,
  
  async execute(message, args, client) {
    try {
      // DM check
      if (!message.guild) {
        const container = new ContainerBuilder()
          .setAccentColor(0xff6b6b)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('## ❌ Server Only Command\n\nThis command can only be used in a server, not in direct messages.')
          );
        return message.reply({ 
          components: [container],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const guildId = message.guild.id;
      const member = message.author;
      
      // Enhanced theme handling
      let theme;
      try {
        theme = await themeManager.getTheme(guildId);
        if (!theme || !theme.color) {
          theme = { 
            color: '#5865f2', 
            name: 'Default',
            accent: '#4752c4'
          };
        }
      } catch (err) {
        console.error('Theme fetch error:', err);
        theme = { color: '#5865f2', name: 'Default', accent: '#4752c4' };
      }

      // Enhanced cooldown system
      const timeLeft = cooldownHandler.checkCooldown("help", message.author.id, 5);
      if (timeLeft) {
        try {
          await message.delete().catch(() => {});
        } catch (err) {
          console.log('Message already deleted or no permission');
        }
        
        const cooldownContainer = new ContainerBuilder()
          .setAccentColor(0xffaa00)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`## ***Command Cooldown***
            
***Please wait ${timeLeft} seconds before using this command again.***`)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***This helps prevent spam and keeps the bot responsive***`)
          );
        
        const cooldownMsg = await message.channel.send({ 
          components: [cooldownContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
        setTimeout(() => {
          cooldownMsg.delete().catch(() => {});
        }, 5000);
        return;
      }

      cooldownHandler.applyCooldown("help", message.author.id, 5);

      // Check for specific command help
      if (args.length > 0) {
        const query = args[0].toLowerCase();
        
        // Check if it's a category
        if (categories[query]) {
          const categoryContainer = createCategoryContainer(categories[query], theme, member, message.guild);
          return message.channel.send({ 
            components: [categoryContainer],
            flags: [MessageFlags.IsComponentsV2]
          });
        }
        
        // Search for specific command across all categories
        let foundCommand = null;
        let foundCategory = null;
        
        for (const [catKey, category] of Object.entries(categories)) {
          const command = category.commands.find(cmd => 
            cmd.name.toLowerCase().includes(query) || 
            cmd.name.replace(/`/g, '').toLowerCase().includes(query)
          );
          if (command) {
            foundCommand = command;
            foundCategory = category.name;
            break;
          }
        }
        
        if (foundCommand) {
          const commandContainer = new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`## ***Command: ${foundCommand.name}***

***Description:*** ${foundCommand.description}
***Usage:*** \`${foundCommand.usage}\`
***Category:*** ${foundCategory}`)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`Requested by ${member.tag}`)
            );
          
          return message.channel.send({ 
            components: [commandContainer],
            flags: [MessageFlags.IsComponentsV2]
          });
        }
      }

      // Enhanced main help container
      const totalCommands = Object.values(categories).reduce((sum, cat) => sum + cat.commands.length, 0);
      
      const mainContainer = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## ***${client.user.username} Command Center***
+
+***__Tips:__***
+- ***Use the dropdown menu below to explore categories***
+
+- ***Type \`${prefix}help [command]\` for detailed command info***
+
+- ***Need setup help?*** Contact the developer for support ***Start with \`${prefix}setup\`***`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        // Add buttons first
      // Enhanced button row
      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('help_quick_setup')
          .setLabel('Quick Setup')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📁'),
        new ButtonBuilder()
          .setCustomId('help_popular_commands')
          .setLabel('Popular Commands')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📁'),
        new ButtonBuilder()
          .setCustomId('help_support')
          .setLabel('Get Support')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📁'),
      );

      // Select menu row
      const selectRow = new ActionRowBuilder().addComponents(createSelectMenu());
      // Send enhanced help message
      const helpMessage = await message.channel.send({ 
        components: [mainContainer.addActionRowComponents(selectRow).addActionRowComponents(buttonRow)],
        flags: [MessageFlags.IsComponentsV2]
      });

      // Enhanced interaction collector
      const filter = (interaction) => interaction.user.id === message.author.id;
      const collector = helpMessage.createMessageComponentCollector({ 
        filter, 
        time: 300000 // 5 minutes
      });

      collector.on('collect', async (interaction) => {
        try {
          if (interaction.isStringSelectMenu()) {
            const selectedCategory = categories[interaction.values[0]];
            if (selectedCategory) {
              const categoryContainer = new ContainerBuilder()
                .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`## ***${selectedCategory.name}***

***${selectedCategory.description}***

${selectedCategory.commands.map((cmd, index) => 
                      `***${index + 1}.*** ${cmd.name}
***${cmd.description}***
\`Usage:\` ***${cmd.usage}***
`
                    ).join('\n')}`)
                )
                .addTextDisplayComponents(
                  new TextDisplayBuilder()
                    .setContent(`Requested by ${interaction.user.tag} - ${selectedCategory.commands.length} commands available`)
                );
              await interaction.reply({ 
                components: [categoryContainer], 
                flags: [MessageFlags.IsComponentsV2, 64] 
              });
            }
          } else if (interaction.isButton()) {
            switch (interaction.customId) {
              case 'help_quick_setup':
                const setupContainer = new ContainerBuilder()
                  .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                  .addTextDisplayComponents(
                    new TextDisplayBuilder()
                      .setContent(`## Quick Setup Guide

__Getting started with ${client.user.username}:__

` +
                        `- Run \`${prefix}setup\` to begin initial configuration\n` +
                        `- Set your theme with \`${prefix}theme\`\n` +
                        `- Configure staff roles using \`${prefix}rolestaff\`\n` +
                        `- Set up event categories with \`${prefix}events-category\`\n` +
                        `- Create your first voice panel with \`${prefix}panel\`\n\n` +
                        `**Need help?** Contact the developer for support`)
                  );
                await interaction.reply({ 
                  components: [setupContainer], 
                  flags: [MessageFlags.IsComponentsV2, 64] 
                });
                break;
                
              case 'help_popular_commands':
                const popularContainer = new ContainerBuilder()
                  .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                  .addTextDisplayComponents(
                    new TextDisplayBuilder()
                      .setContent(`## Most Popular Commands\n` +
                        `__Voice Management:__\n` +
                        `- \`${prefix}panel\` - Create voice control panel\n` +
                        `- \`${prefix}lock\` / \`${prefix}unlock\` - Control access\n` +
                        `- \`${prefix}limit\` - Set user limits\n` +
                        `__User Management:__\n` +
                        `- \`${prefix}permit\` / \`${prefix}reject\` - Manage access\n` +
                        `- \`${prefix}kick\` - Remove users\n` +
                        `- \`${prefix}transfer\` - Change ownership\n` +
                        `__Customization:__\n` +
                        `- \`${prefix}name\` - Rename channels\n` +
                        `- \`${prefix}hide\` / \`${prefix}unhide\` - Toggle visibility\n` +
                        `- \`${prefix}theme\` - Customize appearance`)
                  );
                await interaction.reply({ 
                  components: [popularContainer], 
                  flags: [MessageFlags.IsComponentsV2, 64] 
                });
                break;
                
              case 'help_support':
                const supportContainer = new ContainerBuilder()
                  .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                  .addTextDisplayComponents(
                    new TextDisplayBuilder()
                      .setContent(`## Get Support & Help\n\n` +
                        `__Need immediate help?__\n` +
                        `- Contact the developer for support\n\n` +
                        `__Common Solutions:__\n` +
                        `- Bot not responding? Check permissions\n` +
                        `- Commands not working? Verify your prefix\n` +
                        `- Voice issues? Run \`${prefix}vcreset\`\n\n` +
                        `__Report Bugs:__\n` +
                        `- Found an issue? Report it in our support server!\n\n` +
                        `__Feature Requests:__\n` +
                        `- Have ideas? We'd love to hear them in our community!`)
                  );
                await interaction.reply({ 
                  components: [supportContainer], 
                  flags: [MessageFlags.IsComponentsV2, 64] 
                });
                break;
            }
          }
        } catch (error) {
          console.error('Interaction handling error:', error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
              content: '❌ An error occurred while processing your request. Please try again.', 
              flags: 64 
            }).catch(() => {});
          }
        }
      });

      // Enhanced collector end handling
      collector.on('end', async () => {
        try {
          const disabledSelectRow = new ActionRowBuilder().addComponents(
            StringSelectMenuBuilder.from(selectRow.components[0]).setDisabled(true)
          );
          
          const disabledButtonRow = new ActionRowBuilder().addComponents(
            ...buttonRow.components.map(button => {
              if (button.data.style === ButtonStyle.Link) return button;
              return ButtonBuilder.from(button).setDisabled(true);
            })
          );

          const expiredContainer = new ContainerBuilder()
            .setAccentColor(0x6c757d)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`## ***${client.user.username} Command Center***
+
+***__Tips:__***
+- ***Use the dropdown menu below to explore categories***
+
+- ***Type \`${prefix}help [command]\` for detailed command info***
+
+- ***Need setup help?*** Contact the developer for support ***Start with \`${prefix}setup\`***`)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`***This help menu has expired. Use the command again to view it.***`)
            );

          if (helpMessage) {
            await helpMessage.edit({ 
              components: [expiredContainer.addActionRowComponents(disabledSelectRow).addActionRowComponents(disabledButtonRow)],
              flags: [MessageFlags.IsComponentsV2]
            }).catch(err => {
              if (err.code !== 10008 && err.code !== 'ChannelNotCached') {
                console.error('Error removing buttons after timeout:', err);
              }
              // Silently ignore if message was deleted or channel not cached
            });
          }
        } catch (error) {
          console.error('Failed to disable help menu components:', error);
        }
      });

    } catch (error) {
      console.error('Critical error in help command:', error);
      
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xdc3545)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## ***❌ Command Error***

***An unexpected error occurred while loading the help menu. Please try again in a moment.***`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***If this persists, please contact support***`)
        );

      try {
        await message.channel.send({ 
          components: [errorContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      } catch (sendError) {
        console.error('Failed to send error message:', sendError);
      }
    }
  },
};