# mri_Qadmin - Manual Funcional

Um painel de administração abrangente e extensível para servidores FiveM baseados em QBCore e Qbox. Ele oferece gerenciamento extensivo de jogadores, controle de servidor, ferramentas de veículos, integração com sistema VIP, transmissão de tela ao vivo via WebRTC, funcionalidades de ESP/wallhack, ferramentas de manipulação de mundo e uma arquitetura de plugins para módulos externos.

## O que o recurso faz

O `mri_Qadmin` fornece uma interface NUI completa para administradores, permitindo o controle total sobre o ambiente do servidor e a interação com os jogadores. Para os administradores, ele oferece sincronização de dados em tempo real (itens, veículos, comandos, recursos, empregos, gangues, peds, locais, ações, permissões e jogadores), um sistema de permissões robusto com gerenciamento de grupos, um chat dedicado para a equipe, e ferramentas para gerenciar jogadores (visualizar dados, teletransportar, alternar invisibilidade/god mode/noclip, matar, algemar, definir emprego/gangue, silenciar, remover estresse, definir saúde/munição, mudar modelo).

Para os jogadores, o recurso permite que administradores monitorem suas atividades, gerenciem seus inventários (abrindo, removendo, transferindo, copiando, limpando, dando e movendo itens), e controlem veículos (criando, reabastecendo, consertando, modificando, alterando placas e salvando propriedades). Além disso, o `mri_Qadmin` inclui um sistema de logs detalhado com atualizações em tempo real e integração com webhooks do Discord, gerenciamento dinâmico de ações personalizadas, ferramentas de desenvolvimento (modo dev, exibição de coordenadas, laser, scanner de proximidade), integração com sistemas VIP e a capacidade de transmitir a tela de jogadores via WebRTC para fins de monitoramento.

## Funcionalidades principais

-   **Painel de Administração Completo**: Interface NUI abrangente para gerenciamento de servidor e jogadores.
-   **Sistema de Permissões Avançado**: Gerenciamento de grupos e permissões detalhadas, incluindo status de "Master Admin" e bypass.
-   **Gerenciamento de Jogadores**: Visualização de dados, teletransporte, modos especiais (invisibilidade, god mode, noclip), ações de moderação (matar, algemar, silenciar), alteração de trabalho/gangue e saúde/munição.
-   **Controle de Inventário**: Acesso e manipulação de inventários de jogadores, baús e veículos, com atualizações em tempo real.
-   **Ferramentas de Veículos**: Criação, reabastecimento, reparo, modificação e gerenciamento de placas de veículos.
-   **Monitoramento e Logs**: Sistema de logs detalhado com atualizações em tempo real e integração com Discord webhooks.
-   **Transmissão de Tela WebRTC**: Capacidade de transmitir a tela de jogadores para fins de monitoramento.
-   **Sistema de Plugins e Ações Dinâmicas**: Extensibilidade para adicionar novas funcionalidades e ações administrativas personalizadas.
-   **Ferramentas de Desenvolvimento**: Modos de desenvolvedor, exibição de coordenadas, scanner de entidades próximas e ESP/Wallhack.

## Como funciona

1.  Um administrador abre o painel de administração (geralmente via comando `/adm` ou uma tecla configurada).
2.  O painel NUI carrega dados do servidor em tempo real, como jogadores, recursos, logs e configurações, utilizando callbacks e eventos.
3.  O administrador seleciona uma funcionalidade (ex: gerenciar um jogador, um veículo ou um recurso).
4.  As ações são executadas através de callbacks NUI ou comandos, com verificações de permissão robustas no lado do servidor.
5.  O servidor processa a requisição, interage com o framework (QBCore), banco de dados (MySQL) e outros recursos, e envia atualizações de volta ao cliente NUI.

## Configurações disponíveis

As opções de configuração estão disponíveis para personalizar o comportamento do recurso:

-   `Config.Actions`: Define ações administrativas personalizadas.
-   `Config.PlayerActions`: Ações específicas para gerenciamento de jogadores.
-   `Config.OtherActions`: Outras ações administrativas diversas.
-   `Config.VehicleImages`: Configurações para imagens de veículos.
-   `Config.WebRTCUrl`: URL do servidor WebRTC para transmissão de tela.
-   `Config.SignalingProvider`: Provedor de sinalização WebRTC.
-   `Config.Descriptions`: Descrições para elementos da interface.
-   `Config.Options`: Opções gerais do painel.
-   `Config.Inventory`: Define o sistema de inventário em uso (ex: 'ox_inventory').
-   `Config.SupportedLanguages`: Lista de idiomas suportados pelo painel.
-   `Config.AdminKey`: Tecla de atalho para abrir o painel de administração.
-   `Config.NoclipKey`: Tecla de atalho para alternar o modo noclip.
-   `Config.Keybindings`: Booleano para ativar ou desativar os atalhos de teclado.
-   `Config.Fuel`: Define o recurso de combustível em uso (ex: 'ox_fuel').
-   `Config.Dealership`: Define o sistema de concessionária em uso (ex: 'mri', 'ps-dealerships', 'none').
-   `Config.OpenPanelPerms`: Permissões necessárias para abrir o painel de administração.

### Permissões

O `mri_Qadmin` implementa um sistema de permissões robusto, integrado com grupos e ACEs do FiveM:

-   **Grupos**: Administradores podem criar, editar e excluir grupos, atribuindo permissões específicas a cada um. Os grupos podem ser vinculados a ACEs do FiveM para controle granular.
-   **Master Admin**: Um status especial que concede bypass total a todas as permissões do Qadmin. Pode ser concedido e revogado via console usando os comandos `mri_qadmin.setmaster` e `mri_qadmin.removemaster`.
-   **ACEs**: As permissões são gerenciadas através de ACEs do FiveM, permitindo integração com sistemas de permissão existentes.
-   **Permissões Registradas**: Scripts externos podem registrar suas próprias permissões e categorias no painel Qadmin, estendendo suas funcionalidades.
-   **Depuração**: Comandos de console como `mri_qadmin.debugperms` e `mri_qadmin.inspectdb` estão disponíveis para depurar permissões de jogadores e inspecionar o banco de dados em busca de configurações incorretas.

## Comandos disponíveis

| Comando | Descrição |
|---------|-----------|
| `/adm` | Abre o painel de administração. |
| `/nc` | Alterna o modo noclip. |
| `/vector2`, `/vec2` | Copia as coordenadas atuais como Vector2. |
| `/vector3`, `/vec3` | Copia as coordenadas atuais como Vector3. |
| `/vector4`, `/vec4` | Copia as coordenadas atuais como Vector4 (incluindo a direção). |
| `/heading` | Copia a direção atual. |
| `/setammo` | Define a munição para a arma atual. |
| `mri_qadmin.setmaster [target]` | (Console Only) Concede status de "Master Admin" a um jogador (ID, Licença ou Licença2). |
| `mri_qadmin.removemaster [target]` | (Console Only) Revoga status de "Master Admin" de um jogador. |
| `mri_qadmin.debugperms [target]` | (Console Only) Exibe informações detalhadas de depuração de permissões para um jogador. |
| `mri_qadmin.purgemasters` | (Console Only) Limpa todos os bypasses de "Master Admin" do banco de dados e da sessão atual. |
| `mri_qadmin.inspectdb` | (Console Only) Inspeciona tabelas de permissão do Qadmin no banco de dados. |
| `wall` | Alterna o recurso ESP Wallhack para o jogador (requer permissão `qadmin.action.enable_wall`). |

## Eventos

### Callbacks principais

| Callback | Direção | Descrição |
|----------|---------|-----------|
| `GetMessages` | C→S | Recupera mensagens do chat da equipe. |
| `SendMessage` | C→S | Envia uma mensagem para o chat da equipe. |
| `GetStaffPlayers` | C→S | Recupera a lista de jogadores da equipe. |
| `mri_Qadmin:callback:GetPlayerInventory` | C→S | Recupera o inventário de um jogador. |
| `mri_Qadmin:callback:GetVehicleInventory` | C→S | Recupera o inventário de um veículo. |
| `mri_Qadmin:server:RemoveInventoryItem` | C→S | Remove um item do inventário. |
| `mri_Qadmin:server:TransferItemToSelf` | C→S | Transfere um item para o próprio inventário. |
| `mri_Qadmin:server:CopyInventoryToSelf` | C→S | Copia o inventário para o próprio inventário. |
| `mri_Qadmin:server:ClearPlayerInventory` | C→S | Limpa o inventário de um jogador. |
| `mri_Qadmin:server:GiveInventoryItem` | C→S | Dá um item a um jogador. |
| `mri_Qadmin:server:MoveInventoryItem` | C→S | Move um item entre inventários. |
| `mri_Qadmin:server:StartWatchingInventory` | C→S | Inicia o monitoramento de um inventário. |
| `mri_Qadmin:server:StopWatchingInventory` | C→S | Para o monitoramento de um inventário. |
| `StartWatchingPlayer` | C→S | Inicia o monitoramento de um jogador. |
| `StopWatchingPlayer` | C→S | Para o monitoramento de um jogador. |
| `mri_Qadmin:callback:GetLogs` | C→S | Recupera os logs do servidor. |
| `mri_Qadmin:callback:GetLogSettings` | C→S | Recupera as configurações de log. |
| `mri_Qadmin:callback:SaveLogSettings` | C→S | Salva as configurações de log. |
| `getServerInfo` | C→S | Recupera informações do servidor. |
| `getTranslations` | C→S | Recupera as traduções. |
| `mri_Qadmin:callback:GetBans` | C→S | Recupera a lista de banimentos. |
| `sendNUI` | C→S | Envia dados para a NUI. |
| `mri_Qadmin:server:SetGlobalAccentColor` | C→S | Define a cor de destaque global. |
| `setClipboard` | C→S | Define o conteúdo da área de transferência. |
| `hideUI` | C→S | Esconde a interface do usuário. |
| `getData` | C→S | Recupera dados gerais. |
| `clickButton` | C→S | Simula o clique de um botão. |
| `update_vehicle_stock` | C→S | Atualiza o estoque de veículos. |
| `setResourceState` | C→S | Define o estado de um recurso. |
| `getPlayers` | C→S | Recupera a lista de jogadores. |
| `getGroupsData` | C→S | Recupera dados de grupos. |
| `GetPlayerCoords` | C→S | Recupera as coordenadas de um jogador. |
| `GetAllPlayerCoords` | C→S | Recupera as coordenadas de todos os jogadores. |
| `GetPlayerVitals` | C→S | Recupera os sinais vitais de um jogador. |
| `SetPlayerVital` | C→S | Define um sinal vital de um jogador. |
| `getSelfId` | C→S | Recupera o ID do próprio jogador. |
| `executeCommand` | C→S | Executa um comando. |
| `mri_Qadmin:callback:GetMyPermissions` | C→S | Recupera as permissões do jogador. |
| `mri_Qadmin:callback:GetPrincipals` | C→S | Recupera os principais do FiveM. |
| `mri_Qadmin:callback:GetAces` | C→S | Recupera os ACEs do FiveM. |
| `seed_pages` | C→S | Semeia páginas. |
| `mri_Qadmin:callback:GetGroups` | C→S | Recupera os grupos do Qadmin. |
| `mri_Q
