local function GetItemsList()
    local Items = {}
    local rawItems = {}

    if GetResourceState('ox_inventory') == 'started' then
        rawItems = exports.ox_inventory:Items()
    elseif QBCore and QBCore.Shared and QBCore.Shared.Items then
        rawItems = QBCore.Shared.Items
    end

    for item, data in pairs(rawItems) do
        local itemName = item
        local itemLabel = data.label

        if not itemLabel then
            Debug('debug', ('[mri_Qadmin] ^3AVISO: Item "%s" está mal formatado ou sem Label!^7'):format(tostring(itemName)))
            Debug('debug', ('[mri_Qadmin] Dados brutos do item "%s": %s'):format(tostring(itemName), json.encode(data)))
            itemLabel = itemName or "Unknown"
        end

        Items[#Items + 1] = {
            item = itemName,
            name = itemLabel,
            description = data.description or "",
            weight = data.weight or 0
        }
    end

    if #Items == 0 then
        Debug('error', ('[mri_Qadmin] ERRO CRÍTICO: Nenhum item foi encontrado no Shared.Items ou ox_inventory!^7'))
    else
        Debug('debug', ('[mri_Qadmin] Sucesso: %d itens carregados para a interface.'):format(#Items))
    end

    return Items
end
_G.GetItemsList = GetItemsList

lib.callback.register('mri_Qadmin:callback:GetItems', function(source)
    if not CheckPerms(source, 'qadmin.page.items') then return {} end
    return GetItemsList()
end)