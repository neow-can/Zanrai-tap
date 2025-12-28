const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const UserConfig = require("../../models/UserConfig");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "name",
  description: "Change your voice channel name",
  category: "voice",
  cooldown: 60,
  async execute(message, args) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);
    const newName = args.join(" ");

    const timeLeft = cooldownHandler.checkCooldown("name", message.author.id, 60);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("name", message.author.id, 60);

    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・**Error!** You must be in a voice channel***`, theme.color);
    }

    const voiceData = await DynamicVoice.findOne({ 
      channelId: member.voice.channel.id,
      guildId: guild.id
    });
    
    if (!voiceData) {
      return sendEmbed(message, `***${theme.emojis.info}・**Warning!** This is not a temporary voice channel***`, theme.color);
    }
    const ownerConfig = await UserConfig.findOne({ userId: voiceData.ownerId });
    const managers = ownerConfig?.managers || [];
    
    if (voiceData.ownerId !== member.id && !managers.includes(member.id)) {
      return sendEmbed(message, `***${theme.emojis.info}・**Warning!** You must be the owner of this voice channel***`, theme.color);
    }

    if (!newName) {
      return sendEmbed(message, `***${theme.emojis.name}・**Warning!** Please provide a new name***`, theme.color);
    }

    try {
      await member.voice.channel.setName(newName);
      return sendEmbed(message, `***${theme.emojis.name}・**Success!**Channel name changed to: **\`${newName}\`*****`, theme.color);
    } catch (error) {
      console.error("Error renaming channel:", error);
      return sendEmbed(message, `***${theme.emojis.no}・**Error!** Failed to rename channel***`, theme.color);
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