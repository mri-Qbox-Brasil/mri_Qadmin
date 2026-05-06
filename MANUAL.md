# mri_Qadmin - Manual Funcional

Painel administrativo completo para Qbox Framework com interface React moderna, oferecendo gerenciamento abrangente de jogadores, veículos, inventário, mapa ao vivo, WebRTC, logs e permissões.

## O que o recurso faz

O mri_Qadmin fornece uma interface administrativa web (NUI React) para administradores gerenciarem o servidor FiveM. Permite controle total sobre jogadores, veículos, visualização em tempo real via mapa e telas, além de sistema completo de logs e permissões.

## Funcionalidades principais

- **Gerenciamento de Jogadores**: Lista online/offline com pesquisa, paginação, ações (ban, inventário, dinheiro, bucket, job/gang)
- **Gerenciamento de Veículos**: Grid de veículos, spawn wizard, gerenciamento de estoque
- **Live Map**: Mapa Leaflet com marcadores de jogadores em tempo real
- **Live Screens**: Visualização de telas de jogadores via WebRTC
- **Sistema de Logs**: Viewer com filtros por categoria, nível e resource
- **Gerenciamento de Permissões**: Grupos e atribuição de permissões granulares
- **Staff Chat**: Chat em tempo real com suporte a menções
- **Dashboard**: Estatísticas do servidor, status de resources, ações rápidas
- **Overlays**: Vehicle Dev (telemetria), Coords, Entity Info, Nearby Entities

## Como funciona

1. Admin abre o painel via comando `/adm`
2. Interface React carrega dados via callbacks NUI
3. Ações são executadas via callbacks server-side
4. Logs são registrados automaticamente para auditoria
5. Permissões são verificadas via ACE principals e grupos customizados

## Configurações disponíveis

O recurso utiliza banco de dados para configurações persistentes:
- Tabela de logs para auditoria
- Tabela de permissões/grupos
- Tabela de configurações gerais

### Permissões
- `admin` — Acesso total
- `mod` — Acesso moderado
- Grupos customizáveis via painel de permissões

## Comandos disponíveis

| Comando | Descrição |
|---------|-----------|
| `/adm` | Abrir painel administrativo |

## Eventos

### Callbacks principais
| Callback | Direção | Descrição |
|----------|----------|-----------|
| `mri_Qadmin:server:HasPermission` | C→S | Verificação de permissão ACE |
| `AbrirMenuAdmin` | Any→C | Abre menu admin via callback |

### Eventos de logs
| Evento | Descrição |
|--------|-----------|
| Registro automático de ações administrativas | Sistema de logs registra bans, teleportes, alterações de job, etc. |

## Exports

### Client
| Export | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `ToggleUI` | - | - | Alterna visibilidade da UI |
| `OpenUI` | - | - | Abre painel admin |
| `IsMenuVisible` | - | boolean | Verifica se menu está visível |

### Server
| Export | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `HasPerms` | (src, permission) | boolean | Verifica permissões |
| `CheckPerms` | (src, permission) | table | Checa permissões detalhadas |
| `IsPlayerInPrincipal` | (src, principal) | boolean | Verifica se jogador está em principal ACE |
| `GeneratePlate` | - | string | Gera placa de veículo única |
| `GetActions` | - | table | Obtém ações disponíveis |
| `AddLog` | (resource, category, level, message, data) | - | Adiciona entrada de log |

## Módulos Server

| Módulo | Funcionalidade |
|--------|---------------|
| `db.lua` | Operações de banco de dados |
| `main.lua` | Lógica principal do servidor |
| `logs.lua` | Sistema de registro de eventos |
| `players.lua` | Gerenciamento de jogadores (ban, kick, teleport, etc.) |
| `vehicle.lua` | Spawn, delete, gerenciamento de veículos |
| `permissions.lua` | Sistema de permissões e grupos |
| `inventory.lua` | Visualização de inventário de jogadores |
| `teleport.lua` | Teleporte (goto, bring, coords) |
| `spectate.lua` | Sistema de spectate |
| `webrtc.lua` | Servidor WebRTC para live screens |
| `actions.lua` | Ações administrativas disponíveis |
| `resources.lua` | Gerenciamento de resources do servidor |

## Módulos Client

| Módulo | Funcionalidade |
|--------|---------------|
| `main.lua` | Entry point do cliente |
| `noclip.lua` | Sistema de noclip |
| `spectate.lua` | Spectate de jogadores |
| `vehicles.lua` | Vehicle ESP e telemetria |
| `players.lua` | Player ESP |
| `webrtc.lua` | Cliente WebRTC para transmissão de tela |
| `toggle_laser.lua` | Laser de seleção de entidades |
| `nearby_scanner.lua` | Scanner de entidades próximas |

## Overlays disponíveis

| Overlay | Descrição |
|---------|-----------|
| **VehicleDev** | Telemetria ao vivo (velocidade, marcha, RPM, combustível, saúde) |
| **Coords** | Coordenadas atuais do jogador em tempo real |
| **EntityInfo** | Informações da entidade apontada pelo laser |
| **NearbyEntities** | Lista de peds/veículos/objetos próximos |

## Páginas do Painel

| Página | Descrição |
|--------|-----------|
| **Dashboard** | Stats do servidor, status de resources, ações rápidas |
| **Players** | Lista online/offline, pesquisa, modais de ação |
| **Vehicles** | Grid de veículos, spawn wizard, estoque |
| **Live Map** | Mapa com marcadores de jogadores |
| **Live Screens** | Viewer WebRTC de telas de jogadores |
| **Logs** | Viewer com filtros (categoria, nível, resource) |
| **Permissions** | Gerenciamento de grupos e permissões |
| **Staff Chat** | Chat em tempo real com menções `@nome` |

## Integração com outros recursos MRI

- **ox_lib**: Locale system, menus, notificações
- **oxmysql**: Persistência de logs e configurações
- **qbx_core**: Dados de jogadores, jobs, gangs
- **mri_Qmenu**: Menu admin (F10) pode redirecionar para `/adm`
- **mri_Qbox**: Integração com staff system e VIP

## Exemplos práticos

### Verificar permissão via export
```lua
local hasPerm = exports['mri_Qadmin']:HasPerms(source, 'player.ban')
if hasPerm then
    -- executar ação
end
```

### Adicionar log via export
```lua
exports['mri_Qadmin']:AddLog('mri_Qadmin', 'admin', 'info', 'Jogador banido', {
    admin = source,
    target = targetId,
    reason = reason
})
```

### Abrir painel via export client
```lua
exports['mri_Qadmin']:OpenUI()
```

## Solução de problemas

- **Painel não abre**: Verifique se o jogador tem permissão ACE adequada
- **WebRTC não funciona**: Configure servidores TURN/STUN adequados para produção
- **Logs não aparecem**: Verifique se a tabela no banco foi criada corretamente via `database.sql`
- **Performance com muitos jogadores**: O sistema usa `react-virtuoso` para virtualização de listas
- **Mock mode para dev**: Use `localStorage.setItem('mri_qadmin_use_mocks', 'true')` no browser
