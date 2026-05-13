# mri_Qadmin

Um painel de administração completo para servidores FiveM com QBCore, oferecendo gerenciamento extensivo do servidor, controle de jogadores, gerenciamento de permissões, controle de recursos, monitoramento em tempo real e integração com outros recursos MRI Qbox. Inclui um sistema de migração para tabelas de permissões antigas e um robusto modelo de permissões baseado em ACE.

## Principais recursos

-   **Gerenciamento de Permissões Avançado** — Sistema de permissões baseado em grupos e ACEs, com migração de dados e sincronização automática de roles do QBCore.
-   **Controle Total de Jogadores** — Lista completa de jogadores online/offline, informações detalhadas, ações como banir, kickar, teleportar, congelar e gerenciar inventário.
-   **Gerenciamento de Veículos e Recursos** — Spawne, salve, conserte e gerencie veículos, além de controlar o estado de todos os recursos do servidor (iniciar, parar, reiniciar).
-   **Monitoramento em Tempo Real** — Dashboard com estatísticas do servidor, mapa ao vivo e streaming de tela de jogadores via WebRTC.
-   **Sistema de Logs Robusto** — Registro detalhado de ações administrativas em banco de dados, memória e webhooks do Discord.
-   **Sistema de Plugins Extensível** — Permite que outros recursos registrem páginas administrativas personalizadas dentro da interface do `mri_Qadmin`.
-   **Wall ESP para Administradores** — Recurso de ESP/Wallhack configurável com cores personalizadas para diferentes grupos e estados de jogadores.

## Instalação rápida

1.  Copie a pasta `mri_Qadmin` para a pasta de resources do servidor.
2.  Execute o script SQL fornecido (se houver) para configurar as tabelas de banco de dados.
3.  Adicione `ensure mri_Qadmin` no `server.cfg` (após as dependências obrigatórias).

## Configuração

### Dependências obrigatórias

-   `ox_lib` — Biblioteca de utilidades, callbacks e comandos.
-   `oxmysql` — Para operações de banco de dados MySQL.
-   `qb-core` — Funções essenciais do framework, dados de jogador e notificações.
-   `qb-weathersync` — Para manipulação de tempo e clima no servidor.
-   `pma-voice` — Utilizado para silenciar jogadores.
-   `qb-admin` — Para alternar o modo de desenvolvedor.
-   `ars_ambulancejob` — Para atualizações de status de morte.
-   `InteractSound_SV` — Para reprodução de sons.
-   `vehiclekeys` — Para gerenciamento de propriedade de veículos.
-   `iens` — Para reparo de veículos.
-   `vehiclemod` — Para reparo e modificação de veículos.
-   `qbx_core` — (Opcional) Para notificações e dados de job/gang, se usado como alternativa ao `qb-core`.
-   `ox_fuel` — (Opcional) Se `Config.Fuel` estiver configurado para 'ox_fuel'.
-   `ox_inventory`, `ps-inventory`, `lj-inventory`, `qb-inventory` — (Opcional) Sistemas de inventário detectados automaticamente.
-   `ND_Police` — (Opcional) Para algemar/desalgemar jogadores.
-   `qb-clothing` — (Opcional) Para abrir o menu de roupas.
-   `qb-phone` (renewed) — (Opcional) Para integração com o sistema de telefone renovado.
-   `mri_Qbox` — (Opcional) Para gerenciamento do sistema VIP.
-   Cloudflare SFU — (Opcional) Para streaming de tela WebRTC (requer configuração `server/server_secrets.json`).

### Schema do Banco de Dados

O recurso utiliza o banco de dados MySQL para persistir logs, configurações, permissões e dados de Master Admin. Ele inclui um sistema de migração para tabelas de permissões legadas e gerencia tabelas para:

-   Permissões (ACEs)
-   Logs de ações administrativas
-   Configurações globais do painel
-   Bypasses de Master Admin

### Permissões

O `mri_Qadmin` utiliza um sistema de permissões robusto baseado em ACEs (Access Control Entries) do FiveM, gerenciado via `ox_lib`. As permissões são hierárquicas e podem ser atribuídas a grupos ou diretamente a jogadores.

-   **`qadmin.open`**: Permissão básica para abrir o painel de administração.
-   **`qadmin.master`**: Concede acesso total e bypass a todas as verificações de permissão. Pode ser atribuída via console.
-   **`qadmin.action.noclip`**: Permite o uso do comando `/nc` para ativar/desativar o modo noclip.
-   **`qadmin.action.enable_wall`**: Permite o uso do comando `/wall` para ativar/desativar o ESP/Wallhack.
-   **Grupos de Permissão**: O sistema suporta a criação e gerenciamento de grupos de permissão personalizados, com sincronização automática de roles de administrador/god do QBCore para o grupo 'god' do `mri_Qadmin`.

## Comandos

| Comando | Descrição |
|---|---|
| `/adm` | Abre a interface do painel de administração. Requer permissão `qadmin.open`. |
| `/nc` | Ativa/desativa o modo noclip. Requer permissão `qadmin.action.noclip`. |
| `/vector2`, `/vec2` | Copia as coordenadas Vector2 atuais para a área de transferência. |
| `/vector3`, `/vec3` | Copia as coordenadas Vector3 atuais para a área de transferência. |
| `/vector4`, `/vec4` | Copia as coordenadas Vector4 atuais para a área de transferência. |
| `/heading` | Copia a direção (heading) atual para a área de transferência. |
| `/setammo` | Define a munição da arma atual para 999. |
| `mri_qadmin.setmaster [target]` | (Console Only) Define um jogador como Master Admin, concedendo a permissão `qadmin.master`. |
| `mri_qadmin.removemaster [target]` | (Console Only) Remove o status de Master Admin de um jogador. |
| `mri_qadmin.debugperms [target]` | (Console Only) Exibe informações detalhadas de permissão para um jogador alvo. |
| `mri_qadmin.purgemasters` | (Console Only) Limpa todos os bypasses de Master Admin do banco de dados e da sessão. |
| `mri_qadmin.inspectdb` | (Console Only) Inspeciona tabelas de banco de dados relacionadas a permissões em busca de linhas mestre ocultas ou tabelas legadas. |
| `/wall` | Ativa/desativa o ESP/Wallhack para o jogador. Requer permissão `qadmin.action.enable_wall`. |

## Exports

### Server

| Export | Descrição |
|---|---|
| `AddLog(resource, category, level, message, data, source)` | Adiciona uma entrada de log ao sistema, gerenciando armazenamento, webhooks do Discord e transmissão no jogo. |
| `_G.GetAllDynamicActions()` | Retorna todas as ações dinâmicas configuradas (Actions, PlayerActions, OtherActions). |
| `_G.GetCommandsList(source)` | Retorna uma lista filtrada de comandos registrados, excluindo os da blacklist. |
| `_G.GetGroupsData()` | Retorna uma lista estruturada de todos os jobs e gangs com seus membros online e offline. |
| `_G.GetItemsList()` | Retorna uma lista formatada de todos os itens disponíveis no sistema de inventário do servidor. |
| `_G.GetTargetData(targetSrc)` | Recupera e formata dados do jogador alvo (nome, citizen ID, source) para logging. |
| `exports['mri_Qadmin']:RegisterPlugin(manifest)` | Registra uma página de administração de um plugin externo no `mri_Qadmin`. |
| `exports['mri_Qadmin']:UnregisterPlugin(id)` | Desregistra um plugin previamente registrado. |
| `_G.GetUserPermissions(source)` | Retorna uma lista de todas as permissões que um jogador possui. |
| `_G.getPlayers(page, pageSize, search)` | Recupera uma lista paginada e pesquisável de jogadores online e offline. |
| `_G.RefreshResources()` | Atualiza a lista de todos os recursos do servidor e seus estados. |
| `_G.GetServerData()` | Recupera várias estatísticas do servidor (contagem de jogadores, dinheiro, veículos, bans). |
| `_G.GetPrimitiveSettings()` | Retorna uma tabela de configurações primitivas. |
| `_G.GetVehiclesList()` | Retorna uma lista ordenada de todos os veículos disponíveis no servidor. |
| `_G.HasPerms(source, perms)` | Verifica se um jogador possui uma ou mais permissões especificadas, incluindo bypass de master e principals de job/gang do QBCore. |
| `_G.CheckPerms(source, perms)` | Verifica se um jogador possui permissões e o notifica caso não tenha. |
| `_G.IsPlayerInPrincipal(source, principal)` | Verifica se um jogador (via qualquer identificador) pertence a um principal (grupo) específico. |
| `_G.GetValue(data, key)` | Extrai um valor de forma segura de uma tabela `selectedData`, tratando o formato `{value = x}`. |
| `_G.CheckDataFromKey(key)` | Recupera dados de ação de `Config.Actions`, `Config.PlayerActions` ou `Config.OtherActions` com base em uma chave. |
| `_G.CheckAlreadyPlate(plate)` | Verifica se uma placa de veículo já existe no banco de dados. |
| `_G.GeneratePlate()` | Gera uma placa de veículo aleatória e única. |
| `_G.CheckRoutingbucket(source, target)` | Define o routing bucket do jogador de origem para corresponder ao do jogador alvo. |
| `_G.RGBToHex(rgbStr)` | Converte uma string "R, G, B" para uma string hexadecimal "#RRGGBB". |
| `_G.NormalizeIdentifier(id)` | Limpa e normaliza uma string de identificador de jogador. |
| `_G.NormalizePrincipal(id)` | Normaliza um identificador para o formato de principal do FiveM (ex: `identifier.license:xxx`). |
| `_G.GetAdminPlayers()` | Retorna uma tabela de IDs de source para todos os jogadores online com permissão `qadmin.open`. |

## Estrutura de arquivos 📁

```
mri_Qadmin/
├── client/
├── server/
├── shared/
└── web/
└── fxmanifest.lua
```

## Observações importantes ⚠️

-   O sistema de permissões é baseado em ACEs do FiveM e pode ser migrado de tabelas legadas.
-   A funcionalidade de streaming de tela WebRTC pode exigir a configuração de `server/server_secrets.json` para provedores como Cloudflare SFU.
-   O painel possui uma interface de usuário (NUI) construída em React, oferecendo uma experiência responsiva e dinâmica.
-   O sistema de logs é altamente configurável, permitindo o envio de logs detalhados para webhooks do Discord por categoria.
-   Há sincronização automática de roles de administrador/god do QBCore para o grupo 'god' do `mri_Qadmin`.
