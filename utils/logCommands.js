const fs = require('fs');
const path = require('path');

// Logs will be appended to the root-level command-logs.txt
const logFilePath = path.join(__dirname, '..', 'command-logs.txt');

/**
 * Append a command usage entry to command-logs.txt
 * @param {string} commandName
 * @param {string} userId
 * @param {string} channelId
 * @param {('success'|'error')} [status='success']
 * @param {Object} [extra={}] - any extra metadata to include
 */
function logCommand(commandName, userId, channelId, status = 'success', extra = {}) {
  try {
    const time = new Date().toISOString();
    const entry = {
      time,
      commandName,
      userId,
      channelId,
      status,
      ...extra,
    };
    const line = JSON.stringify(entry);
    fs.appendFile(logFilePath, line + '\n', (err) => {
      if (err) console.error('Failed to write command log:', err);
    });
  } catch (err) {
    console.error('Unexpected error in logCommand:', err);
  }
}

module.exports = { logCommand };
