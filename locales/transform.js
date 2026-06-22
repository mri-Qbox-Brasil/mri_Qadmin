const fs = require('fs');
const en = JSON.parse(fs.readFileSync('G:/mri/mri_Qadmin/locales/en.json'));
const ptbr = JSON.parse(fs.readFileSync('G:/mri/mri_Qadmin/locales/pt-br.json'));
const es = JSON.parse(fs.readFileSync('G:/mri/mri_Qadmin/locales/es.json'));

// Helper to set nested key
function setNested(obj, path, val) {
    if (val === undefined) return;
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
        cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = val;
}

function buildNew(source) {
    const out = {};

    // Keep all existing nested objects (those that are objects, not strings)
    for (const [k, v] of Object.entries(source)) {
        if (typeof v === 'object' && v !== null) {
            out[k] = JSON.parse(JSON.stringify(v));
        }
    }

    // notifications.*
    const notifKeys = [
        'already_plate','amount_max','ban_expires','ban_perm','banreason','banned','blackout',
        'blips_activated','blips_deactivated','body_health','bucket_get','bucket_set','bucket_set_for_target',
        'spectate_exit','cannot_store_veh','cant_spectate_yourself','copy_heading','copy_vector2','copy_vector3','copy_vector4',
        'deFrozen','empty_input','eng_health','entered_vehicle','ent_id','explode_player','Frozen',
        'gangset','give_item','give_item_all','give_money','give_money_all','give_money_all_crypto','give_money_crypto',
        'godmode','hash','inf_ammo_toggled','invisible','invcleared','jobset','kicked','model',
        'names_activated','names_deactivated','net_id','net_id_not_registered','new_staffchat','no_free_seats',
        'no_perms','no_waypoint','no_weapon','noclip_disabled','noclip_enabled','not_enough_money',
        'not_in_veh','not_in_vehicle','not_online','no_self','peds_coords','plate_max','plate_invalid',
        'player_not_found','player_not_in_veh','player_perms','playerbanned','playerdrunk','reason',
        'refueled_vehicle','restarted_resource','removed_stress_player','set_on_fire','set_weapon_ammo',
        'started_resource','stopped_resource','state_changed','take_money','take_money_crypto',
        'target_same_bucket','teleported_waypoint','toggled_cuffs','kill_player','toggled_cuffs_off',
        'toggled_cuffs_on','toggle_dev','tp_error','u_veh_owner','veh_fixed','warned','warngiven','weatherType',
    ];
    for (const k of notifKeys) {
        if (source[k] !== undefined) setNested(out, 'notifications.' + k, source[k]);
    }

    // givecar.* (these appear as dotted keys at root in JSON)
    setNested(out, 'notifications.givecar.plates_alreadyused', source['givecar.plates_alreadyused']);
    setNested(out, 'notifications.givecar.success.source', source['givecar.success.source']);
    setNested(out, 'notifications.givecar.success.target', source['givecar.success.target']);

    // commands.*
    setNested(out, 'commands.admin_desc', source['command_admin_desc']);
    setNested(out, 'commands.noclip_desc', source['command_noclip_desc']);

    // labels.*
    setNested(out, 'labels.item_name', source['label_item_name']);
    setNested(out, 'labels.name', source['label_name']);
    setNested(out, 'labels.license', source['label_license']);
    setNested(out, 'labels.char', source['label_char']);
    setNested(out, 'labels.job', source['label_job']);
    setNested(out, 'labels.gang', source['label_gang']);
    setNested(out, 'labels.grade', source['label_grade']);
    setNested(out, 'labels.select_language', source['label_select_language']);
    setNested(out, 'labels.rg', source['rg_label']);
    setNested(out, 'labels.job_label', source['job_label']);
    setNested(out, 'labels.gang_label', source['gang_label']);
    setNested(out, 'labels.phone', source['phone_label']);
    setNested(out, 'labels.identifiers', source['identifiers']);

    // credits.*
    setNested(out, 'credits.title', source['credits_title']);
    setNested(out, 'credits.developed_by', source['credits_developed_by']);
    setNested(out, 'credits.thanks', source['credits_thanks']);
    setNested(out, 'credits.records', source['records']);

    // common.* additions (merge with existing)
    setNested(out, 'common.currency_symbol', source['currency_symbol']);
    setNested(out, 'common.yes', source['yes']);
    setNested(out, 'common.no', source['no']);
    setNested(out, 'common.na', source['na']);
    setNested(out, 'common.unknown', source['unknown']);
    setNested(out, 'common.you', source['you']);
    setNested(out, 'common.refresh', source['refresh']);
    setNested(out, 'common.clear', source['common_clear']);
    setNested(out, 'common.restore_default', source['restore_default']);
    setNested(out, 'common.search_groups', source['search_groups']);
    setNested(out, 'common.new_value', source['new_value']);
    setNested(out, 'common.confirm_vital_action', source['confirm_vital_action']);
    setNested(out, 'common.btn_edit', source['btn_edit']);
    setNested(out, 'common.btn_dismiss', source['btn_dismiss']);
    setNested(out, 'common.btn_stock', source['btn_stock']);
    setNested(out, 'common.btn_send', source['btn_send']);
    setNested(out, 'common.loading_groups', source['loading_groups']);
    setNested(out, 'common.back_to_grid', source['back_to_grid']);
    setNested(out, 'common.recently_offline', source['recently_offline']);
    setNested(out, 'common.suspected_cheater', source['suspected_cheater']);
    setNested(out, 'common.confirm_title', source['confirm_title']);
    setNested(out, 'common.bank', source['bank']);
    setNested(out, 'common.cash', source['cash']);
    setNested(out, 'common.crypto', source['crypto']);
    setNested(out, 'common.name', source['name']);

    // player.* additions
    setNested(out, 'player.players_label', source['players']);
    setNested(out, 'player.vehicles_label', source['player_vehicles']);
    setNested(out, 'player.inventory_label', source['player_inventory']);
    setNested(out, 'player.labels.ip', source['ip']);
    setNested(out, 'player.labels.no_job', source['no_job']);
    setNested(out, 'player.labels.no_gang', source['no_gang']);
    setNested(out, 'player.labels.last_logout', source['last_logout']);
    setNested(out, 'player.labels.connection_info', source['connection_info']);
    setNested(out, 'player.labels.steam_id', source['steam_id']);
    setNested(out, 'player.labels.ip_address', source['ip_address']);
    setNested(out, 'player.labels.fivem_license', source['fivem_license']);
    setNested(out, 'player.labels.discord_id', source['discord_id']);
    setNested(out, 'player.labels.license', source['license']);
    setNested(out, 'player.labels.license2', source['license2']);
    setNested(out, 'player.labels.no_personal_vehicles', source['no_personal_vehicles_found']);
    setNested(out, 'player.labels.recently_offline', source['recently_offline']);
    setNested(out, 'player.labels.suspected_cheater', source['suspected_cheater']);
    setNested(out, 'player.sections.moderation', source['moderation_section']);
    setNested(out, 'player.sections.teleportation', source['teleportation_section']);
    setNested(out, 'player.sections.offline_actions', source['offline_actions']);
    setNested(out, 'player.sections.economy', source['economy_groups']);
    setNested(out, 'player.sections.quick_actions', source['actions_quick']);
    setNested(out, 'player.sections.inventory', source['inventory_management']);
    setNested(out, 'player.inventory.open', source['open_inventory']);
    setNested(out, 'player.inventory.open_stash', source['open_stash']);
    setNested(out, 'player.inventory.stash_id', source['stash_id_label']);
    setNested(out, 'player.inventory.clear', source['clear_inventory']);
    setNested(out, 'player.inventory.view', source['view_inventory']);
    setNested(out, 'player.inventory.empty', source['inventory_empty']);
    setNested(out, 'player.inventory.items_label', source['items']);
    setNested(out, 'player.inventory.give_item', source['give_item_player'] || 'Give Item');
    setNested(out, 'player.actions.delete_character', source['delete_character']);
    setNested(out, 'player.search_placeholder', source['search_by_name_id_or_license']);
    setNested(out, 'player.name_label', source['player_name']);
    setNested(out, 'player.player_management', source['player_management']);

    // bans - ban table labels
    setNested(out, 'player.actions.ban.labels.name', source['bans_name']);
    setNested(out, 'player.actions.ban.labels.reason', source['bans_reason']);
    setNested(out, 'player.actions.ban.labels.expire', source['bans_expire']);
    setNested(out, 'player.actions.ban.labels.banned_by', source['bans_banned_by']);
    setNested(out, 'player.actions.ban.labels.license', source['bans_license']);
    setNested(out, 'player.actions.ban.labels.discord', source['bans_discord']);
    setNested(out, 'player.actions.ban.labels.ip', source['bans_ip']);
    setNested(out, 'player.actions.ban.labels.action', source['bans_action']);
    setNested(out, 'player.actions.ban.permanent_label', source['ban_permanent_label']);
    setNested(out, 'player.actions.ban.status.permanent', source['ban_status_permanent']);
    setNested(out, 'player.actions.ban.status.temp', source['ban_status_temp']);

    // actions.* additions
    setNested(out, 'actions.remove_money', source['remove_money']);
    setNested(out, 'actions.spectate_label', source['spectate']);
    setNested(out, 'actions.warn_label', source['warn']);
    setNested(out, 'actions.kick_label', source['kick']);
    setNested(out, 'actions.ban_label', source['ban']);
    setNested(out, 'actions.mute_label', source['mute_player']);
    setNested(out, 'actions.toggle_cuffs_label', source['toggle_cuffs']);
    setNested(out, 'actions.toggle_freeze_label', source['toggle_freeze']);
    setNested(out, 'actions.character_info_label', source['character_info']);
    setNested(out, 'actions.backstory_label', source['backstory']);
    setNested(out, 'actions.teleport_to', source['teleport_to']);
    setNested(out, 'actions.track_player', source['track_player']);
    setNested(out, 'actions.live_map_tracking', source['live_map_tracking']);
    setNested(out, 'actions.drunk_player', source['drunk_player']);
    setNested(out, 'actions.remove_stress', source['remove_stress']);

    // nav.* additions
    setNested(out, 'nav.dashboard', source['nav_dashboard']);
    setNested(out, 'nav.players', source['nav_players']);
    setNested(out, 'nav.vehicles', source['nav_vehicles']);
    setNested(out, 'nav.groups', source['nav_groups']);
    setNested(out, 'nav.items', source['nav_items']);
    setNested(out, 'nav.staffchat', source['nav_staffchat']);
    setNested(out, 'nav.bans', source['nav_bans']);
    setNested(out, 'nav.resources', source['nav_resources']);
    setNested(out, 'nav.commands', source['nav_commands']);
    setNested(out, 'nav.actions', source['nav_actions']);
    setNested(out, 'nav.devmode', source['nav_devmode']);
    setNested(out, 'nav.livemap', source['nav_livemap']);
    setNested(out, 'nav.livescreens', source['nav_livescreens']);
    setNested(out, 'nav.permissions', source['nav_permissions']);
    setNested(out, 'nav.logs', source['nav_logs']);
    setNested(out, 'nav.action_manager', source['nav_action_manager']);

    // categories.*
    setNested(out, 'categories.group', source['category_group']);
    setNested(out, 'categories.player', source['category_player']);
    setNested(out, 'categories.char', source['category_char']);
    setNested(out, 'categories.job', source['category_job']);
    setNested(out, 'categories.gang', source['category_gang']);
    setNested(out, 'categories.all', source['category_all']);
    setNested(out, 'categories.actions', source['category_actions']);
    setNested(out, 'categories.player_actions', source['category_playeractions']);
    setNested(out, 'categories.other_actions', source['category_otheractions']);

    return out;
}

// For en, use en values as-is
// For pt-br and es, we want their translations, falling back to en for missing keys
function buildLocale(source, enBase) {
    // First build with source
    const out = buildNew(source);

    // For en: fix confirm_label and cancel_label
    if (source === en) {
        setNested(out, 'common.confirm_label', 'Confirm');
        setNested(out, 'common.cancel_label', 'Cancel');
        // player.inventory.give_item fallback
        setNested(out, 'player.inventory.give_item', 'Give Item');
        setNested(out, 'player.sections.economy', source['economy_groups'] || 'Economy & Groups');
    }

    return out;
}

const newEn = buildNew(en);
setNested(newEn, 'common.confirm_label', 'Confirm');
setNested(newEn, 'common.cancel_label', 'Cancel');
setNested(newEn, 'player.inventory.give_item', 'Give Item');
setNested(newEn, 'player.sections.economy', en['economy_groups'] || 'Economy & Groups');

const newPtbr = buildNew(ptbr);
setNested(newPtbr, 'common.confirm_label', ptbr['confirm'] || 'Confirmar');
setNested(newPtbr, 'common.cancel_label', ptbr['cancel'] || 'Cancelar');
setNested(newPtbr, 'player.inventory.give_item', 'Dar Item');
setNested(newPtbr, 'player.sections.economy', ptbr['economy_groups'] || 'Economia & Grupos');

const newEs = buildNew(es);
setNested(newEs, 'common.confirm_label', es['confirm'] || 'Confirmar');
setNested(newEs, 'common.cancel_label', es['cancel'] || 'Cancelar');
setNested(newEs, 'player.inventory.give_item', 'Dar Ítem');
setNested(newEs, 'player.sections.economy', es['economy_groups'] || 'Economía & Grupos');

fs.writeFileSync('G:/mri/mri_Qadmin/locales/en.json', JSON.stringify(newEn, null, 4));
fs.writeFileSync('G:/mri/mri_Qadmin/locales/pt-br.json', JSON.stringify(newPtbr, null, 4));
fs.writeFileSync('G:/mri/mri_Qadmin/locales/es.json', JSON.stringify(newEs, null, 4));

console.log('Done writing all locale files');

// Check remaining flat keys
const flatEn = Object.entries(newEn).filter(([k,v]) => typeof v === 'string').map(([k]) => k);
console.log('Remaining flat string keys in en.json:', flatEn.length, flatEn);
