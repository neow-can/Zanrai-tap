const mongoose = require('mongoose');

const DynamicVoiceSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  allowedUsers: { type: [String], default: [] }, 
  rejectedUsers: { type: [String], default: [] },
});

module.exports = mongoose.model('DynamicVoice', DynamicVoiceSchema);