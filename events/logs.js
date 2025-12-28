const { ContainerBuilder, TextDisplayBuilder, MessageFlags, Events } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = (client) => {
  // New message (commands)
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!guildConfig?.logChannelId) return;
    const logChannel = message.guild.channels.cache.get(guildConfig.logChannelId);
    if (!logChannel) return;

    // If the message is a command (starts with the bot prefix)
    const prefix = '.v'; // Change the prefix according to your bot
    if (message.content.startsWith(prefix)) {
      const container = new ContainerBuilder()
        .setAccentColor(0x3498db)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***## 📥 Command Used***\n***${message.author.tag}*** ***used the command:*** ***\`${message.content}\`***`)
        );
      logChannel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
    }
  });

  // Message deleted
  client.on(Events.MessageDelete, async (message) => {
    if (message.partial || !message.guild || message.author?.bot) return;
    const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!guildConfig?.logChannelId) return;
    const logChannel = message.guild.channels.cache.get(guildConfig.logChannelId);
    if (!logChannel) return;

    const container = new ContainerBuilder()
      .setAccentColor(0xf70c0c)
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`***## 🗑️ Message Deleted***\n***${message.author.tag}***\n***${message.content || '*Content not available*'}***`)
      );
    logChannel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  });

  // Message edited
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
          .setContent(`***## ✏️ Message Edited***\n***${oldMsg.author.tag}***\n***Before:*** ***${oldMsg.content}***\n***After:*** ***${newMsg.content}***`)
      );
    logChannel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  });

  // Member joined
  client.on(Events.GuildMemberAdd, async (member) => {
    const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id });
    if (!guildConfig?.logChannelId) return;
    const logChannel = member.guild.channels.cache.get(guildConfig.logChannelId);
    if (!logChannel) return;

    const container = new ContainerBuilder()
      .setAccentColor(0x2ecc71)
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`***## ✅ Member Joined***\n***${member.user.tag}*** ***(${member.id})*** ***joined the server.***`)
      );
    logChannel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  });

  // Member left
  client.on(Events.GuildMemberRemove, async (member) => {
    const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id });
    if (!guildConfig?.logChannelId) return;
    const logChannel = member.guild.channels.cache.get(guildConfig.logChannelId);
    if (!logChannel) return;

    const container = new ContainerBuilder()
      .setAccentColor(0xf50808)
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`***## ❌ Member Left***\n***${member.user.tag}*** ***(${member.id})*** ***left the server.***`)
      );
    logChannel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  });
};
