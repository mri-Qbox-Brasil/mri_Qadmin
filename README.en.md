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
  - **Dynamic Wall (ESP)**: Player visualization (Custom colors for dead, invisible, or through ACE Principal Ranks).
- **Highly Customizable**:
  - Light/Dark themes.
  - Dynamic colors (Hex, RGB, HSL support for panel accent).
  - Native WebRTC or Cloudflare SFU for advanced live views.

## 📦 Required Dependencies

To ensure MRI QAdmin works perfectly, the following resources are required:

- `ox_lib`
- `oxmysql`
- `qb-core` or `qbx_core` (Framework)

## 💻 Console Commands and Permissions

MRI QAdmin manages its access permissions directly through Principals/Aces in the database, injected in real-time. You can manage fundamental permissions using the server terminal (console):

### `mri_qadmin.setmaster [id/license]`
Grants **Master Admin** access (Full Panel with Admin Group control) immediately and permanently in the database to a player.
**Examples:**
- `mri_qadmin.setmaster 1` (Using online player ID)
- `mri_qadmin.setmaster license:1234567890abcdef...` (Using FiveM License)

### `mri_qadmin.addpermission [id/license] [permission_or_group]`
*(Advanced)* Grants a specific permission or group to an ID/License permanently, stored in the database.
**Examples:**
- `mri_qadmin.addpermission 1 group.admin` (Adds player ID 1 to the Admin Group).
- `mri_qadmin.addpermission license:abcd... qadmin.action.ban_player` (Gives the exact ban permission to the player).

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
