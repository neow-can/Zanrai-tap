const { ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');
const themeManager = require('../../utils/themeManager');
const emojis = require('../../utils/emojies');
const { prefix } = require('../../utils/config');

module.exports = {
  name: 'showconfig',
  description: 'Show the current guild configuration',
  category: 'setup',
  async execute(message, args) {
    const guildId = message.guild.id;
    const theme = await themeManager.getTheme(guildId);
    const config = await GuildConfig.findOne({ guildId });

    if (!config) {
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.info}・No configuration found for this guild.***`)
        );
      return message.reply({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    const container = new ContainerBuilder()
      .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`***# Guild Configuration***

***\`\`\`prolog
Click To Show Server Config
\`\`\`***`)
      );


    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Roles Config')
        .setCustomId('role')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel('Channels Config')
        .setCustomId('channels')
        .setStyle(ButtonStyle.Secondary),
    );

    const reply = await message.channel.send({ 
      components: [container.addActionRowComponents(row)],
      flags: [MessageFlags.IsComponentsV2]
    });
    const filter = (interaction) => interaction.user.id === message.author.id;
    const collector = reply.createMessageComponentCollector({ filter, time: 60000 }); 

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'role') {
        const rolesContainer = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`## Roles Configuration

**${emojis.dot} Hide/Show Role:** ${config.hideShowRoleId ? `<@&${config.hideShowRoleId}>` : `\`${prefix} rolehide\``}

**${emojis.dot} Staff Roles:** ${config.staffroleId && config.staffroleId.length > 0 ? config.staffroleId.map(roleId => `<@&${roleId}>`).join('') : `\`${prefix} rolestaff <Role>\``}`)
          );

        await interaction.update({ 
          components: [rolesContainer.addActionRowComponents(row)],
          flags: [MessageFlags.IsComponentsV2]
        });
      } else if (interaction.customId === 'channels') {
        const channelsContainer = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`## Channels Configuration

**${emojis.dot} One Tap Channel:** ${config.voiceChannelId ? `<#${config.voiceChannelId}>` : `\`${prefix} setup\``}

**${emojis.dot} One Tap Category:** ${config.categoryId ? `<#${config.categoryId}>` : `\`${prefix} setup\``}

**${emojis.dot} Rejected Voice:** ${config.rejectedVoiceChannelId ? `<#${config.rejectedVoiceChannelId}>` : `\`${prefix} rejected\``}

**${emojis.dot} Events Category:** ${config.eventsCategoryId ? `<#${config.eventsCategoryId}>` : `\`${prefix} events-category\``}

**${emojis.dot} Second Category:** ${config.backupCategoryId ? `<#${config.backupCategoryId}>` : `\`${prefix} second-category\``}

**${emojis.dot} Theme:** ${config.theme ? config.theme : `\`${prefix} theme\``}`)
          );

        await interaction.update({ 
          components: [channelsContainer.addActionRowComponents(row)],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        ...row.components.map(button =>
          new ButtonBuilder()
            .setCustomId(button.data.custom_id)
            .setLabel(button.data.label)
            .setStyle(button.data.style)
            .setDisabled(true)
        )
      );
      reply.edit({ 
        components: [disabledRow],
        flags: [MessageFlags.IsComponentsV2]
      }).catch(() => {});
    });
  },
};