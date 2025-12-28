const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const UserConfig = require("../../models/UserConfig");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "limit",
  description: "Set user limit for your Tempy Voice",
  category: "voice",
  cooldown: 8,
  async execute(message, args) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);
    const newLimit = parseInt(args[0]);

    const timeLeft = cooldownHandler.checkCooldown("limit", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("limit", message.author.id, 8);

    if (!member.voice.channel) {
      return sendEmbed(message,`***${theme.emojis.no}・**Error!** ${member} you must be in a voice channel***`,theme.color);
    }

    const voiceData = await DynamicVoice.findOne({
      channelId: member.voice.channel.id,
      guildId: guild.id
    });

    if (!voiceData) {
      return sendEmbed(message,`***${theme.emojis.info}・**Warning!** ${member} this is not a temporary voice channel***`,theme.color);
    }

    const ownerConfig = await UserConfig.findOne({ userId: voiceData.ownerId });
    const managers = ownerConfig?.managers || [];
    
    if (voiceData.ownerId !== member.id && !managers.includes(member.id)) {
      return sendEmbed(message,`***${theme.emojis.info}・**Warning!** ${member} only the owner can change the limit***`,theme.color);
    }

    if (isNaN(newLimit) || newLimit < 0 || newLimit > 99) {
      return sendEmbed(message,`***${theme.emojis.info}・**Warning!** ${member} please provide a valid limit (0-99)***`,theme.color);
    }

    try {

        if (newLimit === 0) {
          await member.voice.channel.setUserLimit(0);
          return sendEmbed(message,`***${theme.emojis.limit}・**Success!**User limit removed from <#${member.voice.channel.id}>***`,theme.color);

        } else {
          await member.voice.channel.setUserLimit(newLimit);
          return sendEmbed(message,`***${theme.emojis.limit}・**Success!**Your voice channel limit has been updated to **${newLimit}** users***`,theme.color);
        }
      } catch (error) {
      console.error("Limit change error:", error);
      return sendEmbed(message,`***${theme.emojis.no}・**Error!** ${member} failed to change limit: ${error.message}***`,theme.color );
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