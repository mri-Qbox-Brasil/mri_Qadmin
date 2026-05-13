Technical writer for FiveM scripts.
Brazilian Portuguese.
Follow a specific template exactly.
Use *only* the provided technical summary (10 parts of code analysis).
Return *only* the final markdown (no explanations, no code fences).

    *   *Resource Name:* `mri_Qadmin`
    *   *Description:* Admin Panel for QbCore and Qbox.
    *   *Dependencies:* `ox_lib`, `oxmysql`, `qb-core` (or `qbx_core`).
    *   *Main Features:*
        *   NUI Admin Panel.
        *   Staff Chat (mentions, NUI).
        *   Inventory Management (ox_inventory/QB, view, remove, transfer, copy, real-time monitoring).
        *   Player Management (Vitals, Job/Gang, Mute, Stress, Revive, Kill, Freeze, Drunk effect).
        *   Moderation (Ban, Unban, Kick, Warn, Verify).
        *   Server Control (Announcements, Chat clear, Blackout, Routing Buckets, Resource management).
        *   Developer Tools (Noclip, Godmode, Invisibility, Nearby Entity Scanner, Developer Laser, Key Capture/Monitoring).
        *   ESP/Wall System (Modern/Classic, Skeleton, Tracers, Player info).
        *   Vehicle Management (Spawn, Save admin car, Refuel, Change plates, Max mods, Delete).
        *   VIP Management (Integration with `mri_Qbox`).
        *   Logging System (DB, Discord Webhooks, Queue system, `qb-log` compatibility).
        *   Permission System (ACE, Groups, Master bypass).
        *   Plugin System (Dynamic admin pages).
    *   *Configuration Options:*
        *   `Config.Debug` (Debug messages).
        *   `Config.Inventory` (Inventory type).
        *   `Config.Logs` (Webhooks, categories).
        *   `Config.Actions` / `Config.PlayerActions` / `Config.OtherActions` (Permissions).
        *   `Config.WebRTCUrl` (WebRTC for spectating).
    *   *Commands:*
        *   `adm` (Toggle UI - via keybind/command).
        *   `nc` (Toggle Noclip - via keybind/command).
        *   Console commands: `mri_qadmin.setmaster`, `mri_qadmin.removemaster`, `mri_qadmin.debugperms`, `mri_qadmin.purgemasters`, `mri_qadmin.inspectdb`.
    *   *Exports:*
        *   `AddLog` (Server).
        *   `HasPerms`, `CheckPerms`, `IsPlayerInPrincipal` (Server).
        *   `ToggleUI`, `OpenUI`, `IsMenuVisible` (Client).
        *   `RegisterPlugin`, `UnregisterPlugin` (Server).

    *   *Header:* # Manual — mri_Qadmin
    *   *Description:* Advanced admin panel for Qbox/QbCore.
    *   *Requirements:* ox_lib, oxmysql, qbx_core/qb-core.
    *   *Installation:* Standard FiveM steps.
    *   *Configuration:* Focus on `Config.Debug` and `Config.Inventory` (as examples from the summary).
    *   *Commands:* List the UI toggle and console commands.
    *   *FAQ:* Based on common FiveM issues (dependencies, notifications).
    *   *Support:* MRI Qbox Brasil.

    *   *Check:* Did I include the "Wall" system? Yes.
    *   *Check:* Did I include the "Logging" system? Yes.
    *   *Check:* Is the language correct? Brazilian Portuguese.
    *   *Check:* Is the structure exact? Yes.
    *   *Check:* No code fences? Yes.
