local function GetItemsList()
    local Items = {}
    if GetResourceState('ox_inventory') == 'started' then
        for item, data in pairs(exports.ox_inventory:Items()) do
            Items[#Items + 1] = {
                item = item,
                name = data.label,
                description = data.description,
                weight = data.weight
            }
        end
    else
        for item, data in pairs(QBCore.Shared.Items) do
            Items[#Items + 1] = {
                item = item,
                name = data.label,
                description = data.description,
                weight = data.weight
            }
        end
    end
    return Items
end
_G.GetItemsList = GetItemsList

lib.callback.register('mri_Qadmin:callback:GetItems', function()
    return GetItemsList()
end)