const { ContainerBuilder, TextDisplayBuilder, MessageFlags, SectionBuilder, ThumbnailBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = async function sendCommandLog(message, commandName, options = {}) {
  if (!message.guild) return;
  
  // Fetch server settings
  const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
  const logChannelId = guildConfig?.logChannelId;
  if (!logChannelId) return;
  
  const logChannel = message.guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  // Get voice channel information if user is in one
  const voiceChannel = message.member && message.member.voice && message.member.voice.channel ? message.member.voice.channel : null;
  
  // Build container instead of embed
  const container = new ContainerBuilder()
    .setAccentColor(typeof (options.color || '#2b2d42') === 'string' ? parseInt((options.color || '#2b2d42').replace('#', '0x'), 16) : (options.color || 0x2b2d42))
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## ${commandName} Command\n\n` +
              `***__User:__*** <@${message.author.id}>\n` +
              `***__Channel:__*** ${message.channel ? `<#${message.channel.id}>` : '__Not specified__'}\n` +
              (voiceChannel ? 
                `***__Voice Channel:__*** <#${voiceChannel.id}>\n` +
                `***__Channel Name:__*** <#${voiceChannel.name || 'Not specified'}>\n` +
                `**__Channel Limit:__*** ${voiceChannel.userLimit && voiceChannel.userLimit > 0 ? voiceChannel.userLimit : 'Unlimited'}\n` +
                `***__Members In Voice:__*** ${[...voiceChannel.members.values()].length > 0 ? [...voiceChannel.members.values()].map(m => `<@${m.id}>`).join(' | ') : 'No members'}\n` +
                `***__Created At:__*** ${voiceChannel.createdTimestamp ? `<t:${Math.floor(voiceChannel.createdTimestamp/1000)}:R>` : 'Not specified'}\n` +
                `***__Owner:__*** ${[...voiceChannel.members.values()].length > 0 ? `<@${[...voiceChannel.members.values()][0].id}>` : `<@${message.author.id}>`}\n` : '') +
              (options.description ? `\n${options.description}\n` : '') +
              (options.fields && Array.isArray(options.fields) ? 
                options.fields.map(field => `**${field.name}:** ${field.value}`).join('\n') : ''))
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder()
            .setURL(message.author.displayAvatarURL({ dynamic: true, size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
        )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(`Requested by ${message.author.tag}`)
    );

  // Add footer if provided
  if (options.footer) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(options.footer)
    );
  }

  logChannel.send({ components: [container],
     flags: [MessageFlags.IsComponentsV2],
     allowedMentions: { parse: [] }
    });
};