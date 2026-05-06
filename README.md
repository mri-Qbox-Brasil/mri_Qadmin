# mri_Qadmin 🛡️

Painel administrativo completo para QBCore/Qbox Framework com interface React moderna. Gerenciamento de jogadores, veículos, inventário, mapa ao vivo, WebRTC, logs, permissões e staff chat.

## Principais recursos

- 👥 **Gerenciamento de Jogadores** — Lista online/offline com pesquisa, paginação, ações (ban, inventory, money, bucket, job/gang).
- 🚗 **Gerenciamento de Veículos** — Grid de veículos, spawn wizard, gerenciamento de estoque.
- 🗺️ **Live Map** — Mapa Leaflet com marcadores de jogadores em tempo real.
- 📺 **Live Screens** — Visualização de telas de jogadores via WebRTC.
- 📋 **Logs** — Viewer com filtros por categoria, nível e resource.
- 🔐 **Permissões** — Gerenciamento de grupos e atribuição de permissões.
- 💬 **Staff Chat** — Chat em tempo real com menções.
- 📊 **Dashboard** — Stats do servidor, status de resources, ações rápidas.
- 🎮 **Overlays** — Vehicle Dev (telemetria), Coords, Entity Info, Nearby Entities.
- 🎨 **UI Moderna** — React 18 + TypeScript + Vite + TailwindCSS + `@mriqbox/ui-kit`.
- ⚡ **Performance** — `react-virtuoso` para listas grandes (100+ jogadores a 60fps).

## Instalação rápida

1. Copie a pasta `mri_Qadmin` para a pasta de resources do servidor.
2. Instale as dependências do frontend:
   ```bash
   cd mri_Qadmin/web
   npm install
   npm run build
   ```
3. Adicione `ensure mri_Qadmin` no `server.cfg` (após `qbx_core`, `ox_lib`, `oxmysql`).
4. Execute o script SQL:
   ```sql
   source database.sql
   ```

## Configuração

### Dependências obrigatórias

- `ox_lib` — Locale system, menus, notificações.
- `oxmysql` — Banco de dados.

### Estrutura do banco de dados

O arquivo `database.sql` cria as tabelas necessárias:
- Tabela de logs
- Tabela de permissões/grupos
- Tabela de configurações

### Permissões

Sistema de permissões baseado em ACE principals e grupos:
- `admin` — Acesso total.
- `mod` — Acesso moderado.
- Grupos customizáveis via painel de permissões.

Ver `PERMISSIONS.md` para detalhes completos.

## Painel Web (React)

### Stack

| Tecnologia | Versão | Propósito |
|---|---|---|
| React | 18 | Framework UI. |
| TypeScript | 5.x | Type safety. |
| Vite | 6 | Build tool. |
| TailwindCSS | 3 | Styling. |
| `@mriqbox/ui-kit` | local | Componentes MRI customizados. |
| `react-virtuoso` | — | Virtualização de listas. |
| Leaflet | — | Live map. |
| WebRTC | — | Live screens. |

### Páginas

| Página | Descrição |
|---|---|
| **Dashboard** | Stats do servidor, status de resources, ações rápidas. |
| **Players** | Lista online/offline, pesquisa, modais de ação. |
| **Vehicles** | Grid de veículos, spawn wizard, estoque. |
| **Live Map** | Mapa com marcadores de jogadores. |
| **Live Screens** | Viewer WebRTC de telas de jogadores. |
| **Logs** | Viewer com filtros (categoria, nível, resource). |
| **Permissions** | Gerenciamento de grupos e permissões. |
| **Staff Chat** | Chat em tempo real com menções. |

### Overlays

| Overlay | Descrição |
|---|---|
| **VehicleDev** | Telemetria ao vivo (velocidade, marcha, RPM, combustível, saúde). |
| **Coords** | Coordenadas atuais do jogador. |
| **EntityInfo** | Info da entidade apontada pelo laser. |
| **NearbyEntities** | Lista de peds/veículos/objetos próximos. |

### Mock Mode

Para desenvolver no browser sem FiveM:
```bash
localStorage.setItem('mri_qadmin_use_mocks', 'true')
```

## Comandos

| Comando | Descrição |
|---|---|
| `/adm` | Abrir painel admin. |

## Exports

### Client

| Export | Descrição |
|---|---|
| `ToggleUI` | Alternar visibilidade da UI. |
| `OpenUI` | Abrir painel admin. |
| `IsMenuVisible` | Verificar se o menu está visível. |

### Server

| Export | Descrição |
|---|---|
| `HasPerms` | Verificar permissões. |
| `CheckPerms` | Checar permissões detalhadas. |
| `IsPlayerInPrincipal` | Verificar se jogador está em principal. |
| `GeneratePlate` | Gerar placa de veículo. |
| `GetActions` | Obter ações disponíveis. |
| `AddLog` | Adicionar log: `(resource, category, level, message, data)`. |

## Server Modules

| Módulo | Descrição |
|---|---|
| `db.lua` | Operações de banco de dados. |
| `main.lua` | Lógica principal. |
| `utils.lua` | Utilitários. |
| `logs.lua` | Sistema de logs. |
| `chat.lua` | Chat integration. |
| `commands.lua` | Comandos. |
| `groups.lua` | Gerenciamento de grupos. |
| `inventory.lua` | Visualização de inventário. |
| `items.lua` | Gerenciamento de itens. |
| `locations.lua` | Locações salvas. |
| `misc.lua` | Diversos. |
| `peds.lua` | Gerenciamento de peds. |
| `permissions.lua` | Sistema de permissões. |
| `settings.lua` | Configurações. |
| `actions.lua` | Ações admin. |
| `players.lua` | Gerenciamento de jogadores. |
| `resources.lua` | Gerenciamento de resources. |
| `server_data.lua` | Dados do servidor. |
| `spectate.lua` | Sistema de spectate. |
| `teleport.lua` | Teleporte. |
| `trolls.lua` | Troll actions. |
| `vehicle.lua` | Gerenciamento de veículos. |
| `wall.lua` | Invisible wall. |
| `key_manager.lua` | Gerenciamento de chaves. |
| `webrtc.lua` | WebRTC server. |
| `data_sync.lua` | Sync de dados. |

## Client Modules

| Módulo | Descrição |
|---|---|
| `main.lua` | Entry point. |
| `utils.lua` | Utilitários. |
| `data.lua` | Dados locais. |
| `chat.lua` | Chat integration. |
| `inventory.lua` | Inventory overlay. |
| `misc.lua` | Diversos. |
| `noclip.lua` | Noclip. |
| `players.lua` | Player ESP. |
| `spectate.lua` | Spectate. |
| `teleport.lua` | Teleporte. |
| `toggle_laser.lua` | Laser de seleção. |
| `troll.lua` | Troll actions. |
| `vehicles.lua` | Vehicle ESP/dev. |
| `wall.lua` | Invisible wall. |
| `world.lua` | World controls. |
| `key_capture.lua` | Key capture. |
| `nearby_scanner.lua` | Scanner de entidades próximas. |
| `logs.lua` | Logs overlay. |
| `webrtc.lua` | WebRTC client. |

## Estrutura de arquivos 📁

```
mri_Qadmin/
├── client/                    # Scripts cliente
│   ├── main.lua               # Entry point
│   ├── modules/               # Módulos cliente
│   └── ...
├── server/                    # Scripts servidor
│   ├── main.lua               # Lógica principal
│   ├── db.lua                 # Database ops
│   ├── logs.lua               # Sistema de logs
│   └── ...                    # 25+ modules
├── shared/                    # Configurações compartilhadas
├── web/                       # Frontend React
│   ├── src/
│   │   ├── pages/             # Páginas do painel
│   │   ├── components/        # Componentes reutilizáveis
│   │   └── ...
│   └── build/                 # Output do build
├── data/                      # Dados estáticos
│   ├── weapons.lua            # Lista de armas
│   ├── ped.lua                # Lista de peds
│   └── object.lua             # Lista de objetos
├── locales/                   # Traduções JSON
├── database.sql               # Schema do banco
├── fxmanifest.lua
├── README.md
├── README.en.md
├── PERMISSIONS.md             # Documentação de permissões
├── LOGS.md                    # Documentação de logs
├── CHANGELOG.md
└── TODO.md
```

## Observações importantes ⚠️

- O frontend usa `react-virtuoso` para virtualização de listas — essencial para performance com 100+ jogadores.
- WebRTC requer configuração adequada de TURN/STUN servers para funcionar em produção.
- O sistema de logs suporta múltiplas categorias e níveis de severidade.
- O painel de permissões permite criar grupos customizados com permissões granulares.
- Staff chat suporta menções com `@nome`.
- Mock mode permite desenvolver a UI no browser sem precisar do FiveM rodando.

Contribuições e melhorias são bem-vindas — abra PRs ou issues. 🙌
