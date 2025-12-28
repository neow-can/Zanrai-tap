const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "vcreset",
  description: "Reset your temporary voice channel.",
  category: "voice",
  cooldown: 8,
  async execute(message) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);

    try {
      if (!cooldownHandler) {
        return sendEmbed(message, `${theme.emojis.no}・Cooldown handler not found. Please contact the bot owner.`, theme.color);
      }
      const timeLeft = cooldownHandler.checkCooldown("vcreset", message.author.id, 8);
      if (timeLeft) {
        message.delete();
        return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
          setTimeout(() => msg.delete(), 5000);
        });
      }

      cooldownHandler.applyCooldown("vcreset", message.author.id, 8);

      if (!member.voice.channel) {
        return sendEmbed(message, `***${theme.emojis.no}・You must be in the voice channel to reset it***`, theme.color);
      }

      const channel = member.voice.channel;

      const voiceData = await DynamicVoice.findOne({ channelId: channel.id });
      if (!voiceData) {
        return sendEmbed(message, `***${theme.emojis.info}・This is not a temporary voice channel***`, theme.color);
      }

      if (voiceData.ownerId !== member.id) {
        return sendEmbed(message, `***${theme.emojis.no}・Only the channel owner can reset permissions***`, theme.color);
      }

      const memberOverwrites = channel.permissionOverwrites.cache.filter(ow => ow.type === 1);
      await Promise.all(
        Array.from(memberOverwrites.keys()).map(id => 
          channel.permissionOverwrites.delete(id).catch(console.error)
      ));

      await channel.permissionOverwrites.edit(guild.id, {
        ViewChannel: null,
        Connect: null,
      });

      await channel.edit({
        userLimit: 0,
      });

      await DynamicVoice.updateOne(
        { channelId: channel.id },
        { 
          $set: { 
            allowedUsers: [],
            rejectedUsers: [],
          } 
        }
      );

      await channel.permissionOverwrites.edit(member.id, {
        Connect: true,
        Speak: true,
      });

      return sendEmbed(message, `***${theme.emojis.yes}・Voice channel has been reset***`, theme.color);

    } catch (error) {
      console.error("Reset command error:", error);
      return sendEmbed(message,`***${theme.emojis.no}・Failed to reset voice channel: ${error.message}***`,theme.color);
    }
  }
};

function sendEmbed(message, description, color) {
  const container = new ContainerBuilder()
    .setAccentColor(typeof color === 'string' ? parseInt(color.replace('#', '0x'), 16) : color)
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(description)
    );
  return message.channel.send({
    components: [container],
    flags: [MessageFlags.IsComponentsV2]
  });
}
