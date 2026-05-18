# Permissões — mri_Qadmin

Fonte única de verdade para todas as permissões do painel. Todas as nativas seguem o prefixo `qadmin.`.

## Estrutura

| Prefixo | Finalidade |
| :--- | :--- |
| `qadmin.open` | Permissão básica para abrir o painel |
| `qadmin.master` | Bypass total — ignora todas as checagens |
| `qadmin.page.*` | Acesso a abas específicas |
| `qadmin.action.*` | Ações executáveis dentro das abas |
| `qadmin.commands` | Acesso à lista de comandos |

---

## Origem das permissões

O servidor é a **única fonte de verdade**. As permissões nunca são definidas no frontend.

```
server/permissions.lua  ──►  GetPermissionDefinitions()  ──►  data_sync.lua
                         ──►  GetCategoryDefinitions()   ──►  NUI (AppState)
                                                                │
                                                         GroupEditor renderiza
                                                         categorias e checkboxes
```

Plugins registram suas próprias permissões via export — veja a seção [Plugins](#plugins--permissões-de-scripts-externos) abaixo.

---

## Páginas (Tabs)

| Permissão | Aba | Categoria | Status |
| :--- | :--- | :--- | :--- |
| `qadmin.page.dashboard` | Dashboard | dashboard | ✅ Ativo |
| `qadmin.page.players` | Jogadores | players | ✅ Ativo |
| `qadmin.page.groups` | Grupos | groups | ✅ Ativo |
| `qadmin.page.staffchat` | Staff Chat | staffchat | ✅ Ativo |
| `qadmin.page.items` | Itens | items | ✅ Ativo |
| `qadmin.page.vehicles` | Veículos | vehicles | ✅ Ativo |
| `qadmin.page.commands` | Comandos | commands | ✅ Ativo |
| `qadmin.page.actions` | Ações | actions | ✅ Ativo |
| `qadmin.page.permissions` | Permissões | permissions | ✅ Ativo |
| `qadmin.page.resources` | Recursos | resources | ✅ Ativo |
| `qadmin.page.settings` | Configurações | settings | ✅ Ativo |
| `qadmin.page.livemap` | Mapa ao Vivo | livemap | ✅ Ativo |
| `qadmin.page.livescreens` | Telas ao Vivo | livescreens | ✅ Ativo |
| `qadmin.page.devmode` | Dev Mode | devmode | ✅ Ativo |
| `qadmin.page.vip` | VIP | vip | ✅ Ativo |
| `qadmin.page.logs` | Logs | dashboard | ⏳ Planejado |
| `qadmin.page.statistics` | Estatísticas | dashboard | ⏳ Planejado |
| `qadmin.page.reports` | Reports | players | ⏳ Planejado |
| `qadmin.page.terminal` | Terminal | commands | ⏳ Planejado |
| `qadmin.page.staff_point` | Ponto Staff | other | ⏳ Planejado |

> `qadmin.page.bans` foi removido — banimentos agora são um filtro dentro da tela de Jogadores.

---

## Ações (Actions)

### Dashboard
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.action.announcements` | Enviar anúncios globais |
| `qadmin.action.clear_chat` | Limpar o chat do servidor |
| `qadmin.action.info_admin` | Ver estatísticas sensíveis (Dinheiro/Banco) |
| `qadmin.action.view_detailed_logs` | Ver logs detalhados por CitizenID |

### Jogadores
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.action.view_player_identifiers` | Ver licença e identificadores do jogador |
| `qadmin.action.track_player` | Rastrear posição do jogador no mapa |
| `qadmin.action.set_vital` | Alterar vida/armadura do jogador |
| `qadmin.action.tag` | Ver nomes/IDs acima dos players |
| `qadmin.action.manage_reports` | Responder e gerir tickets |
| `qadmin.action.delete_report` | Apagar tickets do sistema |
| `qadmin.action.revive` | Reviver e curar jogador |
| `qadmin.action.revive_all` | Reviver todos os jogadores |
| `qadmin.action.bring_player` | Trazer jogador até você |
| `qadmin.action.teleport_to_player` | Ir até o jogador |
| `qadmin.action.teleport_back` | Voltar para posição anterior |
| `qadmin.action.teleport_to_coords` | Teleportar para coordenadas específicas |
| `qadmin.action.teleport_to_location` | Teleportar para localização predefinida |
| `qadmin.action.teleport_to_marker` | Teleportar para marcador no mapa |
| `qadmin.action.set_job` | Mudar emprego do jogador |
| `qadmin.action.set_gang` | Mudar facção/gangue do jogador |
| `qadmin.action.fire_job` | Demitir jogador do emprego |
| `qadmin.action.fire_gang` | Remover jogador da facção |
| `qadmin.action.set_bucket` | Mudar instância (routing bucket) |
| `qadmin.action.get_bucket` | Ver bucket atual do jogador |
| `qadmin.action.give_money` | Dar dinheiro para jogador |
| `qadmin.action.remove_money` | Remover dinheiro do jogador |
| `qadmin.action.give_money_all` | Dar dinheiro a todos os jogadores |
| `qadmin.action.remove_stress` | Remover stress do jogador |
| `qadmin.action.clothing_menu` | Abrir menu de roupas para o player |
| `qadmin.action.set_ped` | Mudar modelo de personagem |
| `qadmin.action.staff_clothing` | Aplicar uniforme de staff |
| `qadmin.action.ban_player` | Banir do servidor |
| `qadmin.action.unban_player` | Remover banimento |

### Moderação
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.action.kill_player` | Matar jogador |
| `qadmin.action.kick_player` | Expulsar do servidor |
| `qadmin.action.warn_player` | Aplicar aviso (warn) |
| `qadmin.action.verify_player` | Verificar identidade (ver licença) |
| `qadmin.action.delete_character` | Deletar personagem permanentemente |
| `qadmin.action.spectate_player` | Observar jogador em tempo real |
| `qadmin.action.freeze_player` | Congelar movimento do jogador |
| `qadmin.action.mute_player` | Mutar jogador no chat de voz |
| `qadmin.action.blackout` | Apagar tela de todos os jogadores |
| `qadmin.action.toggle_cuffs` | Algemar/desalgemar jogador |
| `qadmin.action.drunk_player` | Aplicar efeito de embriaguez |
| `qadmin.action.play_sound` | Reproduzir som para o jogador |

### Staff Chat
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.action.staff_chat_send` | Enviar mensagens no Staff Chat |

### Itens & Inventário
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.action.give_item` | Dar itens ao inventário do jogador |
| `qadmin.action.give_item_all` | Dar itens a todos os jogadores |
| `qadmin.action.clear_inventory` | Limpar inventário do jogador |
| `qadmin.action.clear_inventory_offline` | Limpar inventário de jogador offline |
| `qadmin.action.open_inventory` | Abrir inventário alheio |
| `qadmin.action.view_inventory` | Visualizar inventário sem editar |
| `qadmin.action.modify_inventory` | Editar itens dentro do inventário aberto |
| `qadmin.action.open_trunk` | Abrir porta-malas de veículos |
| `qadmin.action.open_stash` | Abrir baús e stashes |
| `qadmin.action.copy_inventory` | Copiar inventário entre jogadores |

### Veículos
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.action.spawn_vehicle` | Spawnar veículo temporário |
| `qadmin.action.delete_vehicle` | Apagar veículo do mapa |
| `qadmin.action.admincar` | Gerar e salvar veículo pessoal |
| `qadmin.action.give_car` | Dar veículo permanente ao jogador |
| `qadmin.action.change_plate` | Mudar placa do veículo |
| `qadmin.action.fix_vehicle` | Consertar veículo de outro jogador |
| `qadmin.action.fix_vehicle_for` | Consertar veículo para um jogador específico |
| `qadmin.action.fix_self_vehicle` | Consertar o próprio veículo |
| `qadmin.action.refuel_vehicle` | Abastecer veículo |
| `qadmin.action.max_mods` | Maximizar modificações do veículo |
| `qadmin.action.manage_vehicles` | Gerenciar estoque de veículos |
| `qadmin.action.change_vehicle_property` | Alterar propriedades do veículo |
| `qadmin.action.change_vehicle_state` | Alterar estado do veículo (motor, travas etc.) |
| `qadmin.action.update_vehicle_stock` | Atualizar estoque de veículos |

### Habilidades (Self)
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.action.revive_self` | Reviver a si mesmo |
| `qadmin.action.god_mode` | Imunidade a dano |
| `qadmin.action.noclip` | Atravessar paredes e voar |
| `qadmin.action.invisible` | Ficar invisível para outros jogadores |
| `qadmin.action.set_ammo` | Definir munição de arma |
| `qadmin.action.infinite_ammo` | Munição infinita |
| `qadmin.action.toggle_duty` | Entrar/sair de serviço |
| `qadmin.action.toggle_laser` | Ativar mira laser |
| `qadmin.action.goto_waypoint` | Teleportar para o waypoint do mapa |

### Comandos
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.commands` | Ver e usar a lista de comandos do servidor |

### Recursos
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.action.change_resource` | Iniciar/parar recursos (start/stop) |

### Configurações
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.action.manage_settings` | Alterar configurações do painel |
| `qadmin.action.change_weather` | Mudar o clima do servidor |
| `qadmin.action.change_time` | Mudar a hora do servidor |
| `qadmin.action.server_time` | Sincronizar tempo global do servidor |

### Dev Mode
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.action.toggle_devmode` | Ativar/desativar modo desenvolvedor |
| `qadmin.action.vehicle_dev` | Ferramentas de dev para veículos |
| `qadmin.action.toggle_coords` | Exibir coordenadas na tela |
| `qadmin.action.toggle_blips` | Exibir blips de todos no mapa |
| `qadmin.action.toggle_names` | Exibir nomes acima dos jogadores |
| `qadmin.action.toggle_mock_mode` | Ativar mock de dados (dev/browser) |

### Telas ao Vivo
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.action.screen_capture` | Capturar tela do jogador |
| `qadmin.action.enable_wall` | Ativar wall de telas ao vivo |
| `qadmin.action.manage_wall` | Gerenciar layout do wall |

### VIP
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.action.manage_vip` | Gerenciar VIPs do servidor |

### Outros
| Permissão | Descrição |
| :--- | :--- |
| `qadmin.action.staff_clock_in` | Registrar entrada em serviço |
| `qadmin.action.staff_clock_out` | Registrar saída de serviço |
| `qadmin.action.manage_actions` | Gerenciar ações dinâmicas configuráveis |

---

## Plugins — Permissões de scripts externos

Scripts externos podem registrar suas próprias permissões para aparecerem no editor de grupos do Qadmin. Existem dois caminhos:

### Caminho 1 — via `RegisterPlugin` (recomendado)

Quando o script já chama `RegisterPlugin` para aparecer no sidebar, basta incluir `requiredPerms` no manifest. O Qadmin registra automaticamente as permissões no editor.

```lua
-- server/main.lua do plugin (ex: mri_Qspawn)
exports['mri_Qadmin']:RegisterPlugin({
    id           = 'mri_Qspawn',
    label        = 'Spawns',
    icon         = 'car',
    resource     = 'mri_Qspawn',
    requiredPerms = { 'mri_Qspawn.admin', 'command' },
    -- 'command' é filtrado automaticamente (built-in FiveM)
    -- 'mri_Qspawn.admin' aparece no editor sob a categoria "mri_Qspawn"
})
```

Para fornecer label e descrição por permissão, use `permDefs`:

```lua
exports['mri_Qadmin']:RegisterPlugin({
    id           = 'mri_Qspawn',
    label        = 'Spawns',
    icon         = 'car',
    resource     = 'mri_Qspawn',
    requiredPerms = { 'mri_Qspawn.admin', 'mri_Qspawn.view' },
    permDefs = {
        { id = 'mri_Qspawn.admin', label = 'Administrador',   desc = 'Acesso total ao painel de spawns' },
        { id = 'mri_Qspawn.view',  label = 'Visualizar',      desc = 'Apenas visualizar spawns' },
    },
})
```

### Caminho 2 — via `RegisterPermissions` (scripts sem sidebar)

Para scripts que não precisam de aba no sidebar mas querem expor permissões no editor:

```lua
-- Registra permissões em uma categoria existente ou nova
exports['mri_Qadmin']:RegisterPermissions(
    {
        { id = 'mri_Qshop.open',   label = 'Abrir Loja',    desc = 'Acessar o painel de lojas' },
        { id = 'mri_Qshop.manage', label = 'Gerenciar',     desc = 'Criar e editar lojas' },
    },
    { id = 'mri_Qshop', label = 'Lojas' }  -- categoryDef opcional
)
```

### Comportamento automático

| Situação | O que acontece |
| :--- | :--- |
| Perm sem ponto (ex: `command`, `builtin.everyone`) | Ignorada — são built-ins do FiveM |
| Perm já registrada | Ignorada — sem duplicatas |
| Plugin não fornece `permDefs` | Label = sufixo após o último ponto (`mri_Qspawn.admin` → `admin`) |
| Plugin não fornece `category` em `permDefs` | Categoria = `id` do plugin |
| Plugin reinicia | Re-registro é idempotente — sem duplicatas no DB |
| Grupo `god` já existe | Novas perms são adicionadas dinamicamente via `INSERT IGNORE` + `lib.addAce` |

### Categorias nativas disponíveis

Plugins podem apontar suas perms para uma categoria nativa em vez de criar uma própria:

| id | Label |
| :--- | :--- |
| `dashboard` | Dashboard |
| `players` | Jogadores |
| `moderation` | Moderação |
| `staffchat` | Staff Chat |
| `items` | Itens |
| `vehicles` | Veículos |
| `self` | Habilidades |
| `actions` | Ações |
| `commands` | Comandos |
| `resources` | Recursos |
| `settings` | Configurações |
| `livemap` | Mapa ao Vivo |
| `livescreens` | Telas ao Vivo |
| `devmode` | Dev Mode |
| `groups` | Grupos |
| `permissions` | Permissões |
| `vip` | VIP |
| `other` | Outros |

---

*Atualizado em: 18/05/2026*
