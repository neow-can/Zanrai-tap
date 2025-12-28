const { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const themeManager = require('../../utils/themeManager');
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: 'ping',
  description: 'Display the bot\'s ping and uptime',
  category: "user",
  cooldown: 8,
  aliases: ['p'],
  async execute(message, args) {
    const guildId = message.guild.id;
    const theme = await themeManager.getTheme(guildId);

    // Pings
    const ping = Math.round(message.client.ws.ping); 
    const apiPing = Date.now() - message.createdTimestamp; 

    // Uptime
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor(uptime / 3600) % 24;
    const minutes = Math.floor(uptime / 60) % 60;
    const seconds = Math.floor(uptime % 60);
    const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    // Cooldown
    const timeLeft = cooldownHandler.checkCooldown("ping", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      const container = new ContainerBuilder()
        .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`***Please wait ${timeLeft} seconds***`)
        );
      return message.channel.send({
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      }).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }
    cooldownHandler.applyCooldown("ping", message.author.id, 8);

    // Container
    const container = new ContainerBuilder()
      .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(`***## Bot Ping and Uptime***\n***__Bot Ping:__***\`\`\`${ping}ms\`\`\`***__API Latency__***\`\`\`\yaml\n${apiPing}ms\`\`\`***__Bot Uptime:__***\`\`\`${uptimeString}\`\`\`***__Developers__***\`\`\`\yaml\n˗ˋˏ ⁽♡⁾ 𝑳𝒎𝒐𝒙 ˎˊ˗\`\`\``)
      );

    // Support button
    const supportButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Contact Developer')
        .setURL('https://github.com/Lmox')
        .setStyle(ButtonStyle.Link)
    );

    await message.reply({ 
      components: [container.addActionRowComponents(supportButton)],
      flags: [MessageFlags.IsComponentsV2]
    });
  },
};