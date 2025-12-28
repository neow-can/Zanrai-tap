const { ContainerBuilder, TextDisplayBuilder, MessageFlags, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const DynamicVoice = require("../models/DynamicVoice");
const themeManager = require("../utils/themeManager");
const UserConfig = require("../models/UserConfig");
const cooldownHandler = require("../events/cooldown");

module.exports = {
  name: "limit",
  description: "Set user limit for your Tempy Voice",
  async execute(interaction) {
    const { member, guild } = interaction;

    try {
      // جلب الثيم
      const theme = await themeManager.getTheme(guild.id);

      const sendErrorEmbed = (message) => {
        return interaction.reply({
          components: [new ContainerBuilder().setAccentColor(0xFF0000).addTextDisplayComponents(new TextDisplayBuilder().setContent(`***${message}***`))],
          flags: [MessageFlags.IsComponentsV2, 64]
        });
      };

      if (!member.voice?.channel) {
        return sendErrorEmbed(`***${theme.emojis.no}・You must be in a voice channel***`);
      }

      const voiceData = await DynamicVoice.findOne({
        channelId: member.voice.channel.id,
        guildId: guild.id,
      });

      if (!voiceData) {
        return sendErrorEmbed(`***${theme.emojis.info}・This is not a Tempy Voice channel***`);
      }

      // عدد الثواني للكولداون
      const cooldownTime = 8;

      // تحقق من الكولداون عبر checkCooldown
      const timeLeft = cooldownHandler.checkCooldown("limit", member.id, cooldownTime);
      if (timeLeft) {
        return sendErrorEmbed(`***${theme.emojis.cooldown}・Please wait ${timeLeft} seconds before using this command again***`);
      }

      // صلاحيات التعديل
      const ownerConfig = await UserConfig.findOne({ userId: voiceData.ownerId });
      const managers = ownerConfig?.managers || [];

      if (voiceData.ownerId !== member.id && !managers.includes(member.id)) {
        return sendErrorEmbed(`***${theme.emojis.info}・Only the owner or channel managers can change the limit***`);
      }

      // أنشئ المودال
      const modal = new ModalBuilder()
        .setCustomId("voiceLimitModal")
        .setTitle("Set Voice Channel Limit");

      const limitInput = new TextInputBuilder()
        .setCustomId("limitInput")
        .setLabel("Enter limit (0-99, 0 = no limit)")
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(2)
        .setRequired(true)
        .setPlaceholder("Current limit: " + (voiceData.userLimit || "no limit"))
        .setValue(voiceData.userLimit ? voiceData.userLimit.toString() : "0");

      const firstActionRow = new ActionRowBuilder().addComponents(limitInput);
      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);

      const filter = (i) => i.customId === "voiceLimitModal" && i.user.id === member.id;

      interaction
        .awaitModalSubmit({ filter, time: 60_000 })
        .then(async (modalInteraction) => {
          try {
            await modalInteraction.deferReply({ flags: 64 });

            const inputValue = modalInteraction.fields.getTextInputValue("limitInput");
            const newLimit = inputValue ? parseInt(inputValue) : 0;

            if (isNaN(newLimit) || newLimit < 0 || newLimit > 99) {
              return modalInteraction.editReply({
                components: [
                  new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent(`***${theme.emojis.info}・Please provide a valid limit (0-99)***`)
                    )
                ],
              });
            }

            // طبق الكولداون
            cooldownHandler.applyCooldown("limit", member.id, cooldownTime);

            const voiceChannel = member.voice?.channel;
            if (!voiceChannel || voiceChannel.id !== voiceData.channelId) {
              return modalInteraction.editReply({
                components: [
                  new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent(`***${theme.emojis.no}・You must remain in the voice channel to modify it***`)
                    )
                ],
              });
            }

            const channel = guild.channels.cache.get(voiceData.channelId);
            if (!channel) {
              return modalInteraction.editReply({
                components: [
                  new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent(`***${theme.emojis.no}・The voice channel no longer exists***`)
                    )
                ],
              });
            }

            if (newLimit === 0) {
              await voiceChannel.setUserLimit(0);
              await DynamicVoice.updateOne({ channelId: voiceChannel.id }, { $set: { userLimit: 0 } });
              return modalInteraction.editReply({
                components: [
                  new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent(`***${theme.emojis.limit}・Removed user limit from voice channel***`)
                    )
                ],
              });
            } else {
              await voiceChannel.setUserLimit(newLimit);
              await DynamicVoice.updateOne({ channelId: voiceChannel.id }, { $set: { userLimit: newLimit } });
              return modalInteraction.editReply({
                components: [
                  new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent(`***${theme.emojis.limit}・Voice channel limit updated to ${newLimit}***`)
                    )
                ],
              });
            }
          } catch (modalError) {
            console.error("Modal processing error:", modalError);
            if (modalInteraction.replied || modalInteraction.deferred) {
              return modalInteraction.editReply({
                components: [
                  new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent(`***${theme.emojis.no}・Failed to change limit: ${modalError.message}***`)
                    )
                ],
              });
            }
          }
        })
        .catch((error) => {
          if (error.code !== "INTERACTION_COLLECTOR_ERROR") {
            console.error("Modal handling error:", error);
          }
        });
    } catch (error) {
      console.error("Limit command error:", error);

      // تعريف theme بشكل افتراضي لو الخطأ قبل تعيينه
      const theme = {
        color: "Red",
        emojis: { no: "❌" },
      };

      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          components: [
            new ContainerBuilder()
              .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`***${theme.emojis.no}・An error occurred: ${error.message}***`)
              )
          ],
          flags: [MessageFlags.IsComponentsV2, 64],
        }).catch(console.error);
      }
    }
  },
};