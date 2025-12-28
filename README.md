# Lmox Voice Bot

A comprehensive Discord voice channel management bot by Lmox that provides dynamic voice channels with advanced control features.

## Features

- **Dynamic Voice Channels**: Create temporary voice channels that are automatically managed
- **Channel Management**: Lock, unlock, hide, unhide, transfer ownership, and set limits
- **Permission Control**: Grant/revoke access to specific users or roles
- **Voice Activity Tracking**: Monitor and record voice time for leaderboards
- **Customizable Themes**: Personalize the bot's appearance with custom colors and emojis
- **Leaderboards**: Track top voice users with automated leaderboards
- **Advanced Controls**: Kick users, manage names, toggle activities, and more
- **Blacklist/Whitelist**: Manage permanent access controls for users

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Lmox/lmox-voice-bot.git
   cd lmox-voice-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   BOT_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   MONGODB_URI=your_mongodb_connection_string_here
   ```

4. Run the bot:
   ```bash
   npm start
   ```

## Setup

1. Invite the bot to your server with proper permissions (Manage Channels, View Channels, Connect, etc.)
2. Run `.v setup` in your server to create the voice system
3. The bot will create a category with interface, logs, and leaderboard channels
4. Use `.v panel` to create a voice channel control panel in any text channel

## Commands

### Setup Commands
- `.v setup` - Complete initial bot setup for your server
- `.v panel` - Create interactive voice control panel

### Voice Channel Commands
- `.v claim` - Claim ownership of an abandoned voice channel
- `.v lock` - Lock voice channel from new users
- `.v unlock` - Unlock voice channel for everyone
- `.v name [new name]` - Change voice channel name
- `.v owner` - Check current voice channel owner
- `.v permit @user` - Grant user access to voice channel
- `.v reject @user` - Deny user access to voice channel
- `.v permitall` - Grant access to all server members
- `.v transfer @user` - Transfer channel ownership to another user
- `.v hide` - Hide voice channel from others
- `.v unhide` - Make voice channel visible again
- `.v permitrole @role` - Grant role access to voice channel
- `.v rejectrole @role` - Deny role access to voice channel
- `.v kick @user` - Remove user from voice channel
- `.v limit [number]` - Set maximum user limit for voice channel

### Management Commands
- `.v bl-add @user [reason]` - Add user to voice channel blacklist
- `.v bl-remove @user` - Remove user from voice blacklist
- `.v bl-list` - View all blacklisted users
- `.v bl-clear` - Clear entire voice blacklist
- `.v wl-add @user` - Add user to voice channel whitelist
- `.v wl-remove @user` - Remove user from voice whitelist
- `.v wl-list` - View all whitelisted users
- `.v wl-clear` - Clear entire voice whitelist

### Utility Commands
- `.v help` - Display comprehensive help menu
- `.v ping` - Check bot latency and connection status
- `.v leaderboard` - View voice time leaderboards

### Admin Commands
- `.v events` - Create event channels
- `.v fm` - Force mute all users in voice channel
- `.v unfm` - Force unmute all users in voice channel
- `.v top` - Move voice channel to top of category

## Configuration

- Use `.v theme` to customize embed colors and appearance
- Configure staff roles with `.v rolestaff @role`
- Set role that can hide voice channels with `.v rolehide @role`
- Display current server configuration with `.v showconfig`

## Requirements

- Node.js 16.6.0 or higher
- MongoDB database
- Discord Bot Token with proper permissions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support, please contact the developer.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Privacy Policy

This bot stores necessary data for functionality including:
- User IDs for voice time tracking
- Server configuration data
- Channel ownership information
- Blacklist/whitelist data

Data is stored securely in a MongoDB database and is only used for bot functionality.
