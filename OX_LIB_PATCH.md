# ox_lib — Logger Patch para mri_Qadmin

Para que os logs de qualquer resource que use `lib.logger` apareçam no painel do mri_Qadmin,
é necessário adicionar `qadmin` como um novo serviço no logger da ox_lib.

## 1. Editar `ox_lib/modules/logger/server.lua`

Adicionar o bloco abaixo **antes** da linha `return lib.logger` no final do arquivo:

```lua
if service == 'qadmin' then
    function lib.logger(source, event, message, ...)
        TriggerEvent('mri_Qadmin:server:AddLog',
            cache.resource,
            event,
            'info',
            message,
            {
                tags = formatTags(source, ... and string.strjoin(',', string.tostringall(...)) or nil)
            },
            source
        )
    end
end
```

## 2. Configurar `server.cfg`

```
set ox:logger "qadmin"
```

> Remova ou comente qualquer `set ox:logger` anterior (datadog, loki, fivemanage, fivemerr).

## Comportamento esperado

- Cada chamada `lib.logger(source, event, message, ...)` em qualquer resource dispara o evento `mri_Qadmin:server:AddLog`.
- O campo `event` da ox_lib vira a **categoria** do log no painel.
- Os logs aparecem no painel em tempo real, são salvos no banco e encaminhados para Discord/relay conforme as configurações de cada categoria.

## Manutenção

Este patch precisa ser reaplicado após atualizações da ox_lib que substituam o arquivo `server.lua` do módulo logger.
