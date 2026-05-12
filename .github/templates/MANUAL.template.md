# Manual — Nome do Script

> Guia completo para instalação, configuração e uso do script.

---

## O que este script faz

Descrição detalhada das funcionalidades principais, explicando o que o script oferece para o servidor e para os jogadores.

---

## Requisitos

- **FiveM** atualizado
- **ox_lib** instalado e iniciado antes deste recurso
- **qbx_core** instalado e configurado

---

## Instalação

### 1. Download

Baixe a última versão em **Releases** e extraia o conteúdo.

### 2. Adicionar ao servidor

```
resources/
└── [mri]/
    └── nome-do-script/   ← pasta aqui
```

### 3. server.cfg

```cfg
ensure nome-do-script
```

### 4. Configuração

Abra `shared/config.lua` e ajuste as opções conforme necessário (veja seção [Configuração](#configuração)).

---

## Configuração

### Config.Debug

```lua
Config.Debug = false
```

Ativa mensagens de debug no console do servidor e do cliente. Desative em produção.

### Config.MaxItems

```lua
Config.MaxItems = 10
```

Define a quantidade máxima de itens que um jogador pode carregar.

---

## Comandos

### Para jogadores

#### `/comando`

Descrição do que o comando faz para o jogador.

**Uso:** `/comando [argumento]`

---

### Para administradores

#### `/admincomando [id]`

Descrição do que o comando administrativo faz.

**Uso:** `/admincomando 1`
**Permissão:** `admin`

---

## Perguntas frequentes

**O script não inicia, o que verifico?**
Confirme que todas as dependências estão listadas antes deste recurso no `server.cfg`.

**Como desativar as notificações?**
Defina `Config.Notificacoes = false` no `shared/config.lua`.

---

## Suporte

- Discord: [MRI Qbox Brasil](https://discord.gg/uEfGD4mmVh)
- Issues: abra uma issue no repositório do GitHub
