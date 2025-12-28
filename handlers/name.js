const { ContainerBuilder, TextDisplayBuilder, MessageFlags, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const DynamicVoice = require("../models/DynamicVoice");
const themeManager = require("../utils/themeManager");
const UserConfig = require("../models/UserConfig");
const cooldownHandler = require("../events/cooldown");

module.exports = {
  name: "name_button",
  description: "Change your voice channel name",
  category: "voice",
  cooldown: 60,
  async execute(interaction) {
    const { member, guild } = interaction;
    
    try {
      // Fetch theme first to ensure it's available
      const theme = await themeManager.getTheme(guild.id);
      
      // Helper function for error responses
      const sendErrorEmbed = (message) => {
        return interaction.reply({ 
          components: [
            new ContainerBuilder()
              .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(`***${message}***`)
              )
          ],
          flags: [MessageFlags.IsComponentsV2, 64]
        });
      };
      
      // Check cooldown before proceeding
      const timeLeft = cooldownHandler.checkCooldown("name", member.id, 60);
      if (timeLeft) {
        return sendErrorEmbed(`***${theme.emojis.cooldown}・Please wait ${timeLeft} seconds before renaming again***`);
      }

      // Check if member is in a voice channel
      if (!member.voice?.channel) {
        return sendErrorEmbed(`***${theme.emojis.no}・You must be in a voice channel to rename it***`);
      }

      // Fetch voice channel data
      const voiceData = await DynamicVoice.findOne({ 
        channelId: member.voice.channel.id,
        guildId: guild.id
      });
      
      if (!voiceData) {
        return sendErrorEmbed(`***${theme.emojis.info}・This is not a temporary voice channel***`);
      }

      // Check permissions (owner or manager)
      const ownerConfig = await UserConfig.findOne({ userId: voiceData.ownerId });
      const managers = ownerConfig?.managers || [];
      
      if (voiceData.ownerId !== member.id && !managers.includes(member.id)) {
        return sendErrorEmbed(`***${theme.emojis.info}・Only the owner or channel managers can rename this voice channel***`);
      }

      // Create and show the rename modal
      const modal = new ModalBuilder()
        .setCustomId('voiceNameModal')
        .setTitle('Change Voice Channel Name');

      const nameInput = new TextInputBuilder()
        .setCustomId('nameInput')
        .setLabel("Enter new channel name")
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(100)
        .setRequired(true)
        .setPlaceholder("Current name: " + member.voice.channel.name)
        .setValue(member.voice.channel.name); // Pre-fill with current name

      const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);

      const filter = (i) => i.customId === 'voiceNameModal' && i.user.id === member.id;
      
      interaction.awaitModalSubmit({ filter, time: 60_000 })
        .then(async (modalInteraction) => {
          try {
            await modalInteraction.deferReply({ flags: 64 });

            const newName = modalInteraction.fields.getTextInputValue('nameInput')?.trim();

            // Validate input
            if (!newName || newName.length < 1 || newName.length > 100) {
              return modalInteraction.editReply({ 
                components: [
                  new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent(`***${theme.emojis.name}・Please provide a valid name (1-100 characters)***`)
                    )
                ],
                flags: [MessageFlags.IsComponentsV2]
              });
            }

            // Skip renaming if the name is the same
            if (newName === member.voice.channel.name) {
              return modalInteraction.editReply({ 
                components: [
                  new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent(`***${theme.emojis.info}・The channel already has this name***`)
                    )
                ],
                flags: [MessageFlags.IsComponentsV2]
              });
            }
            
            // Apply cooldown
            cooldownHandler.applyCooldown("name", member.id, 60);
            
            // Check if member is still in the voice channel
            const voiceChannel = member.voice?.channel;
            if (!voiceChannel || voiceChannel.id !== voiceData.channelId) {
              return modalInteraction.editReply({ 
                components: [
                  new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent(`***${theme.emojis.no}・You must remain in the voice channel to rename it***`)
                    )
                ],
                flags: [MessageFlags.IsComponentsV2]
              });
            }

            // Check if the channel still exists
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
                flags: [MessageFlags.IsComponentsV2]
              });
            }

            // Rename the channel
            await voiceChannel.setName(newName);
            
            // Update name in database
            await DynamicVoice.updateOne(
              { channelId: voiceChannel.id },
              { $set: { channelName: newName } }
            );
            
            await modalInteraction.editReply({ 
              components: [
                new ContainerBuilder()
                  .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                  .addTextDisplayComponents(
                    new TextDisplayBuilder()
                      .setContent(`***${theme.emojis.name}・Channel renamed to: \`${newName}\`***`)
                  )
              ],
              flags: [MessageFlags.IsComponentsV2]
            });
          } catch (modalError) {
            console.error("Error processing rename modal:", modalError);
            if (modalInteraction.replied || modalInteraction.deferred) {
              return modalInteraction.editReply({ 
                components: [
                  new ContainerBuilder()
                    .setAccentColor(typeof theme.color === 'string' ? parseInt(theme.color.replace('#', '0x'), 16) : theme.color)
                    .addTextDisplayComponents(
                      new TextDisplayBuilder()
                        .setContent(`***${theme.emojis.no}・Failed to rename channel: ${modalError.message}***`)
                    )
                ],
                flags: [MessageFlags.IsComponentsV2]
              });
            }
          }
        })
        .catch(error => {
          // Ignore timeout errors from the modal
          if (error.code !== 'INTERACTION_COLLECTOR_ERROR') {
            console.error('Name modal error:', error);
          }
        });

    } catch (error) {
      console.error("Name button error:", error);
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
          flags: [MessageFlags.IsComponentsV2, 64]
        }).catch(console.error);
      }
    }
  }
};