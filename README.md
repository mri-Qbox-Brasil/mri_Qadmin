Technical Writer for FiveM scripts.
Brazilian Portuguese.
Exact structure and style of the provided template.
Only information from the technical summary.
Final markdown only (no explanations, no code fences).

    *   *Resource Name:* `mri_Qadmin`
    *   *Description:* Admin Panel for QbCore and Qbox. (Advanced administration panel featuring player management, server control, logs, and developer tools).
    *   *Dependencies:* `ox_lib`, `oxmysql`, `qbx_core` (or `qb-core`).
    *   *Installation:* Standard FiveM installation (folder in resources, ensure in cfg, config file, restart).
    *   *Configuration:*
        *   `Config.Debug` (boolean, false) - Logs de debug.
        *   `Config.Inventory` (string) - Tipo de inventário (ex: 'ox_inventory').
        *   `Config.WebRTCUrl` (string) - URL para WebRTC.
        *   `Config.Logs.DBEnabled` (boolean) - Ativa logs no banco de dados.
    *   *Commands:*
        *   `/adm` (via keybind `mri:toogleAdmin`) - Abre o painel.
        *   `/nc` (via keybind `mri:toogleNoclip`) - Ativa/Desativa Noclip.
        *   `mri_qadmin.setmaster` (Admin/Console) - Define Master Admin.
        *   `mri_qadmin.removemaster` (Admin/Console) - Remove Master Admin.
    *   *Events:*
        *   Client $\rightarrow$ Server: `mri_Qadmin:server:sendMessage`, `mri_Qadmin:server:UpdatePressedKeys`, `mri_Qadmin:server:SaveCar`, `mri_Qadmin:server:LogClientAction`.
        *   Exports: `HasPerms`, `CheckPerms`, `IsPlayerInPrincipal`, `GeneratePlate`, `GetActions`, `AddLog`, `ToggleUI`, `OpenUI`, `IsMenuVisible`.

    *   *Header:* # mri_Qadmin
    *   *Description:* Painel administrativo avançado para servidores QbCore e Qbox, com gestão de jogadores, controle de servidor, logs e ferramentas de desenvolvedor.
    *   *Badges:* Keep as per template.
    *   *Dependencies Table:* `ox_lib` (Sim), `oxmysql` (Sim), `qbx_core` (Sim).
    *   *Installation:* Standard steps.
    *   *Configuration Table:*
        *   `Config.Debug` | `boolean` | `false` | Ativa logs de debug no console.
        *   `Config.Inventory` | `string` | `ox_inventory` | Define o sistema de inventário utilizado.
        *   `Config.Logs.DBEnabled` | `boolean` | `true` | Ativa o armazenamento de logs no banco de dados.
        *   `Config.WebRTCUrl` | `string` | `""` | URL para integração de WebRTC.
    *   *Commands Table:*
        *   `/adm` | Jogador (Perm) | Abre o painel administrativo.
        *   `/nc` | Jogador (Perm) | Ativa ou desativa o modo Noclip.
        *   `mri_qadmin.setmaster` | Console | Define um jogador como Master Admin.
    *   *Events:*
        *   Client $\rightarrow$ Server: `mri_Qadmin:server:sendMessage` (data: table) - Envia mensagem no chat da staff.
        *   Client $\rightarrow$ Server: `mri_Qadmin:server:SaveCar` (data: table) - Salva veículo como carro administrativo.
        *   Exports: `exports['mri_Qadmin']:AddLog()` (void) - Adiciona um log ao sistema.
        *   Exports: `exports['mri_Qadmin']:CheckPerms()` (boolean) - Verifica permissões do jogador.

    *   Check against template structure.
    *   Ensure Portuguese translation is natural and technical.
    *   Verify no extra text or code fences.
