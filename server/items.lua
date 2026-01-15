lib.callback.register('mri_Qadmin:callback:GetItems', function()
    local Items = {}
    for item, data in pairs(exports.ox_inventory:Items()) do
        Items[#Items + 1] = {
            item = item,
            name = data.label,
            description = data.description,
            weight = data.weight
        }
    end
    return Items
end)