# MRI QAdmin

Professional and modern Admin Panel for Qbox and QbCore servers.

[Leitura em Português](README.md)

## 🌟 Main Features

- **Detailed Dashboard**: Overview of server status, online players, and metrics.
- **Complete Player Management**:
  - List of online/offline players.
  - Quick Actions: Revive, Heal, Kill, Freeze, Spectate, Teleport.
  - Punishments: Ban, Kick, Warn.
  - Economy: Give/Remove Money (Cash, Bank, Crypto).
  - Inventory: View and Clear local or offline inventory, Give Items.
  - Vehicles: View player vehicles, Spawn, Delete (DV), Open Trunk, Fix, Refuel.
  - Customization: Clothing Menu, Set Ped.
- **Group Management**:
  - Easily control Jobs and Gangs.
- **Advanced Bans System**:
  - Comprehensive ban list and intuitive management in the panel.
- **Vehicle Management**:
  - Admin vehicle spawner, max tuning, and garage management.
- **Items Database**:
  - Search items by base name and easily give them to any player.
- **Developer and Tools**:
  - Integrated chat for STAFF members.
  - Vehicle Developer Menu.
  - Entity information, routing buckets management.
  - Copy Coordinates directly.
  - **Dynamic Wall (ESP)**: Player visualization (Custom colors for dead, invisible, or based on ACE permissions).
- **Advanced Live Visualization**:
  - **Live Keyboard Visualizer**: See player key presses in real-time while spectating (Numpad and Mouse support).
  - **Dynamic Map**: Smart view reset, advanced player filters, and live screen integration.
- **Highly Customizable**:
  - Light/Dark themes.
  - Dynamic colors (Hex, RGB, HSL support for panel accent).
  - **Smart Auto-Scaling**: The panel automatically adjusts for resolutions above 1920px (4K, Ultra-wide) and is optimized for smaller screens (1366x768).
  - Native WebRTC or Cloudflare SFU for advanced live views.
- **Hybrid and Dynamic Permission System**:
  - Granular control by License, Character, Job, or Gang.
  - Real-time synchronization of inheritances and permissions.
  - **Permission Wizard (NEW)**: Guided assistant for creating complex permissions (Target -> Optional Inheritance -> ACEs -> Summary).

## 📦 Required Dependencies

To ensure MRI QAdmin works perfectly, the following resources are required:

- `ox_lib`
- `oxmysql`
- `qb-core` or `qbx_core` (Framework)

## 🛡️ Hybrid Permission System

MRI QAdmin utilizes an advanced Access Control model (Hybrid ACL) allowing for flexible and powerful management:

- **Global (`license:xxxx`)**: Permissions linked to the player's account. Valid for all characters.
- **Administrative (`group.xxxx`)**: Standardized ACE groups (e.g., `group.admin`, `group.mod`).
- **Character (`char:citizenid`)**: Specific permissions for a single character.
- **Job/Gang (`job.name` / `gang.name`)**: Automatic permissions based on the player's current role (e.g., `job.police`).

### Hierarchy and Precedence
The recommended logical hierarchy is `License > Group > Character > Job`. Permissions are cumulative and dynamically injected into the player's session upon login or role/character change, without requiring reconnection.

## 💻 Console Commands and Permissions (Server Console)

You can manage fundamental permissions using the server terminal (console):

### `mri_qadmin.setmaster [id/license]`
Grants **Master Admin** access (Full Panel with total control) immediately and permanently.
**Examples:**
- `mri_qadmin.setmaster 1` (Online ID)
- `mri_qadmin.setmaster license:1234...` (License)

### `mri_qadmin.addpermission [id/license/prefix] [permission_or_group]`
*(Advanced)* Grants a permission or group permanently in the database.
**Examples:**
- `mri_qadmin.addpermission license:abcd... group.admin` (Adds to Admin Group).
- `mri_qadmin.addpermission char:ABC12345 group.mod` (Gives Mod to a specific character).
- `mri_qadmin.addpermission job.police qadmin.action.revive` (Gives revive permission to ALL police).

## 👏 Credits & Acknowledgements

This project is a heavily modified, enhanced, and modernized version inspired by the excellent **ps-adminmenu**.
We express our sincere gratitude to the [Project Sloth](https://github.com/Project-Sloth) team and contributors for the original work forming the foundation in the FiveM community.

## 📄 License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**.
You may share and adapt the material, under the following conditions:
- You must give appropriate credit.
- You **CANNOT** use this material for commercial purposes (cannot be sold).
- If you modify the material, you must distribute your contributions under the same license.

Read the full [LICENSE](LICENSE) file for all legal details.
