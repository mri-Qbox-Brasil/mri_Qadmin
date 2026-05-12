# Nome do Script

> Descrição curta e objetiva do que o script faz.

![FiveM](https://img.shields.io/badge/FiveM-GTA%20V-green?style=flat-square)
![Lua](https://img.shields.io/badge/Lua-5.4-orange?style=flat-square)
![MRI Qbox](https://img.shields.io/badge/MRI%20Qbox-Brasil-blue?style=flat-square)

---

## Dependências

| Recurso | Obrigatório |
|---------|-------------|
| `ox_lib` | Sim |
| `qbx_core` | Sim |

---

## Instalação

1. Adicione a pasta do recurso em `resources/[mri]/`
2. Adicione `ensure nome-do-script` no `server.cfg`
3. Configure o arquivo `shared/config.lua`
4. Reinicie o servidor

---

## Configuração

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `Config.Debug` | `boolean` | `false` | Ativa logs de debug no console |
| `Config.MaxItems` | `number` | `10` | Quantidade máxima de itens permitidos |

---

## Comandos

| Comando | Permissão | Descrição |
|---------|-----------|-----------|
| `/comando` | Jogador | Descrição do que o comando faz |
| `/admincomando` | Admin | Descrição do comando administrativo |

---

## Eventos

### Client → Server

| Evento | Parâmetros | Descrição |
|--------|-----------|-----------|
| `script:client:acao` | `data: table` | Descrição do evento |

### Exports

| Export | Retorno | Descrição |
|--------|---------|-----------|
| `exports['script']:funcao()` | `boolean` | Descrição do export |

---

## Licença

MIT License — MRI Qbox Team Brasil
