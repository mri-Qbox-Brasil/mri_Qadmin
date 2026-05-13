# Mapeamento de Permissões: mri_Qadmin

Este documento serve como a fonte única de verdade para todas as permissões do painel administrativo. Todas as permissões seguem o prefixo `qadmin.`.

## Estrutura
- `qadmin.open`: Permissão básica para abrir o painel.
- `qadmin.master`: Ignora todas as checagens e concede acesso total (Bypass).
- `qadmin.page.*`: Permissões de acesso a abas específicas.
- `qadmin.action.*`: Permissões para ações executáveis (botões).

---

## 📂 Páginas (Tabs)
| Permissão | Label | Descrição | Status |
| :--- | :--- | :--- | :--- |
| `qadmin.page.dashboard` | Dashboard | Visão geral do servidor | ✅ Ativo |
| `qadmin.page.players` | Players | Lista e gerenciamento de jogadores | ✅ Ativo |
| `qadmin.page.groups` | Groups | Gestão de grupos e cargos | ✅ Ativo |
| `qadmin.page.bans` | Bans | Lista de banimentos ativos | ✅ Ativo |
| `qadmin.page.staffchat` | Staff Chat | Chat exclusivo para administradores | ✅ Ativo |
| `qadmin.page.items` | Items | Spawn e gestão de itens | ✅ Ativo |
| `qadmin.page.vehicles` | Vehicles | Gestão e spawn de veículos | ✅ Ativo |
| `qadmin.page.commands` | Commands | Lista de comandos do servidor | ✅ Ativo |
| `qadmin.page.actions` | Actions | Gerenciador de ações dinâmicas | ✅ Ativo |
| `qadmin.page.permissions` | Permissions | Editor de permissões por grupo | ✅ Ativo |
| `qadmin.page.resources` | Resources | Gestão de recursos (start/stop) | ✅ Ativo |
| `qadmin.page.settings` | Settings | Configurações do painel | ✅ Ativo |
| `qadmin.page.livemap` | Live Map | Mapa em tempo real | ✅ Ativo |
| `qadmin.page.livescreens` | Live Screens | Wall de telas de jogadores | ✅ Ativo |
| `qadmin.page.devmode` | Dev Mode | Ferramentas de desenvolvedor | ✅ Ativo |
| `qadmin.page.logs` | Logs | Logs de ações administrativas | ⏳ Planejado |
| `qadmin.page.statistics` | Statistics | Métricas detalhadas do servidor | ⏳ Planejado |
| `qadmin.page.reports` | Reports | Sistema de tickets/denúncias | ⏳ Planejado |
| `qadmin.page.terminal` | Terminal | Console interativo | ⏳ Planejado |
| `qadmin.page.staff_point` | Staff Point | Ponto eletrônico para staff | ⏳ Planejado |

---

## ⚡ Ações (Actions)

### Dashboard
| Permissão | Label | Descrição |
| :--- | :--- | :--- |
| `qadmin.action.announcements` | Announcements | Enviar anúncios globais |
| `qadmin.action.info_admin` | Info Admin | Ver estatísticas sensíveis (Dinheiro/Banco) |
| `qadmin.action.view_detailed_logs` | Detailed Logs | Ver logs detalhados por CitizenID |

### Jogadores (Moderación)
| Permissão | Label | Descrição |
| :--- | :--- | :--- |
| `qadmin.action.revive` | Revive | Reviver e curar jogador |
| `qadmin.action.kill_player` | Kill Player | Matar jogador |
| `qadmin.action.kick_player` | Kick Player | Expulsar do servidor |
| `qadmin.action.warn_player` | Warn Player | Aplicar aviso (warn) |
| `qadmin.action.ban_player` | Ban Player | Banir do servidor |
| `qadmin.action.unban_player` | Unban Player | Remover banimento |
| `qadmin.action.verify_player` | Verify Player | Verificar identidade (ver licença) |
| `qadmin.action.delete_character` | Delete Char | Deletar personagem permanentemente |
| `qadmin.action.spectate_player` | Spectate | Observar jogador em tempo real |
| `qadmin.action.freeze_player` | Freeze Player | Congelar movimento do jogador |
| `qadmin.action.bring_player` | Bring Player | Trazer jogador até você |
| `qadmin.action.teleport_to_player` | Go To | Ir até o jogador |
| `qadmin.action.teleport_back` | Return | Voltar para posição anterior |
| `qadmin.action.manage_reports` | Manage Reports | Responder e gerir tickets |
| `qadmin.action.delete_report` | Delete Report | Apagar tickets do sistema |

### Personagem (Economia & RPE)
| Permissão | Label | Descrição |
| :--- | :--- | :--- |
| `qadmin.action.set_job` | Set Job | Mudar emprego do jogador |
| `qadmin.action.set_gang` | Set Gang | Mudar facção/gangue do jogador |
| `qadmin.action.give_money` | Give Money | Dar dinheiro/cripto |
| `qadmin.action.remove_money` | Remove Money | Remover dinheiro/cripto |
| `qadmin.action.set_bucket` | Set Bucket | Mudar instância (routing bucket) |
| `qadmin.action.set_ped` | Set Ped | Mudar modelo de personagem |
| `qadmin.action.clothing_menu` | Clothing Menu | Abrir menu de roupas para o player |
| `qadmin.action.staff_clothing` | Staff Uniform | Aplicar uniforme de staff |

### Itens & Inventário
| Permissão | Label | Descrição |
| :--- | :--- | :--- |
| `qadmin.action.give_item` | Give Item | Spawnar itens no inventário |
| `qadmin.action.clear_inventory` | Clear Inv | Limpar inventário do jogador |
| `qadmin.action.open_inventory` | Open Inv | Abrir inventário alheio |
| `qadmin.action.open_trunk` | Open Trunk | Abrir porta-malas de veículos |
| `qadmin.action.open_stash` | Open Stash | Abrir baús e stashes |

### Veículos
| Permissão | Label | Descrição |
| :--- | :--- | :--- |
| `qadmin.action.spawn_vehicle` | Spawn Vehicle | Gerar veículos temporários |
| `qadmin.action.delete_vehicle` | Delete Vehicle | Apagar veículos do mapa |
| `qadmin.action.admincar` | Admin Car | Gerar e salvar veículo pessoal |
| `qadmin.action.change_plate` | Change Plate | Mudar placa do veículo |
| `qadmin.action.fix_vehicle` | Fix Vehicle | Consertar veículo instantaneamente |
| `qadmin.action.change_vehicle_property` | Modify Stock | Alterar estoque ou propriedades |

### Self & Utils
| Permissão | Label | Descrição |
| :--- | :--- | :--- |
| `qadmin.action.god_mode` | God Mode | Imunidade a dano |
| `qadmin.action.noclip` | Noclip | Atravessar paredes e voar |
| `qadmin.action.invisible` | Invisibility | Ficar invisível para outros |
| `qadmin.action.tag` | Player Tags | Ver nomes/IDs acima dos players |
| `qadmin.action.staff_clock_in` | Clock In | Entrar em serviço |
| `qadmin.action.staff_clock_out` | Clock Out | Sair de serviço |
| `qadmin.action.screen_capture` | Screen Capture | Tirar print da tela do player |
| `qadmin.action.enable_wall` | Live Wall | Ativar wall de telas ao vivo |
| `qadmin.action.change_resource` | Resources | Gerenciar scripts (start/stop) |
| `qadmin.action.server_time` | Server Time | Alterar clima e hora global |
| `qadmin.commands` | Commands List | Ver a lista de comandos |

---
*Atualizado em: 17/04/2026*
