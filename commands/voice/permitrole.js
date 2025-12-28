const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const DynamicVoice = require("../../models/DynamicVoice");
const themeManager = require("../../utils/themeManager");
const cooldownHandler = require("../../events/cooldown");

module.exports = {
  name: "permitrole",
  description: "Grant a role access to your voice channel (mention or ID)",
  aliases: ["addrole","prole"],
  category: "voice",
  cooldown: 8,
  async execute(message, args) {
    const { member, guild } = message;
    const theme = await themeManager.getTheme(guild.id);

    const timeLeft = cooldownHandler.checkCooldown("permitrole", message.author.id, 8);
    if (timeLeft) {
      message.delete();
      return sendEmbed(message, `***Please wait ${timeLeft} seconds***`,theme.color).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
    }

    cooldownHandler.applyCooldown("permitrole", message.author.id, 8);

    if (!member.voice.channel) {
      return sendEmbed(message, `***${theme.emojis.no}・**Error!** You must be in a voice channel to use this command***`, theme.color);
    }

    const voiceData = await DynamicVoice.findOne({ 
      channelId: member.voice.channel.id,
      guildId: guild.id
    });
    
    if (!voiceData) {
      return sendEmbed(message, `***${theme.emojis.info}・**Warning!** This is not a temporary voice channel***`, theme.color);
    }

    if (voiceData.ownerId !== member.id) {
      return sendEmbed(message, `***${theme.emojis.info}・**Warning!** You must be the channel owner to add roles***`, theme.color);
    }

    const targetId = message.mentions.roles.first()?.id || args[0];
    if (!targetId) {
      return sendEmbed(message, `***${theme.emojis.no}・**Warning!** Please provide a valid role***`, theme.color);
    }

    const targetRole = await guild.roles.fetch(targetId).catch(() => null);
    if (!targetRole) {
      return sendEmbed(message, `***${theme.emojis.no}・**Error!** Role not found***`, theme.color);
    }

    try {
      // Check if the role still exists and is manageable
      if (!targetRole.editable) {
        return sendEmbed(message, `***${theme.emojis.no}・**Error!** Cannot manage this role (insufficient permissions)***`, theme.color);
      }

      await member.voice.channel.permissionOverwrites.edit(targetRole, {
        ViewChannel: true,
        Connect: true,
      });

      return sendEmbed(message, `***${theme.emojis.yes}・**Success!** Role ${targetRole} has been permitted in <#${member.voice.channel.id}>***`, theme.color);
    } catch (error) {
      console.error("Error permitting role:", error);
      
      // Handle specific error cases
      if (error.code === 10009) {
        return sendEmbed(message, `***${theme.emojis.no}・**Error!** Role no longer exists or has been deleted***`, theme.color);
      }
      
      return sendEmbed(message, `***${theme.emojis.no}・**Error!** Failed to permit role: ${error.message}***`, theme.color);
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