const { PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  name: 'logs',
  description: 'Display the latest events (commands, message delete/edit, member join/leave, voice join/leave) in the official logs channel (for admins, professional)',
  category: 'admin',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ content: '❌ This command is for administrators only.' });
    }

    const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
    const logChannelId = guildConfig?.logChannelId;
    if (!logChannelId) {
      return message.reply({ content: '❌ Logs channel is not set up yet. Use the setup command first.' });
    }
    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (!logChannel) {
      return message.reply({ content: '❌ The logs channel does not exist or was deleted.' });
    }

    const fetched = await logChannel.messages.fetch({ limit: 30 });
    if (!fetched.size) {
      return message.reply({ content: 'No events have been logged yet in the logs channel.' });
    }

    // Prepare professional events
    const events = [];
    for (const msg of fetched.values()) {
      const embed = msg.embeds[0];
      if (embed && embed.title) {
        let userId = null;
        let avatarURL = null;
        let mention = null;
        // Try to extract user ID from description or author
        const mentionMatch = embed.description && embed.description.match(/<@([0-9]{15,})>/);
        if (mentionMatch) {
          userId = mentionMatch[1];
        } else if (msg.author && msg.author.id) {
          userId = msg.author.id;
        }
        if (userId) {
          const member = await message.guild.members.fetch(userId).catch(() => null);
          if (member) {
            avatarURL = member.user.displayAvatarURL({ dynamic: true, size: 256 });
            mention = `<@${member.id}>`;
          }
        }
        // Commands
        if (embed.title.includes('Command Used')) {
          let userNameTag = '';
          let userIdText = '';
          if (userId) {
            const member = await message.guild.members.fetch(userId).catch(() => null);
            if (member) {
              avatarURL = member.user.displayAvatarURL({ dynamic: true, size: 256 });
              mention = `<@${member.id}>`;
              userNameTag = `${member.user.username}#${member.user.discriminator}`;
              userIdText = `ID: ${member.id}`;
            }
          }
          events.push({
            type: 'Command',
            content: `${mention || ''} (${userNameTag})\n${userIdText}\n${embed.description}`,
            time: msg.createdAt,
            emoji: '📥',
            title: embed.title.replace('Command Used', 'Command Used'),
            avatar: avatarURL
          });
        }
        // Message Deleted
        else if (embed.title.includes('Message Deleted')) {
          events.push({
            type: 'Message Deleted',
            content: `${mention || ''} \n${embed.description}`,
            time: msg.createdAt,
            emoji: '🗑️',
            title: embed.title.replace('Message Deleted', 'Message Deleted'),
            avatar: avatarURL
          });
        }
        // Message Edited
        else if (embed.title.includes('Message Edited')) {
          events.push({
            type: 'Message Edited',
            content: `${mention || ''} \n${embed.description}`,
            time: msg.createdAt,
            emoji: '✏️',
            title: embed.title.replace('Message Edited', 'Message Edited'),
            avatar: avatarURL
          });
        }
        // Member Joined
        else if (embed.title.includes('Member Joined')) {
          events.push({
            type: 'Member Joined',
            content: `🎉 Welcome ${mention || ''} to the server! 🌟\n${embed.description ? `> ${embed.description}` : ''}\nWe hope you have a wonderful time with us! ✨`,
            time: msg.createdAt,
            emoji: '✅',
            title: 'New Member Joined',
            avatar: avatarURL
          });
        }
        // Member Left
        else if (embed.title.includes('Member Left')) {
          events.push({
            type: 'Member Left',
            content: `👋 Goodbye ${mention || ''}, we will miss you! 😢\n${embed.description ? `> ${embed.description}` : ''}\nWishing you all the best wherever you go. 🌈`,
            time: msg.createdAt,
            emoji: '❌',
            title: 'Member Left',
            avatar: avatarURL
          });
        }
        // Voice Join
        else if (embed.title.includes('Voice Channel Joined')) {
          const roomMatch = embed.description && embed.description.match(/Room: \*\*(.+)\*\*/);
          const roomName = roomMatch ? roomMatch[1] : 'Unknown';
          events.push({
            type: 'Voice Join',
            content: `🎤 ${mention || ''} just joined the voice channel: **${roomName}**!\nEnjoy your conversation! 🗣️✨`,
            time: msg.createdAt,
            emoji: '🎤',
            title: 'Voice Channel Joined',
            avatar: avatarURL
          });
        }
        // Voice Leave
        else if (embed.title.includes('Voice Channel Left')) {
          const roomMatch = embed.description && embed.description.match(/Room: \*\*(.+)\*\*/);
          const roomName = roomMatch ? roomMatch[1] : 'Unknown';
          events.push({
            type: 'Voice Leave',
            content: `━━━━━━━━━━━━━━━
🔇・${mention || ''} has gracefully left the voice channel:
『 **${roomName}** 』
━━━━━━━━━━━━━━━
🌈 We hope to hear your voice again soon! 👋✨`,
            time: msg.createdAt,
            emoji: '🎤',
            title: 'Voice Channel Left',
            avatar: avatarURL
          });
        }
      }
    }

    events.sort((a, b) => b.time - a.time);
    const topEvents = events.slice(0, 5);
    if (!topEvents.length) {
      return message.reply({ content: 'No important events found.' });
    }

    // Professional container showing the latest 5 events
    const container = new ContainerBuilder()
      .setAccentColor(0x2b2d31)
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`***## Latest Events in Logs Channel***

${topEvents.map(ev => `**${ev.emoji} ${ev.title}**
${ev.content}
*${ev.time.toLocaleString()}*`).join('')}`)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent('***Showing the latest events from the logs channel***')
      );

    await message.reply({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
  }
};