# mri_Qadmin - Manual Funcional

`mri_Qadmin` é um painel de administração abrangente para servidores FiveM que utilizam QBCore ou Qbox. Ele oferece ferramentas extensivas para gerenciamento de servidor, controle de jogadores, manipulação de mundo, monitoramento em tempo real e um robusto sistema de logs, destinado a administradores e equipes de moderação.

## O que o recurso faz

O `mri_Qadmin` fornece uma solução completa para a administração de servidores FiveM. Ele permite que os administradores gerenciem jogadores de forma detalhada, incluindo informações de identificação, dados de trabalho e gangue, finanças, status vital e veículos. O recurso oferece controle sobre o ambiente do jogo, como manipulação de tempo e clima, e gerenciamento de recursos do servidor (iniciar, parar, reiniciar). Inclui um sistema de logs detalhado com integração de webhooks do Discord, um sistema de permissões baseado em ACEs com migração de tabelas antigas, e um sistema de plugins para estender suas funcionalidades. Para os jogadores, o recurso permite uma experiência de jogo mais justa e monitorada, garantindo que as regras sejam aplicadas e que o servidor funcione sem problemas.

## Funcionalidades principais

- **Gerenciamento de Permissões**: Sistema de permissões baseado em ACEs, com grupos, "Master Admin" e sincronização automática com cargos de administrador/deus do QBCore. Inclui UI para gerenciar grupos e permissões.
- **Gerenciamento de Jogadores**: Lista completa de jogadores (online/offline), informações detalhadas (IDs, emprego, gangue, dinheiro, vitais, veículos, banimentos), ações como definir emprego/gangue/permissões, remover estresse, definir vitais, kickar, avisar, banir/desbanir, deletar personagem.
- **Gerenciamento de Veículos**: Listar, spawnar/dar veículos com placas e modificações personalizadas, salvar carros de admin, alterar estado do veículo, mudar placas, consertar veículos e deletar veículos por placa.
- **Gerenciamento de Recursos**: Listar todos os recursos do servidor com status, autor, versão e descrição; iniciar, parar e reiniciar recursos; verificar atualizações.
- **Monitoramento e Estatísticas do Servidor**: Dashboard com estatísticas (jogadores online, personagens totais, veículos, banimentos, dinheiro), mapa ao vivo e transmissão de tela ao vivo (WebRTC).
- **Sistema de Logs**: Registro detalhado de ações administrativas em banco de dados, buffer em memória e webhooks do Discord (configurável por categoria).
- **Sistema de Plugins**: Permite que outros recursos registrem páginas de administração personalizadas dentro da UI do `mri_Qadmin`.
- **Wall ESP**: Funcionalidade de ESP/Wallhack apenas para administradores, com cores configuráveis para diferentes grupos de permissão, jogadores mortos e invisíveis.

## Como funciona

1. O administrador abre o painel de administração utilizando o comando `/adm` no chat.
2. Através da interface de usuário (UI), o administrador navega pelas diversas seções disponíveis, como gerenciamento de jogadores, veículos, recursos ou configurações.
3. O administrador seleciona uma ação específica (ex: banir um jogador, iniciar um recurso) ou ajusta uma configuração.
4. O sistema executa a ação solicitada, aplicando as mudanças no servidor e registrando a atividade no sistema de logs para auditoria.

## Configurações disponíveis

As opções de configuração são gerenciadas principalmente através do arquivo `shared/config.lua` ou equivalente, e algumas podem ser ajustadas via UI e persistidas no banco de dados.

- `Config.Fuel`: Sistema de combustível em uso (`cdn-fuel`, `ps-fuel`, `LegacyFuel`, `ox_fuel`).
- `Config.Dealership`: Sistema de concessionária em uso (`mri`, `ps-dealerships`, `none`).
- `Config.OpenPanelPerms`: Permissões necessárias para abrir o painel de administração (padrão `qadmin.open`).
- `Config.RenewedPhone`: Booleano, indica se o `qb-phone` da versão "renewed" está em uso.
- `Config.SupportedLanguages`: Tabela de idiomas suportados para a UI.
- `Config.Keybindings`: Booleano, habilita/desabilita atalhos de teclado.
- `Config.AdminKey`: Tecla para abrir o painel de administração.
- `Config.NoclipKey`: Tecla para ativar/desativar o modo noclip.
- `Config.Debug`: Booleano, habilita impressões de depuração no console.
- `Config.QBCoreAutoSync`: Booleano, promove automaticamente jogadores com cargo 'admin'/'god' do QBCore para o grupo 'god' do `mri_Qadmin`.
- `Config.DefaultGarage`: Nome do garagem padrão para dar veículos.
- `Config.VehicleImages`: URL personalizada para imagens de veículos.
- `Config.MapBaseUrl`: URL base personalizada para tiles do mapa ao vivo.
- `Config.SignalingProvider`: Backend de sinalização WebRTC (`fivem-native`, `websocket`, `cloudflare-sfu`).
- `Config.WebRTCUrl`: URL do WebSocket para WebRTC (se `SignalingProvider` for `websocket`).
- `Config.Actions`, `Config.PlayerActions`, `Config.OtherActions`: Tabelas para ações administrativas personalizadas.
- `Config.Logs`: Configurações do sistema de logs.
  - `Webhooks`: Tabela de webhooks do Discord por categoria de log e um `Fallback`.
  - `ForwardEvent`: Evento de servidor personalizado para encaminhar logs.
  - `DBEnabled`: Booleano, persiste logs no banco de dados.
  - `MaxMemory`: Buffer máximo de logs em memória.
  - `ResourceMode`: `blacklist` ou `whitelist` para processamento de logs.
  - `ResourceEntries`: Sobrescritas de log por recurso.
  - `Categories`: Categorias de log exibidas no painel.
- `Config.Inventory`: Sistema de inventário auto-detectado (`qb-inventory`, `ox_inventory`, `ps-inventory`, `lj-inventory`).

### Permissões

O `mri_Qadmin` utiliza um sistema de permissões robusto baseado em ACEs do FiveM, permitindo controle granular sobre o acesso às funcionalidades.

- **Sistema de ACEs**: As permissões são gerenciadas através de `lib.addAce` e `lib.removeAce`, permitindo a atribuição de permissões a grupos e identificadores de jogadores.
- **Master Admin**: Existe um status de "Master Admin" que concede acesso total (`qadmin.master`), ignorando outras verificações de permissão. Este status pode ser gerenciado via comandos de console.
- **Sincronização QBCore**: O recurso pode ser configurado para sincronizar automaticamente jogadores com cargos de 'admin' ou 'god' do QBCore para o grupo 'god' do `mri_Qadmin`.
- **Permissões Específicas**:
  - `qadmin.open`: Permissão para abrir o painel de administração.
  - `qadmin.action.noclip`: Permissão para usar o comando de noclip.
  - `qadmin.action.enable_wall`: Permissão para ativar o ESP/Wallhack.
  - `qadmin.master`: Permissão de acesso total (Master Admin).

## Comandos disponíveis

| Comando | Descrição |
|---------|-----------|
| `/adm` | Abre o menu de administração. |
| `/nc` | Ativa/desativa o modo noclip. |
| `/vector2` | Copia as coordenadas vector2 para a área de transferência. |
| `/vec2` | Copia as coordenadas vector2 para a área de transferência. |
| `/vector3` | Copia as coordenadas vector3 para a área de transferência. |
| `/vec3` | Copia as coordenadas vector3 para a área de transferência. |
| `/vector4` | Copia as coordenadas vector4 para a área de transferência. |
| `/vec4` | Copia as coordenadas vector4 para a área de transferência. |
| `/heading` | Copia a direção (heading) para a área de transferência. |
| `/setammo` | Define a munição da arma atual para 999. |
| `mri_qadmin.setmaster [target]` | (Console Only) Define um jogador como Master Admin, concedendo a permissão `qadmin.master`. |
| `mri_
