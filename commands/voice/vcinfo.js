const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const DynamicVoice = require('../../models/DynamicVoice');
const themeManager = require("../../utils/themeManager");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: 'vcinfo',
  description: 'Show voice channel information',
  category: "voice",
  cooldown: 8,
  async execute(message) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);
    
    const errorEmbed = (description) => {
      return new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.no}・${description}***`)
        );
    };

    const successEmbed = (description) => {
      return new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***${theme.emojis.yes}・${description}***`)
        );
    };

    try {
      const timeLeft = cooldownHandler.checkCooldown("vcinfo", message.author.id, 8);
      if (timeLeft) {
        message.delete();
        return message.channel.send({ 
          components: [errorEmbed(`Please wait ${timeLeft} seconds`)],
          flags: [MessageFlags.IsComponentsV2]
        }).then(msg => {
          setTimeout(() => msg.delete(), 5000);
        });
      }
  
      cooldownHandler.applyCooldown("vcinfo", message.author.id, 8);
  
      if (!member.voice.channel) {
        return message.channel.send({ 
          components: [errorEmbed("You must be in a voice channel to use this command")],
          flags: [MessageFlags.IsComponentsV2]
        })
      }
      const channel = member.voice.channel;
      const voiceData = await DynamicVoice.findOne({ 
        channelId: member.voice.channel.id,
        guildId: guild.id
      });

      if (!voiceData) {
        return message.channel.send({ 
          components: [errorEmbed("This is not a temporary voice channel")],
          flags: [MessageFlags.IsComponentsV2]
        })
      }

      const owner = await guild.members.fetch(voiceData.ownerId).catch(() => null);
      const currentMembers = member.voice.channel.members;
      const everyonePerms = channel.permissionOverwrites.cache.get(guild.id);
      const isLocked = everyonePerms ? everyonePerms.deny.has(PermissionFlagsBits.Connect) : false;
      const isHidden = everyonePerms ? everyonePerms.deny.has(PermissionFlagsBits.ViewChannel) : false;

      const formatUsers = async (userIds) => {
        if (!userIds.length) return 'None';
        const users = await Promise.all(
          userIds.map(id => guild.members.fetch(id).catch(() => null))
        );
        return users.filter(Boolean).map(u => u.toString()).join(', ') || 'None';
      };
      
      // Create container instead of embed
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***# 🎵 ${owner?.user.username || 'Unknown'}'s Voice Room***\n\n` +
              `***## 📊 Channel Information***\n` +
              `***Status:*** ${isLocked ? '`🔒 Locked`' : '`🔓 Open`'}\n` +
              `***View:*** ${isHidden ? '`👁️ Hidden`' : '`👀 Visible`'}\n` +
              `***Created:*** <t:${Math.floor(voiceData.createdAt.getTime() / 1000)}:R>\n` +
              `***User Limit:*** \`${channel.userLimit || 'Unlimited'}\`\n` +
              `***Current Members:*** \`${currentMembers.size}\`\n\n` +
              `***## 👥 User Management***\n` +
              `***${theme.emojis.permit} Permitted Users (${voiceData.allowedUsers.length}):*** ${await formatUsers(voiceData.allowedUsers)}\n` +
              `***${theme.emojis.reject} Rejected Users (${voiceData.rejectedUsers.length}):*** ${await formatUsers(voiceData.rejectedUsers)}\n` +
              (currentMembers.size > 0 ? 
                `\n***## 📋 Members List (${currentMembers.size})***\n` + 
                Array.from(currentMembers.values())
                  .map(m => {
                    const isOwner = m.id === voiceData.ownerId;
                    return `***${m.toString()} ${isOwner ? `${theme.emojis.owner} **Owner**` : ''}***`;
                  })
                  .join('\n') : '***None***'))
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***👤 Requested by ${message.author.username} • <t:${Math.floor(Date.now()/1000)}:F>***`)
        );

      return message.channel.send({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });

    } catch (error) {
      console.error('VCInfo error:', error);
      const errorContainer = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`${theme.emojis.no}・An error occurred while fetching voice channel information`)
        );
      return message.channel.send({ 
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2]
      }).then(msg => setTimeout(() => msg.delete(), 10000));
    }
  }
};