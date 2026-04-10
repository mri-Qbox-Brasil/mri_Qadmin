# MRI QAdmin

Painel Administrativo Profissional e Moderno para servidores Qbox e QbCore.

[Read in English](README.en.md)

## 🌟 Funcionalidades Principais

- **Dashboard Detalhada**: Visão geral do status do servidor, jogadores online e métricas.
- **Gerenciamento Completo de Jogadores**:
  - Lista de jogadores online/offline.
  - Ações Rápidas: Reviver, Curar, Matar, Congelar, Espectar, Teleportar.
  - Punições: Banir, Kickar, Avisar (Warn).
  - Economia: Adicionar/Remover Dinheiro (Dinheiro, Banco, Crypto).
  - Inventário: Visualizar e Limpar inventário local ou offline, Dar Itens.
  - Veículos: Visualizar veículos do jogador, Spawnar, Deletar (DV), Abrir Porta-malas, Consertar, Reabastecer.
  - Personalização: Menu de Roupas, Setar Ped.
- **Gerenciamento de Grupos**:
  - Controlar Empregos (Jobs) e Gangues facilmente.
- **Sistema Avançado de Banimentos**:
  - Lista completa de banimentos e gerenciamento intuitivo no painel.
- **Gerenciamento de Veículos**:
  - Spawn de veículos administrativos, tunagem máxima e gerenciamento das garagens.
- **Banco de Dados de Itens**:
  - Pesquisar itens por nome base e facilmente entregar para qualquer jogador.
- **Desenvolvedor e Ferramentas**:
  - Chat integrado para a equipe da STAFF.
  - Menu de Desenvolvedor de Veículos.
  - Informações de entidades, gerenciamento de buckets de roteamento.
  - Copiar Coordenadas diretamente.
  - **Wall (ESP) Dinâmico**: Visualização de jogadores (Cores personalizadas para mortos, invisíveis, ou através de Cargos ACE).
- **Visualização ao Vivo Avançada**:
  - **Live Keyboard Visualizer**: Veja as teclas pressionadas pelo jogador em tempo real durante a observação (Suporte a Numpad e Mouse).
  - **Mapa Dinâmico**: Reset inteligente de visão, filtros avançados de jogadores e integração com live screens.
- **Altamente Customizável**:
  - Temas Claro/Escuro.
  - Cores dinâmicas (Suporte a Hex, RGB, HSL para destaque do painel).
  - **Auto-Scaling Inteligente**: O painel se ajusta automaticamente para resoluções acima de 1920px (4K, Ultra-wide) e é otimizado para telas menores (1366x768).
  - WebRTC nativo ou Cloudflare SFU para visualizações ao vivo avançadas.
- **Sistema de Permissões Híbrido e Dinâmico**:
  - Controle granular por Licença, Personagem, Job ou Gang.
  - Sincronização em tempo real de heranças e permissões.
  - **Permission Wizard (NOVO)**: Assistente guiado para criação de permissões complexas (Alvo -> Herança Opcional -> ACEs -> Resumo).

## 📦 Dependências Necessárias

Para garantir que o MRI QAdmin funcione perfeitamente, os seguintes recursos são necessários:

- `ox_lib`
- `oxmysql`
- `qb-core` ou `qbx_core` (Framework)

## 🛡️ Sistema de Permissões Híbrido

O MRI QAdmin utiliza um modelo avançado de controle de acesso (Hybrid ACL) que permite uma gestão flexível e poderosa:

- **Global (`license:xxxx`)**: Permissões vinculadas à conta do jogador. Valem para todos os personagens.
- **Administrativo (`group.xxxx`)**: Grupos ACE padronizados (ex: `group.admin`, `group.mod`).
- **Personagem (`char:citizenid`)**: Permissões específicas para um único personagem.
- **Emprego/Gangue (`job.name` / `gang.name`)**: Permissões automáticas baseadas no cargo atual do jogador (ex: `job.police`).

### Hierarquia e Precedência

A hierarquia lógica recomendada é `Licença > Grupo > Personagem > Job`. As permissões são acumulativas e injetadas dinamicamente na sessão do jogador ao logar ou trocar de cargo/personagem, sem necessidade de reconexão.

## 💻 Comandos e Permissões (Console de Servidor)

Você pode gerenciar permissões fundamentais usando o terminal (console) do próprio servidor:

### `mri_qadmin.setmaster [id/license]`

Concede o acesso de **Master Admin** (Painel Completo com controle total) de forma imediata e permanente.
**Exemplos:**

- `mri_qadmin.setmaster 1` (ID online)
- `mri_qadmin.setmaster license:1234...` (License)

### `mri_qadmin.addpermission [id/license/prefix] [permissão_ou_grupo]`

_(Avançado)_ Concede uma permissão ou grupo permanentemente no banco de dados.
**Exemplos:**

- `mri_qadmin.addpermission license:abcd... group.admin` (Adiciona ao Grupo Admin).
- `mri_qadmin.addpermission char:ABC12345 group.mod` (Dá Mod para um personagem específico).
- `mri_qadmin.addpermission job.police qadmin.action.revive` (Dá permissão de reviver para TODA a polícia).

## 🚀 Instalação

1.  Baixe a versão mais recente do MRI QAdmin.
2.  Extraia para a pasta `resources` do seu servidor.
3.  Importe o arquivo `database.sql` para o seu banco de dados.
4.  Adicione `ensure mri_Qadmin` ao seu `server.cfg`.
5.  Certifique-se de que o recurso tenha permissões para executar comandos de ACE (se necessário).

## 🛠️ API / Exports para Desenvolvedores

O MRI QAdmin expõe diversas funções úteis para integração com outros sistemas.

### Server-side Exports

#### `HasPerms(source, node)`

Verifica se um jogador possui uma permissão ACE específica ou pertence a um grupo.

```lua
local hasAccess = exports.mri_Qadmin:HasPerms(source, 'qadmin.page.dashboard')
```

#### `CheckPerms(source, node)`

Verifica a permissão e envia uma notificação de erro ao jogador caso ele não tenha acesso.

```lua
if exports.mri_Qadmin:CheckPerms(source, 'qadmin.action.revive') then
    -- Executar revival
end
```

#### `IsPlayerInPrincipal(source, principal)`

Verifica se o jogador pertence a um principal (grupo) específico.

```lua
if exports.mri_Qadmin:IsPlayerInPrincipal(source, 'group.admin') then
    print("O jogador é um administrador!")
end
```

#### `GeneratePlate()`

Gera uma placa de veículo aleatória de 8 caracteres que não existe no banco de dados.

```lua
local newPlate = exports.mri_Qadmin:GeneratePlate()
```

### Client-side Exports

#### `ToggleUI(show)`

Abre ou fecha o painel administrativo.

```lua
exports.mri_Qadmin:ToggleUI(true) -- Abre
```

#### `OpenUI()`

Atalho para abrir o painel.

```lua
exports.mri_Qadmin:OpenUI()
```

#### `IsMenuVisible()`

Retorna `true` se o painel estiver aberto na tela.

```lua
local isOpen = exports.mri_Qadmin:IsMenuVisible()
```

## 👏 Créditos e Agradecimentos

Este projeto é uma versão fortemente modificada, aprimorada e modernizada inspirada no excelente **ps-adminmenu**.
Expressamos nossa sincera gratidão à equipe do [Project Sloth](https://github.com/Project-Sloth) e contribuidores pelo trabalho original para fundação na comunidade FiveM.

## 📄 Licença

Este projeto está licenciado sob a **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**.
Você pode compartilhar e adaptar o material, sob as condições que:

- Você dê os devidos créditos.
- Você **NÃO PODE** usar este material para fins comerciais (não pode ser vendido).
- Se você modificar, você deve distribuir suas contribuições sob a mesma licença.

Leia o arquivo [LICENSE](LICENSE) completo para todos os detalhes legais.
