const mongoose = require('mongoose');

const userConfigSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  blacklist: { type: Array, default: [] },
  whitelist: { type: Array, default: [] },
  managers: { type: Array, default: [] },
});

module.exports = mongoose.model('UserConfig', userConfigSchema);