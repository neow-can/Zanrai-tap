const { PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, MediaGalleryBuilder, SectionBuilder, ThumbnailBuilder, SeparatorBuilder } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');
const themeManager = require('../../utils/themeManager');
const emojis = require('../../utils/emojies.json');
const config = require('../../utils/config');

module.exports = {
  name: 'setup',
  description: 'Set up the server with categories and channels',
  category: 'setup',
  async execute(message, args) {
    try {
      // Check if user has admin permissions
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const theme = await themeManager.getTheme(message.guild.id);
        const errorContainer = new ContainerBuilder()
          .setAccentColor(theme?.color ? (typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color) : 0xFF0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${theme?.emojis?.no || '❌'}・You need Administrator permissions to set up the bot.***`)
          );
        return message.reply({ 
          components: [errorContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }

      const guild = message.guild;
      const theme = await themeManager.getTheme(guild.id) || { color: '#0099FF' };
      
      // Ensure theme emojis exist or use fallbacks
      const themeEmojis = theme.emojis || {};
      const infoEmoji = themeEmojis.info || emojis.info || 'ℹ️';
      const yesEmoji = themeEmojis.yes || emojis.yes || '✅';
      const errorEmoji = themeEmojis.error || emojis.error || '❌';
      // NOTE: Custom emojis like "<:settings_bla:1393719358798168075>" will only show if:
      // 1. The emoji exists and is not deleted.
      // 2. The bot is in the server where the emoji is uploaded.
      // 3. The emoji is not restricted by role or permission.
      // If the emoji does not show, check these points or use a Unicode emoji as fallback.
      const settingsEmoji = emojis.settings || "⚙";
    
      // Check if server is already set up
      const existingConfig = await GuildConfig.findOne({ guildId: guild.id });
      if (existingConfig && existingConfig.categoryId) {
        // Verify if the channels still exist
        const categoryExists = guild.channels.cache.get(existingConfig.categoryId);
        const voiceChannelExists = existingConfig.voiceChannelId ? 
          guild.channels.cache.get(existingConfig.voiceChannelId) : null;
        
        if (categoryExists) {
          const container = new ContainerBuilder()
            .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent(`***${infoEmoji}・This server is already set up! Use \`reset\` command if you want to set up again.***`)
            );
          return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        }
        // If channels don't exist, continue with setup and update the config
      }
      
      // Send initial setup message
      const setupContainer = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${settingsEmoji}・Setting up channels and categories...***`)
        );
      const setupMessage = await message.reply({ 
        components: [setupContainer],
        flags: [MessageFlags.IsComponentsV2]
      });
      
      try {
        // Create category
        const category = await guild.channels.create({
          name: '𝑳𝒎𝒐𝒙 𝑻𝒂𝒑 :',
          type: 4, // CategoryChannel
          permissionOverwrites: [
            {
              id: guild.id,
              allow: [PermissionFlagsBits.ViewChannel]
            }
          ]
        });
        
        // Create interface text channel
        const panelChannel = await guild.channels.create({
          name: '☰・𝑰𝒏𝒕𝒆𝒓𝒇𝒂𝒄𝒆',
          type: 0, // TextChannel
          parent: category.id,
          permissionOverwrites: [
            {
              id: guild.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
              deny: [PermissionFlagsBits.SendMessages]
            }
          ]
        });

        // Create logs channel (private)
        const logChannel = await guild.channels.create({
          name: '🥢・𝘨𝘶𝘪𝘥𝘦ᐟ',
          type: 0, // TextChannel
          parent: category.id,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: message.client.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            }
          ]
        });

        // Create voice channel
        const voiceChannel = await guild.channels.create({
          name: '☁️・𝑪2𝑻  ˎˊ˗',
          type: 2, // VoiceChannel
          parent: category.id,
          userLimit: 1,
          permissionOverwrites: [
            {
              id: guild.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
            }
          ]
        });
        
        // Create leaderboard channel
        const leaderboardChannel = await guild.channels.create({
          name: '🏆ᐟ𝑳𝒆𝒂𝒅𝒆𝒓𝒃𝒐𝒂𝒓𝒅',
          type: 0, // TextChannel
          parent: category.id,
          permissionOverwrites: [
            {
              id: guild.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
              deny: [PermissionFlagsBits.SendMessages]
            }
          ]
        });
        
        // Create or update guild configuration
        let guildConfig;
        if (existingConfig) {
          existingConfig.categoryId = category.id;
          existingConfig.voiceChannelId = voiceChannel.id;
          existingConfig.panelChannelId = panelChannel.id;
          existingConfig.logChannelId = logChannel.id;
          existingConfig.leaderboardChannelId = leaderboardChannel.id;
          guildConfig = await existingConfig.save();
        } else {
          guildConfig = new GuildConfig({
            guildId: guild.id,
            categoryId: category.id,
            voiceChannelId: voiceChannel.id,
            panelChannelId: panelChannel.id,
            logChannelId: logChannel.id,
            leaderboardChannelId: leaderboardChannel.id
          });
          await guildConfig.save();
        }
        
        // Create button rows
        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('lock_button')
            .setEmoji(themeEmojis.lock || '🔓')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('unlock_button')
            .setEmoji(themeEmojis.unlock || '🔒')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('hide_button')
            .setEmoji(themeEmojis.hide || '👁️')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('unhide_button')
            .setEmoji(themeEmojis.show || '🔍')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('claim_button')
            .setEmoji(themeEmojis.owner || '👑')
            .setStyle(ButtonStyle.Secondary),
        );
        
        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('owner_button')
            .setEmoji(themeEmojis.owner || '👑')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('vcreset_button')
            .setEmoji(themeEmojis.transfer || '🔄')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('limit_button')
            .setEmoji(themeEmojis.limit || '👥')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('name_button')
            .setEmoji(themeEmojis.name || '✏️')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('info_button')
            .setEmoji(themeEmojis.info || 'ℹ️')
            .setStyle(ButtonStyle.Secondary),
        );
        
        // Create panel container instead of embed
// Create panel container instead of embed
const panelContainer = new ContainerBuilder()
  .setAccentColor(typeof (theme.color || '#0099FF') === 'string' ? parseInt((theme.color || '#0099FF').replace('#', '0x'), 16) : (theme.color || 0x0099FF))
  .addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent('***## Voice Channel Manager***\n' +
            '***- Use the buttons below to control your voice channel***\n' +
            '***- Type `.v help` for more help topics***\n' +
            '***- Your channel will be automatically deleted when everyone leaves***\n' +
            '***- Need help? Contact the developer for support***')
      )
      .setThumbnailAccessory(
        new ThumbnailBuilder()
          .setURL(guild.iconURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
      )
  )

  // فاصل بين الكلام والصورة
  .addSeparatorComponents(new SeparatorBuilder());

// Add theme image if available
if (theme.image && theme.image.length > 0) {
  const mediaGallery = new MediaGalleryBuilder().addItems([
    { media: { url: theme.image } }
  ]);
  panelContainer.addMediaGalleryComponents(mediaGallery);
}


// فاصل بين الصورة والأزرار
  panelContainer.addSeparatorComponents(new SeparatorBuilder())

// Add action buttons
panelContainer
  .addActionRowComponents(row1)
  .addActionRowComponents(row2)
  .addSeparatorComponents(new SeparatorBuilder())
  .addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent(`***${guild.name} • <t:${Math.floor(Date.now()/1000)}:F>***`)
  );

        await panelChannel.send({ 
          components: [panelContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
        
        // Create leaderboard container
        const leaderboardContainer = new ContainerBuilder()
          .setAccentColor(typeof (theme.color || '#0099FF') === 'string' ? parseInt((theme.color || '#0099FF').replace('#', '0x'), 16) : (theme.color || 0x0099FF))
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('***# Voice Channel Leaderboard***\n' +
                '***- Join voice channels to earn time and climb the ranks!***\n' +
                '***- Use `.v leaderboard` or `.v lb` to view the full leaderboard.***')
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('show_my_rank')
                .setLabel('Show My Rank')
                .setStyle(ButtonStyle.Secondary)
            )
          );

        // Send the leaderboard message and store its ID
        const leaderboardMessage = await leaderboardChannel.send({ 
          components: [leaderboardContainer],
          flags: [MessageFlags.IsComponentsV2]
        });

        // Update guild config with leaderboard message ID
        if (existingConfig) {
          existingConfig.leaderboardMessageId = leaderboardMessage.id;
          await existingConfig.save();
        } else {
          guildConfig.leaderboardMessageId = leaderboardMessage.id;
          await guildConfig.save();
        }

        // Send success message
        const successContainer = new ContainerBuilder()
          .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color);
        
        // Add server icon as thumbnail at top-left
        if (guild.iconURL()) {
          successContainer.addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent('\u200b')
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder()
                  .setURL(guild.iconURL({ dynamic: true, size: 1024 }))
              )
          );
        }
        
        successContainer
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(
                `***## Setup Completed***
***${yesEmoji}・Setup completed successfully!***

***Created Channels:***
***• __Category:__ \`${category.name}\`***
***• __Text Channel:__ <#${panelChannel.id}> (Panel has been created)***
***• __Voice Channel:__ <#${voiceChannel.id}>***
***• __Logs Channel:__ <#${logChannel.id}>***
***• __Leaderboard Channel:__ <#${leaderboardChannel.id}>***

***The control panel has been automatically sent to the interface channel.***
***Contact the developer for any bugs or help.***`)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent('***Use the voice channel to create your own channels.***')
          );
        
        await setupMessage.edit({ 
          components: [successContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      } catch (error) {
        console.error('Setup error:', error);
        
        // Handle specific error types
        let errorMessage = error.message;
        if (error.code === 50013) {
          errorMessage = "I don't have enough permissions to create channels. Please give me 'Manage Channels' permission.";
        }
        
        const errorContainer = new ContainerBuilder()
          .setAccentColor(theme?.color ? (typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color) : 0xFF0000)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`***${errorEmoji}・Setup failed: ${errorMessage}***`)
          );
        await setupMessage.edit({ 
          components: [errorContainer],
          flags: [MessageFlags.IsComponentsV2]
        });
      }
    } catch (globalError) {
      console.error('Global setup error:', globalError);
      // Handle uncaught errors
      const errorContainer = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***❌・An unexpected error occurred: ${globalError.message}***`)
        );
      await message.reply({ 
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2]
      }).catch(console.error);
    }
  },
  registerLogsEvents: (client) => {
    const { Events, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
    const GuildConfig = require('../../models/GuildConfig');
    const prefix = '.v'; // Change the prefix according to your bot

    // Log command usage
    client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot || !message.guild) return;
      if (!message.content.startsWith(prefix)) return;
      const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
      if (!guildConfig?.logChannelId) return;
      const logChannel = message.guild.channels.cache.get(guildConfig.logChannelId);
      if (!logChannel) return;
      const container = new ContainerBuilder()
        .setAccentColor(0x3498db)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## 📥 Command Used\n\n**${message.author.tag}** used the command: \`${message.content}\``)
        );
      logChannel.send({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    });

    // Log message deletion
    client.on(Events.MessageDelete, async (message) => {
      if (message.partial || !message.guild || message.author?.bot) return;
      const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
      if (!guildConfig?.logChannelId) return;
      const logChannel = message.guild.channels.cache.get(guildConfig.logChannelId);
      if (!logChannel) return;
      const container = new ContainerBuilder()
        .setAccentColor(0xe74c3c)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## 🗑️ Message Deleted\n\n**${message.author.tag}**\n${message.content || '*Content not available*'}`)
        );
      logChannel.send({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    });

    // Log message edit
    client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
      if (oldMsg.partial || !oldMsg.guild || oldMsg.author?.bot) return;
      if (oldMsg.content === newMsg.content) return;
      const guildConfig = await GuildConfig.findOne({ guildId: oldMsg.guild.id });
      if (!guildConfig?.logChannelId) return;
      const logChannel = oldMsg.guild.channels.cache.get(guildConfig.logChannelId);
      if (!logChannel) return;
      const container = new ContainerBuilder()
        .setAccentColor(0xf1c40f)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***## ✏️ Message Edited***

***${oldMsg.author.tag}***
***Before: ${oldMsg.content}***
***After: ${newMsg.content}***`)
        );
      logChannel.send({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    });

    // Log member join
    client.on(Events.GuildMemberAdd, async (member) => {
      const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id });
      if (!guildConfig?.logChannelId) return;
      const logChannel = member.guild.channels.cache.get(guildConfig.logChannelId);
      if (!logChannel) return;
      const container = new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## ✅ Member Joined\n\n**${member.user.tag}** (${member.id}) joined the server.`)
        );
      logChannel.send({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    });

    // Log member leave
    client.on(Events.GuildMemberRemove, async (member) => {
      const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id });
      if (!guildConfig?.logChannelId) return;
      const logChannel = member.guild.channels.cache.get(guildConfig.logChannelId);
      if (!logChannel) return;
      const container = new ContainerBuilder()
        .setAccentColor(0xe67e22)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## ❌ Member Left\n\n**${member.user.tag}** (${member.id}) left the server.`)
        );
      logChannel.send({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    });
  },
};