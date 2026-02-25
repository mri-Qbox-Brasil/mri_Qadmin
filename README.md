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
  - WebRTC nativo ou Cloudflare SFU para visualizações ao vivo avançadas.

## 📦 Dependências Necessárias

Para garantir que o MRI QAdmin funcione perfeitamente, os seguintes recursos são necessários:

- `ox_lib`
- `oxmysql`
- `qb-core` ou `qbx_core` (Framework)

## 💻 Comandos e Permissões (Console de Servidor)

O MRI QAdmin gerencia suas permissões de acesso diretamente por Principals/Aces no banco de dados, e são injetadas em tempo real. Você pode gerenciar permissões fundamentais usando o terminal (console) do próprio servidor:

### `mri_qadmin.setmaster [id/license]`
Concede o acesso de **Master Admin** (Painel Completo com controle de Grupo Admin) de forma imediata e permanente no banco de dados para um jogador.
**Exemplos:**
- `mri_qadmin.setmaster 1` (Usando ID do jogador online)
- `mri_qadmin.setmaster license:1234567890abcdef...` (Usando License FiveM)

### `mri_qadmin.addpermission [id/license] [permissão_ou_grupo]`
*(Avançado)* Concede uma permissão específica ou grupo para um ID/License permanentemente, armazenado no banco de dados.
**Exemplos:**
- `mri_qadmin.addpermission 1 group.admin` (Adiciona o jogador ID 1 ao Grupo Admin).
- `mri_qadmin.addpermission license:abcd... qadmin.action.ban_player` (Dá a permissão exata de banir para o jogador).

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
