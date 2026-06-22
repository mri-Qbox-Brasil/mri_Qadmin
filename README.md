# mri_Qadmin

Painel administrativo moderno e extensível para servidores FiveM baseados em QBCore e Qbox, com gerenciamento completo de jogadores, veículos, inventário, permissões por grupos, transmissão de tela ao vivo via WebRTC e arquitetura de plugins para módulos externos.

## Principais recursos

- **Painel Completo** — Interface NUI para gerenciamento de servidor, jogadores e recursos.
- **Sistema de Permissões por Grupos** — Crie grupos com permissões granulares, vínculos com ACEs do FiveM, e controle em tempo real. Definições de permissões são feitas exclusivamente no lado do servidor (Lua).
- **Gerenciamento de Jogadores e Veículos** — Teleporte, vitais, inventário, spawn, reparo, modificação de veículos e controle de chaves.
- **Staff Chat** — Chat dedicado com menções (`@nome`) e alertas de notificação.
- **Transmissão de Tela (WebRTC)** — Visualização em tempo real da tela de jogadores. Suporte a FiveM-native, WebSocket e Cloudflare SFU.
- **Arquitetura de Plugins** — Scripts externos registram páginas administrativas e permissões próprias via exports.

## Instalação rápida

1. Copie a pasta `mri_Qadmin` para a pasta de resources do servidor.
2. Importe o `database.sql` no banco de dados.
3. Adicione `ensure mri_Qadmin` no `server.cfg` (após `ox_lib` e `oxmysql`).

## Dependências obrigatórias

| Resource | Finalidade |
| :--- | :--- |
| `ox_lib` | Callbacks, comandos, ACE e utilitários |
| `oxmysql` | Persistência MySQL |
| `qb-core` ou `qbx_core` | Framework de jogadores |

> `server/server_secrets.json` só é necessário quando `Config.SignalingProvider = "cloudflare-sfu"`.

## Configuração

Arquivo principal: `shared/config.lua`

| Chave | Padrão | Descrição |
| :--- | :--- | :--- |
| `Config.Fuel` | `"cdn-fuel"` | Resource de combustível (`ps-fuel`, `LegacyFuel`, `ox_fuel`) |
| `Config.Dealership` | `"mri"` | Sistema de concessionária (`"mri"`, `"ps-dealerships"`, `"none"`) |
| `Config.Inventory` | auto-detect | Sistema de inventário (detectado automaticamente via `GetResourceState`) |
| `Config.OpenPanelPerms` | `{'qadmin.open'}` | ACEs necessárias para abrir o painel |
| `Config.AdminKey` | `"0"` | Tecla para abrir o painel |
| `Config.NoclipKey` | `"9"` | Tecla para alternar noclip |
| `Config.Keybindings` | `true` | Habilitar atalhos de teclado |
| `Config.QBCoreAutoSync` | `true` | Promover automaticamente ranks `admin`/`god` do QBCore ao grupo `admin` |
| `Config.DefaultGarage` | `"Pillbox Garage Parking"` | Garagem padrão para o comando Give Car |
| `Config.VehicleImages` | `""` | URL base para imagens de veículos |
| `Config.MapBaseUrl` | _(CDN MRI)_ | URL base para tiles do mapa ao vivo |
| `Config.SignalingProvider` | `"fivem-native"` | Backend WebRTC (`"fivem-native"`, `"websocket"`, `"cloudflare-sfu"`) |
| `Config.WebRTCUrl` | — | URL WebSocket para `SignalingProvider = "websocket"` |
| `Config.RenewedPhone` | `false` | Suporte ao qb-phone do Renewed (multijob) |
| `Config.Debug` | `true` | Habilitar prints de debug |
| `Config.Logs` | — | Webhooks Discord por categoria, persistência em DB e filtros por resource |
| `Config.Actions` | `{}` | Ações administrativas customizadas |
| `Config.PlayerActions` | `{}` | Ações específicas para jogadores |
| `Config.OtherActions` | `{}` | Outras ações administrativas |

## Navegador de arquivos de recursos

A página **Recursos** inclui um navegador que permite explorar, abrir e **editar arquivos de texto** de qualquer resource, além de criar/excluir arquivos e pastas — direto pelo painel.

### Escrita e o sandbox do FiveM (obrigatório ler)

A partir dos artifacts **> 25770**, o FiveM **bloqueia por padrão** que um resource escreva em arquivos de **outro** resource (proteção contra malware). Isso afeta o navegador:

- **Ler/navegar** funciona em **todos** os resources.
- **Salvar / criar / excluir** só funciona:
  - nos arquivos do **próprio `mri_Qadmin`**; ou
  - em resources **liberados explicitamente** no `server.cfg`.

Para liberar a edição de um resource, adicione no `server.cfg` (e reinicie o `mri_Qadmin`):

```cfg
add_filesystem_permission mri_Qadmin write nome_do_resource
```

> Uma linha **por resource** — o FiveM **não** suporta wildcard (`*`), e **não há** convar para desabilitar o sandbox globalmente. Reverter para artifacts ≤ 25770 destrava, mas é uma regressão de segurança e não é recomendado.

Quando um resource não é gravável, o painel mostra um aviso **"somente leitura"** com a linha exata a adicionar e desabilita os controles de escrita. As ações de escrita exigem a permissão `qadmin.action.change_resource`; a exclusão exige também `qadmin.action.resource_delete`.

## Comandos

| Comando | Quem pode usar | Descrição |
| :--- | :--- | :--- |
| `/adm` | Admin (requer `qadmin.open`) | Abre o painel |
| `/nc` | Admin (requer `qadmin.action.noclip`) | Alterna noclip |
| `/vector2`, `/vec2` | Admin | Copia coordenadas como Vector2 |
| `/vector3`, `/vec3` | Admin | Copia coordenadas como Vector3 |
| `/vector4`, `/vec4` | Admin | Copia coordenadas como Vector4 (com heading) |
| `/heading` | Admin | Copia o heading atual |
| `/setammo` | Admin (requer `qadmin.action.set_ammo`) | Define munição da arma atual |
| `wall` | Admin (requer `qadmin.action.enable_wall`) | Alterna ESP/Wallhack |
| `mri_qadmin.setmaster [id/license]` | Console only | Concede Master Admin |
| `mri_qadmin.removemaster [id/license]` | Console only | Revoga Master Admin |
| `mri_qadmin.purgemasters` | Console only | Remove todos os Master Admins do DB |
| `mri_qadmin.debugperms [id]` | Console only | Exibe permissões de um jogador |
| `mri_qadmin.inspectdb` | Console only | Inspeciona tabelas de permissão no DB |

## Exports

### Server

| Export | Descrição |
| :--- | :--- |
| `HasPerms(source, node)` | Verifica se o jogador tem a permissão (retorna bool) |
| `CheckPerms(source, node)` | Verifica e notifica o jogador em caso de negação (retorna bool) |
| `IsPlayerInPrincipal(source, principal)` | Verifica se o jogador pertence a um principal ACE |
| `GeneratePlate()` | Gera uma placa de veículo única (sem duplicatas no DB) |
| `GetActions()` | Retorna as ações administrativas configuradas |
| `AddLog(resource, category, level, message, data[, source])` | Adiciona uma entrada ao sistema de logs |
| `RegisterPlugin(manifest)` | Registra uma página de plugin no sidebar e as permissões `requiredPerms` no editor de grupos |
| `UnregisterPlugin(id)` | Remove um plugin registrado |
| `RegisterPermissions(perms, categoryDef?)` | Registra permissões de scripts externos sem sidebar (veja PERMISSIONS.md) |

### Client

| Export | Descrição |
| :--- | :--- |
| `ToggleUI(show)` | Abre ou fecha o painel |
| `OpenUI()` | Abre o painel |
| `IsMenuVisible()` | Retorna `true` se o painel está aberto |
| `CheckPerms(node)` | Verifica permissão no lado cliente |

## Plugins

Scripts externos podem adicionar páginas ao sidebar e registrar permissões no editor de grupos:

```lua
-- server/main.lua do plugin (ex: mri_Qspawn)
exports['mri_Qadmin']:RegisterPlugin({
    id            = 'mri_Qspawn',
    label         = 'Spawns',
    icon          = 'car',
    resource      = 'mri_Qspawn',
    requiredPerms = { 'mri_Qspawn.admin', 'command' },
    -- 'command' é filtrado automaticamente (built-in FiveM)
    -- 'mri_Qspawn.admin' aparece no editor de grupos sob a categoria "mri_Qspawn"
    permDefs = {  -- opcional: label e descrição por permissão
        { id = 'mri_Qspawn.admin', label = 'Administrador', desc = 'Acesso total' },
    },
    description   = 'Gerenciador de spawns',
})
```

Consulte [PERMISSIONS.md](PERMISSIONS.md) para referência completa do sistema de permissões.

## Estrutura de arquivos

```
mri_Qadmin/
├── client/          Scripts cliente
├── server/          Scripts servidor
│   ├── permissions.lua   Sistema de permissões e grupos (fonte de verdade)
│   ├── plugins.lua       Registro de plugins externos
│   ├── data_sync.lua     Sincronização de dados para a NUI
│   └── logs.lua          Sistema de logs com Discord e DB
├── shared/
│   └── config.lua   Configurações
├── web/             Frontend React (NUI)
├── PERMISSIONS.md   Referência completa de permissões e sistema de plugins
└── fxmanifest.lua
```
