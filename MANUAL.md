# mri_Qadmin — Manual Funcional

Painel de administração abrangente e extensível para servidores FiveM baseados em QBCore e Qbox. Oferece gerenciamento completo de jogadores, veículos, inventário, sistema de permissões por grupos, Staff Chat, transmissão de tela ao vivo via WebRTC, ferramentas de desenvolvimento e arquitetura de plugins para módulos externos.

---

## O que o recurso faz

O `mri_Qadmin` fornece uma interface NUI completa para administradores, com sincronização de dados em tempo real (itens, veículos, recursos, empregos, gangues, peds, locais, ações, permissões e jogadores). As permissões são definidas exclusivamente no servidor (Lua), e o frontend renderiza o que o servidor envia — sem duplicação de lógica.

---

## Como funciona

1. Um administrador abre o painel via `/adm` ou tecla configurada.
2. A NUI carrega dados do servidor em tempo real usando callbacks e eventos.
3. O administrador seleciona uma funcionalidade (jogador, veículo, recurso, etc.).
4. As ações são executadas via callbacks NUI com verificações de permissão no servidor.
5. O servidor processa, interage com o framework (QBCore/Qbox), banco de dados (MySQL) e outros resources, e devolve atualizações para a NUI.

---

## Funcionalidades principais

### Dashboard
Visão geral do servidor: jogadores online, uptime, estatísticas financeiras (requer `qadmin.action.info_admin`), ações rápidas de anúncio e controle de chat.

### Jogadores
Lista de jogadores online e offline com busca, filtros e paginação. Ações disponíveis por permissão:
- **Visualização**: identifiers, vitais, inventário, coordenadas, bucket
- **Teleporte**: ir até o jogador, trazer, voltar, enviar para coordenadas ou local
- **Moderação**: matar, expulsar, advertir, banir, desbanir, verificar identidade, algemar, congelar, silenciar, aplicar efeito de embriaguez
- **Personagem**: set de emprego/gangue, dar/remover dinheiro, mudar model (ped), menu de roupas, inventário (abrir, ver, limpar, transferir, copiar)

### Veículos
Gerenciamento de estoque e spawning. Visualização em grid ou tabela com busca. Ações: spawnar temporário, dar permanente, deletar, consertar, abastecer, modificar, trocar placa, alterar estoque.

### Itens
Base de dados de itens com spawn direto para o inventário de qualquer jogador online.

### Staff Chat
Chat dedicado para administradores com suporte a menções `@[Nome]` e alertas de notificação quando o staff é marcado.

### Permissões
Editor de grupos com categorias dinâmicas vindas do servidor. Checkboxes por permissão, vinculação de principals (`group.admin`, `job.police`, etc.), e wizard guiado para criação de permissões complexas.

### Mapa ao Vivo
Mapa interativo com posição em tempo real de todos os jogadores, filtros avançados e integração com telas ao vivo.

### Telas ao Vivo (WebRTC)
Visualização da tela de jogadores em tempo real para monitoramento. Suporte a FiveM-native, WebSocket e Cloudflare SFU.

### Logs
Sistema de logs com persistência em banco de dados, buffer em memória, webhooks Discord por categoria e filtros por resource. Configurável via painel sem reiniciar o resource.

### Recursos
Listagem de todos os resources do servidor com controle de start/stop.

### Configurações
Editor visual de configurações sem precisar editar arquivos. Altera clima, hora, tema e integrações.

### Dev Mode
Ferramentas de desenvolvedor: exibição de coordenadas, blips de todos os jogadores, scanner de entidades próximas, laser, modo mock para testes no browser.

### VIP
Gerenciamento de VIPs integrado com o sistema de permissões.

---

## Sistema de Permissões

As permissões são definidas exclusivamente em `server/permissions.lua` e enviadas para o frontend via `data_sync.lua`. O frontend apenas renderiza o que o servidor envia.

### Grupos

Cada grupo tem um conjunto de ACE permissions armazenadas no banco de dados e aplicadas via `lib.addAce` em cada reinício. Os grupos podem ser vinculados a principals do FiveM (`group.admin`, `job.police`, `gang.ballas`) para herança automática.

### Master Admin

Status especial concedido via console. Ignora todas as verificações de permissão do Qadmin.

```
mri_qadmin.setmaster 1         # por ID online
mri_qadmin.setmaster license:abcd...  # por licença
mri_qadmin.removemaster 1
mri_qadmin.purgemasters        # limpa todos do DB
```

### Permissões de Plugins

Quando um plugin registra `RegisterPlugin({ requiredPerms = {...} })`, as permissões válidas (que contêm ponto e não são built-ins do FiveM) são automaticamente adicionadas ao editor de grupos sob uma categoria nomeada com o `id` do plugin. O grupo `god` recebe essas permissões dinamicamente.

Consulte [PERMISSIONS.md](PERMISSIONS.md) para a referência completa.

---

## Configurações disponíveis

Arquivo: `shared/config.lua`

| Chave | Descrição |
| :--- | :--- |
| `Config.Fuel` | Resource de combustível (`"cdn-fuel"`, `"ps-fuel"`, `"LegacyFuel"`, `"ox_fuel"`) |
| `Config.Dealership` | Sistema de concessionária (`"mri"`, `"ps-dealerships"`, `"none"`) |
| `Config.Inventory` | Auto-detectado via `GetResourceState` (ox, ps, lj, qb) |
| `Config.OpenPanelPerms` | ACEs para abrir o painel (padrão: `{'qadmin.open'}`) |
| `Config.AdminKey` | Tecla para abrir o painel (padrão: `"0"`) |
| `Config.NoclipKey` | Tecla para alternar noclip (padrão: `"9"`) |
| `Config.Keybindings` | Habilitar atalhos de teclado |
| `Config.Debug` | Habilitar prints de debug |
| `Config.QBCoreAutoSync` | Promover automaticamente ranks `admin`/`god` do QBCore para o grupo `admin` |
| `Config.RenewedPhone` | Suporte ao qb-phone do Renewed (multijob) |
| `Config.DefaultGarage` | Garagem padrão para o Give Car |
| `Config.VehicleImages` | URL base para imagens de veículos |
| `Config.MapBaseUrl` | URL base para tiles do mapa ao vivo |
| `Config.SignalingProvider` | Backend WebRTC: `"fivem-native"`, `"websocket"` ou `"cloudflare-sfu"` |
| `Config.WebRTCUrl` | URL WebSocket para o modo `"websocket"` |
| `Config.Logs` | Configuração de logs (webhooks Discord por categoria, DB, buffer, filtros por resource) |
| `Config.Actions` | Ações administrativas customizadas |
| `Config.PlayerActions` | Ações específicas para jogadores |
| `Config.OtherActions` | Outras ações administrativas |

### Configuração de Logs

```lua
Config.Logs = {
    Webhooks = {
        players     = "",   -- bans, kicks, revives...
        bans        = "",
        inventory   = "",
        vehicles    = "",
        money       = "",
        server      = "",   -- clima, hora, anúncios
        permissions = "",
        chat        = "",
        system      = "",
        Fallback    = "",   -- recebe categorias sem webhook específico
    },
    ForwardEvent  = "",     -- evento server-side disparado a cada log (deixe "" para desativar)
    DBEnabled     = true,
    MaxMemory     = 500,    -- buffer em memória (logs mais recentes)
    ResourceMode  = 'blacklist', -- 'blacklist' ou 'whitelist'
    ResourceEntries = {},
}
```

---

## Comandos disponíveis

| Comando | Requer | Descrição |
| :--- | :--- | :--- |
| `/adm` | `qadmin.open` | Abre o painel |
| `/nc` | `qadmin.action.noclip` | Alterna noclip |
| `/vector2`, `/vec2` | Admin | Copia coordenadas como Vector2 |
| `/vector3`, `/vec3` | Admin | Copia coordenadas como Vector3 |
| `/vector4`, `/vec4` | Admin | Copia coordenadas como Vector4 (com heading) |
| `/heading` | Admin | Copia o heading atual |
| `/setammo` | `qadmin.action.set_ammo` | Define munição da arma atual |
| `wall` | `qadmin.action.enable_wall` | Alterna ESP/Wallhack |
| `mri_qadmin.setmaster [alvo]` | Console | Concede Master Admin (ID, licença ou licença2) |
| `mri_qadmin.removemaster [alvo]` | Console | Revoga Master Admin |
| `mri_qadmin.purgemasters` | Console | Remove todos os Master Admins do DB |
| `mri_qadmin.debugperms [alvo]` | Console | Exibe debug de permissões de um jogador |
| `mri_qadmin.inspectdb` | Console | Inspeciona tabelas de permissão no DB |

---

## Callbacks principais (NUI → Servidor)

| Callback | Descrição |
| :--- | :--- |
| `getData` | Carrega dados iniciais (jogadores, itens, veículos, permissões...) |
| `getPlayers` | Lista paginada de jogadores online e offline |
| `GetMessages` | Mensagens do Staff Chat |
| `SendMessage` | Envia mensagem no Staff Chat |
| `GetStaffPlayers` | Lista jogadores com acesso ao Staff Chat |
| `mri_Qadmin:callback:GetGroups` | Grupos de permissão |
| `mri_Qadmin:callback:GetMyPermissions` | Permissões do próprio jogador |
| `mri_Qadmin:callback:GetPlayerInventory` | Inventário de um jogador |
| `mri_Qadmin:callback:GetVehicleInventory` | Inventário de um veículo |
| `mri_Qadmin:callback:GetLogs` | Logs do servidor |
| `mri_Qadmin:server:getPlugins` | Plugins visíveis para o jogador (filtrado por ACE) |
| `update_vehicle_stock` | Atualiza estoque de veículos |
| `clickButton` | Executa uma ação configurável via config |
| `setResourceState` | Inicia/para um resource |
| `GetPlayerCoords` | Coordenadas de um jogador |
| `GetAllPlayerCoords` | Coordenadas de todos (mapa ao vivo) |
| `GetPlayerVitals` | Vitais (vida, armadura) de um jogador |

---

## Eventos emitidos pelo servidor

| Evento | Direção | Descrição |
| :--- | :--- | :--- |
| `mri_Qadmin:client:pluginsUpdated` | S→C | Lista de plugins atualizada (filtrada por ACE do player) |
| `mri_Qadmin:client:OpenUI` | S→C | Força abertura do painel no cliente |
| `newMessage` (postMessage NUI) | S→NUI | Nova mensagem no Staff Chat |
| `mentioned` (postMessage NUI) | S→NUI | O jogador foi mencionado no Staff Chat |

---

## Arquitetura de Plugins

Scripts externos podem adicionar páginas ao sidebar e registrar permissões no editor de grupos:

```lua
-- Chamado no server-side do plugin (ex: mri_Qspawn/server/main.lua)
exports['mri_Qadmin']:RegisterPlugin({
    id            = 'mri_Qspawn',
    label         = 'Spawns',
    icon          = 'car',          -- nome de ícone lucide-react
    resource      = 'mri_Qspawn',
    htmlPath      = 'web/build/index.html',  -- opcional
    requiredPerms = { 'mri_Qspawn.admin', 'command' },
    permDefs = {   -- opcional: metadados por permissão
        { id = 'mri_Qspawn.admin', label = 'Administrador', desc = 'Acesso total ao painel de spawns' },
    },
    description   = 'Gerenciador de spawns de veículos',
})
```

O plugin aparece no sidebar para jogadores que têm qualquer uma das `requiredPerms`. A permissão `command` (built-in FiveM) é filtrada automaticamente e não aparece no editor de grupos — apenas permissões com ponto e fora do blocklist são registradas.

Para remover o plugin quando o resource para, o Qadmin faz isso automaticamente via `onResourceStop`.

---

*Atualizado em: 18/05/2026*
