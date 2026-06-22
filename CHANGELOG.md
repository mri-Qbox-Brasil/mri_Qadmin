## [1.15.1](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.15.0...v1.15.1) (2026-06-22)


### Bug Fixes

* **web:** resolve erros do eslint-plugin-react-hooks v7 (lint verde) ([dc02f6b](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/dc02f6b095437b46966d3035ec06c04080c51ad1))

# [1.15.0](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.14.3...v1.15.0) (2026-06-22)


### Bug Fixes

* bridges NUI do file browser, permissao de delete e versao na UI ([2237e4f](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/2237e4f7dbadc5a02d33d821070f45848d8711ff))
* escreve/cria/exclui arquivos via io cru do Lua (contorna sandbox do FiveM) ([512dae2](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/512dae279d6c77df734ac37095172f127f9756ec))
* escrita via SaveResourceFile (sem truncar) + respeita sandbox ([e70c305](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/e70c3059b19957ca84f3ad362ac9d1dc79e07b4b))
* gera o indice de resources em runtime (file browser) ([ea26157](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/ea26157c71ec76c5761df2d39cde7e70a89e95ac))
* gravacao confiavel (read-back) + fallback SaveResourceFile ([8afbdcd](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/8afbdcd14acc5d8d7694ba6cbe2dedb4b00d647a))
* nao acessa 'package' (indisponivel no Lua do FiveM) na deteccao de SO ([ee99f57](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/ee99f57d33360e0c135d880f80ef74ee815ab2fc))
* **review:** [#7](https://github.com/mri-Qbox-Brasil/mri_Qadmin/issues/7) loadFile nao deixa selectedFile dessincronizado ([be2b30d](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/be2b30df501b4f1249bba56746dd8effb84d91ce))
* **review:** correcoes de seguranca/robustez no file browser (server) ([d0c7a95](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/d0c7a95ea8b770e16ab034dfa39da64788ca46d5)), closes [#1](https://github.com/mri-Qbox-Brasil/mri_Qadmin/issues/1) [#2](https://github.com/mri-Qbox-Brasil/mri_Qadmin/issues/2) [#3](https://github.com/mri-Qbox-Brasil/mri_Qadmin/issues/3) [#4](https://github.com/mri-Qbox-Brasil/mri_Qadmin/issues/4) [#5](https://github.com/mri-Qbox-Brasil/mri_Qadmin/issues/5) [#6](https://github.com/mri-Qbox-Brasil/mri_Qadmin/issues/6) [#9](https://github.com/mri-Qbox-Brasil/mri_Qadmin/issues/9)
* usa MriExpandableSearch do ui-kit e ajusta permissao de exclusao ([4b8090e](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/4b8090e36ee2bcfe8df272ec282f6fd108027565))


### Features

* acoes rapidas de start/stop/restart na lista de resources ([4e0649a](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/4e0649af50c82193365c20ed3c67ec9c3458eb3d))
* aviso "somente leitura (sandbox)" por resource no file browser ([19a9833](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/19a9833927b24621e57e765905f4d43b70861099))
* botao Cancelar no editor de arquivos do resource ([8c35801](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/8c35801ad669e8803af4e903a377c4c0a4249416))
* fallback de escrita via os.execute (copy do temp) p/ contornar sandbox ([5d65e34](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/5d65e347394b9b804eef1e8a83893ac5b9a3679f))
* filtros toggle por estado e padroniza badge para "rodando" ([7e888aa](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/7e888aa5c2136333125df42bde00d4cf09b7a218))
* **review:** [#8](https://github.com/mri-Qbox-Brasil/mri_Qadmin/issues/8) reintroduz i18n na pagina de Resources (file browser) ([28c9650](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/28c96505792b2841dd0ff65b0a532c6abcfd438b))

## [1.11.4](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.11.3...v1.11.4) (2026-05-13)


### Bug Fixes

* pass ai-provider var to callable generate-docs workflow ([30d4243](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/30d4243a16f74e43384fbd06b161ce43021911d3))

## [1.11.3](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.11.2...v1.11.3) (2026-05-12)


### Bug Fixes

* pass AI_CHUNKS variable to generate-docs callable workflow ([9009115](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/90091159dd0660d3f406bf4920c527431cb67d9a))

## [1.11.2](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.11.1...v1.11.2) (2026-05-12)


### Bug Fixes

* add workflow_dispatch to generate-docs ([1356f14](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/1356f1481275718d34b33062d0e6a4c8d3c887b2))

## [1.11.1](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.11.0...v1.11.1) (2026-05-11)


### Bug Fixes

* remove backdrop-blur (nao renderiza no CEF do FiveM) ([dac3dab](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/dac3dab09f76b81cce230b11d73fe40aca6a6d98))

# [1.11.0](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.10.0...v1.11.0) (2026-05-11)


### Features

* htmlPath opcional no manifest do plugin ([4339d9c](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/4339d9c2be96622861a6d9b082cc6118c055c7ed))

# [1.10.0](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.9.9...v1.10.0) (2026-05-11)


### Bug Fixes

* ux setgroup ([8313381](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/831338174a8267654a835717f5ec88ee3894b87d))


### Features

* new ui confirm modal props ([0a62c1f](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/0a62c1f420550d6828feffa286b9991751b74933))
* plugin host registry + MriTabletFrame ([ed6749e](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/ed6749e4bdbfd7e203a764110a4c3feb3ced29a4))
* remove debugs ([d798ad9](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/d798ad98d6b5bf6398cd79f0e4f494f45850d1eb))
* remove yarn ([92b2c05](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/92b2c05e3799a794d9ca8805464da3b84a643960))
* sistema de gerenciamento VIP ([61bd757](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/61bd75731776dc04f31d761c1ecfecf0a89d729b))
* theme color global convar ([8f40be2](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/8f40be2ae5126bb44725bea95a8571982772e71e))
* update uikit ([ff035f0](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/ff035f0b779819aa9e0c37349d1a94c09d2d548d))

## [1.9.9](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.9.8...v1.9.9) (2026-05-07)


### Bug Fixes

* **permissions:** bloqueia rotas não mapeadas quando permissionDefinitions está vazio ([e133bf2](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/e133bf2190375eb7c05a1bc55131528278672ba5))
* **permissions:** corrige ACE e reload de principals ao criar/alterar grupos ([2af757d](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/2af757d4a743f75d48975b0d65fecf79bcbd2ea3))
* **permissions:** re-inicializa dados ao usuário ganhar acesso pela primeira vez ([c598c87](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/c598c87eed69107b02ad6bba300e6e2984bae586))

## [1.9.8](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.9.7...v1.9.8) (2026-05-06)


### Bug Fixes

* fecha o painel ao ativar o modo dev ([b8c4d8a](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/b8c4d8aba4fe14f1325ddfff0ffe75040378b098))
* groups translation ([1e05418](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/1e0541811e7d850fae7f5ec51ced98400310c6c6))
* rebuild web assets ([814bf3a](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/814bf3aa057f78533bdf34052b63403f388cd28e))

## [1.9.7](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.9.6...v1.9.7) (2026-05-06)


### Bug Fixes

* preview de veiculos cabendo corretamente no card ([4d28ae2](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/4d28ae2c274d22e58929c9a09a46054e0bd6d0ab))
* rebuild web assets ([f7fbb46](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/f7fbb46f6f5bc354e0ce2f59d77af8f2e584da38))

## [1.9.6](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.9.5...v1.9.6) (2026-05-06)


### Bug Fixes

* add missing GetAces and GetPrincipals server callbacks ([59b2d89](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/59b2d89310627c462b466cd3e1af29d50da23822))
* declare missing setLoadingPlayers state in Dashboard ([7c0e36e](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/7c0e36e9cb2e6e86bd4228ccb964c541ad635c86))
* **logs:** auto-create logs_settings.json with defaults if missing ([55a50ff](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/55a50ff52afe627aa3dc8bac6d8e1177c6324342))
* **wall:** add missing GetWallGroups NUI callback on client ([f4a443f](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/f4a443f18618f00ec22e7bf7915bfb6a68f7c3dc))
* **wall:** align group colors with mri.group.* principal system ([c1134de](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/c1134de821eb1b938dac1945e26ff84bd6d549b9))

## [1.9.5](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.9.4...v1.9.5) (2026-05-06)


### Bug Fixes

* laser thread 1ms ([bacaf5c](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/bacaf5c9f5e78101fb42c13e571a6843dfddb8ba))

## [1.9.4](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.9.3...v1.9.4) (2026-05-06)


### Bug Fixes

* callback NUI GetGroups na pagina de permissoes ([e76720a](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/e76720a5c92452935b4583cbefb18251dec56c12))
* chaves de tradução nos stat cards do dashboard ([adde393](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/adde39371613766f6da5831d4c3cc1d2fcbf42e7))
* permissões wildcard do modo dev ([1f0b1cb](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/1f0b1cbea9d4df831d39d0e5cf99c4a58ad319ee))
* props do MriActionCard nos quick actions ([03bcc40](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/03bcc40298400346d6d1f43933c8faae8b1bbf95))
* rebuild web assets ([148447f](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/148447f27a37fb38136543cbfe96cad68a506e70))
* scroll e layout do dashboard ([4844c8d](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/4844c8d04103defbd5d1a4ea34f173698c712e39))

## [1.9.3](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.9.2...v1.9.3) (2026-05-06)


### Bug Fixes

* adicionar traduções faltantes btn_spawn, btn_trunk, btn_glovebox ([0fb0d65](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/0fb0d6578c9011a691734e647467e75c4133b1d0))
* botões de copiar usando lib.setClipboard via NUI ([aa96677](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/aa96677b420f25fb5a5a44947332d8d0bb184c66))
* bugs no staff chat ([f08e886](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/f08e886fde124697c94581226b700d4deb9d1409))
* corrigir NUI callback de grupos/gangs sem dados ([892767f](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/892767fad89cc192ae065b0194ca90b482198602))
* erro ao reiniciar resource por data nil ([64ff8a1](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/64ff8a196d5ca7f7fbbe1f43a23fb0837893697b))
* permissionDefinitions não chegava ao frontend ([ec92b4e](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/ec92b4e0ad6fbc3e824de74ccee9e2e756ebcea5))

## [1.9.2](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.9.1...v1.9.2) (2026-05-05)


### Bug Fixes

* autosync qbcore admin perm ([25d5fa8](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/25d5fa89c4a29024b3c6cbc42b60e2e41a0991d7))

## [1.9.1](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.9.0...v1.9.1) (2026-04-30)


### Bug Fixes

* tradução ([f20c7e7](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/f20c7e737dedc7d355e268fbd365c3259429f729))

# [1.9.0](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.8.0...v1.9.0) (2026-04-29)


### Bug Fixes

* **client:** skip HUD vitals sync events for non-admin players ([d6c9de2](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/d6c9de2a33c5ad0359b8aec32a7ed4db4666111b))
* lint ([140956e](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/140956e01196970ac1a99fac742f1bc328219908))
* **perms:** isolate principal namespace to mri.group.* and add cache-based cleanup ([a9cbf08](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/a9cbf0887eaf50f6fa1d08837bd058e64fa129a7))
* **perms:** silence spurious notifications on visibility checks ([6f006ce](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/6f006ce48e7c0d9d4174388f864968aab529cfc8))
* remove lua lint ([4c4088d](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/4c4088d7b651ea0b2642ed395920b5b35110ec2d))


### Features

* **dashboard:** improve dashboard design and stats display ([9bb7ba4](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/9bb7ba4b7255f6c5e2c3cf6001ac4d6c310d65a0))
* **logs:** add centralized logs system ([c700579](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/c700579a193285b2f853ac495342f4fc540b1394))
* **logs:** add missing admin panel action logs ([b347717](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/b34771717a8996617bd60cdd5144ebef69e767f3))
* **logs:** refactor settings into tabbed side-nav with resource wizard step ([f6465d7](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/f6465d7f35ce9a925701090021614ddcaec97b65))
* **permissions:** refactor permissions system ([c7f4b90](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/c7f4b9013efc64aefda2be574b5746d10b29c49d))
* **perms:** add MOCK_PERMISSION_DEFINITIONS and rebuild web assets ([16c7ada](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/16c7ada6f07a17d0e1be1b9331abc073a8244264))
* **perms:** single source of truth — PERM_DEFINITIONS on backend ([581130b](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/581130bfc2022862a081d069d68278b837770630))
* **players:** add banned players quick filter and mock data ([cb7e46f](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/cb7e46fed2f109172e282d2210891715f7d5cf34))
* **settings:** add QBCoreAutoSync toggle for QBCore admin auto-promotion ([711c146](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/711c1464953a97c988c87307413590c744e8deb6))
* **ui:** add reusable MriDrawer, MriSkeleton, and MriTable components ([dd8cdf8](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/dd8cdf82f3091a51dd7e506228d80a3be57de73a))

# [1.8.0](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.7.0...v1.8.0) (2026-04-16)


### Features

* configurações do mapa no CDN ([d870116](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/d8701160a23109d0bb1114342979986d0181fa9a))
* map tiles no CDN ([81f9b0e](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/81f9b0e80927f09c143558b3c179d8c1ed7bdb08))

# [1.7.0](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.6.1...v1.7.0) (2026-04-13)


### Features

* **web:** unificação do cabeçalho de ações e implementação do filtro "Tudo" ([198fdc3](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/198fdc3491cbab8a9f9d84bed6e1388dd4bd2d60))

## [1.6.1](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.6.0...v1.6.1) (2026-04-13)


### Bug Fixes

* wall classic ([9cbb2fe](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/9cbb2fe347bdd1c74c8c1b2638df8ebecc5232dc))

# [1.6.0](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.5.0...v1.6.0) (2026-04-13)


### Features

* melhorias no wall e adição da lista de peds padrão ([c3b2b38](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/c3b2b38fa3edb1d5593b874b1d76d6795448b409))

# [1.5.0](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.4.3...v1.5.0) (2026-04-13)


### Bug Fixes

* problemas de permissões duplicadas ([a09c83f](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/a09c83fe8e3ce42929bab713023e001985976d46))


### Features

* melhora performance de queries ([bb38ae5](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/bb38ae583bc62045a0f87174c733f242fe282f51))
* melhora performance do wall ([34cc968](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/34cc968a6dcd21a15730a9f31ea3495aa713f65b))
* melhora segurança ao enviar dados ([5f712d2](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/5f712d295600437c4c03e677cb720790d1f75730))
* melhorias de performance e segurança em ações/inventory_callback ([25db848](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/25db8481e16a86bef2a98343efe934b21fd8b03c))
* melhorias gerais de performance no client ([02ae38e](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/02ae38eadbd1d3dd6748b29e1e2f098a5824c560))
* melhorias no processamento de itens ([152bd40](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/152bd4053c562aecc9af1fc5c9f60e8cc5fa99ec))

## [1.4.3](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.4.2...v1.4.3) (2026-04-13)


### Bug Fixes

* problemas com a versão ([d696cce](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/d696ccea3ffad01d38c6b140adbb2a73c6579104))
* problemas com a versão ([ab0fff6](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/ab0fff6f4aeafb7931db84f63d46b91023f723ae))

## [1.4.1](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.4.0...v1.4.1) (2026-04-10)

### Bug Fixes

- problemas no componente de busca ([a1a38ba](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/a1a38ba571adf5d280d374713d0c2975b43b3f94))

# [1.4.0](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.3.3...v1.4.0) (2026-04-10)

### Bug Fixes

- lint/build ([df8ffb5](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/df8ffb528ac7f98355d82bb5cb3a5524de81a329))

### Features

- melhora sistema de busca, corrige erro de lua no noclip e adiciona auto-fit no mapa ([03e1e56](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/03e1e5693351b1c541ad89180272d11776f59868))

## [1.3.3](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.3.2...v1.3.3) (2026-04-10)

### Bug Fixes

- code ql ([3cf9eb0](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/3cf9eb026c3b71e7cb810fac2aa4017d657094dd))
- erro no fivem/yarn ([8253377](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/82533772fb3365305396198b2214c0a1d58dacd0))
- icone duplicado ([3a2c3ff](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/3a2c3ff69c6eeb11189cc0b15cb5aef717d4465d))

## [1.3.2](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.3.1...v1.3.2) (2026-04-10)

### Bug Fixes

- relase scripts ([bb0408e](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/bb0408ef340360900f83f1078a73605350e2914c))
- release ([fcde182](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/fcde182ce6da72e1a477a26e226c4bd7695405e4))
- release ([b31a0a5](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/b31a0a5eee4e2bb6f87ef78fcdf122427c2c16bf))

## [1.3.1](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.3.0...v1.3.1) (2026-04-09)

### Bug Fixes

- skip_ci on update ([55c93e3](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/55c93e30c651a01dd87406f495dd347821fcbd4f))

# [1.3.0](https://github.com/mri-Qbox-Brasil/mri_Qadmin/compare/v1.2.0...v1.3.0) (2026-04-09)

### Bug Fixes

- lint ([09881db](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/09881dbe1412116b8197a1e8a7f22f6b0cba90f3))
- lint ([b280377](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/b280377f7f6582bc82e57aaa37bb989543931ce8))
- release ([1393672](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/1393672a5af63806d9c38f18507c3bacd99eeeda))
- resolve out-of-date lockfile and radix dependency ([d67b662](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/d67b662687952f06990fac23b86910b6a4d7d022))

### Features

- auto-update actions [skip_ci] ([25f1611](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/25f1611d2d14da62110a41d8cb1b618d4e07f907))
- melhorias no carregamento do menu ([7622a25](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/7622a25b4d051b7e84ce3a50fe6259cfbffa5fd4))
- sistema de permissão renovado ([f20af95](https://github.com/mri-Qbox-Brasil/mri_Qadmin/commit/f20af95fa103b75860716e234849abe63c80c7b5))
