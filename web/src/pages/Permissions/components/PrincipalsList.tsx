import React, { useEffect, useState } from "react";
import { MriButton, MriInput } from "@mriqbox/ui-kit";
import {
  Trash2,
  Plus,
  Users,
  ChevronDown,
  ChevronRight,
  User,
  Palette,
} from "lucide-react";
import { useNui } from "@/context/NuiContext";
import { CustomColorPicker } from "@/components/CustomColorPicker";
import Spinner from "@/components/Spinner";
import { isEnvBrowser } from "@/utils/misc";
import { MOCK_PRINCIPALS } from "@/utils/mockData";
import ConfirmAction from "@/components/players/ConfirmAction";
import CreatableCombobox from "@/components/shared/CreatableCombobox";
import { useAppState } from "@/context/AppState";
import { useI18n } from "@/context/I18n";
import { Virtuoso } from "react-virtuoso";
import PermissionsSkeleton from "@/components/skeletons/PermissionsSkeleton";

interface Principal {
  id: number;
  child: string;
  parent: string;
  description?: string;
}

function PrincipalGroup({
  child,
  items,
  onRemove,
  players,
  principalColors,
  onColorChange,
}: {
  child: string;
  items: Principal[];
  onRemove: (p: Principal) => void;
  players: any[];
  principalColors: Record<string, string>;
  onColorChange: (p: string, c: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();
  const player = players.find(
    (p) => child.includes(p.license) || p.license === child,
  );
  const label = player ? `${player.name} (${child})` : child;

  // Aggregate descriptions for the header summary
  const descriptions = items.map(p => p.description).filter(Boolean).join(', ')

  // Determine if this is a group and if it has a color
  const isGroup = items.some(p => p.parent.startsWith('group.'))
  const color = principalColors[child] || principalColors[items[0]?.parent] || null

  // Find first available description for a simpler header if preferred, but joined is nicer for summary
  // const groupDescription = items.find((i) => i.description)?.description;

  return (
    <div className="border border-border rounded-md bg-card overflow-hidden">
      <div
        className="flex items-center gap-2 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <User className="w-4 h-4 text-primary" />
        <span className="font-mono text-sm font-medium">{label}</span>

        {/* Header Summary of Descriptions */}
        {descriptions && (
          <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
            - {descriptions}
          </span>
        )}
        {color && (
             <div className="w-3 h-3 rounded-full border border-border/50 shadow-sm" style={{ backgroundColor: color }} />
        )}

        <div className="flex items-center gap-2 ml-auto">
             {child.startsWith('group.') && (
                <CustomColorPicker
                    color={color || '#0000FF'}
                    onChange={(val) => onColorChange(child, val)}
                    active={!!color}
                />
            )}
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                {items.length} {t("groups")}
            </span>
        </div>
      </div>

      {isOpen && (
        <div className="divide-y divide-border/50">
          {items.map((p) => {
            const isPending = p.id > 10000000000;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-4 p-3 pl-9 hover:bg-muted/20 text-sm ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="text-muted-foreground">inherited</span>
                <span className="font-mono font-bold text-primary">
                  {p.parent}
                  {isPending && (
                    <span className="text-[10px] italic ml-2 opacity-70">
                      ...syncing
                    </span>
                  )}
                </span>

                {/* Individual Row Description */}
                {p.description && (
                   <span className="text-xs text-muted-foreground italic">
                     - {p.description}
                   </span>
                )}

                <div className="ml-auto flex items-center gap-3">
                    {p.parent.startsWith('group.') && (
                        <CustomColorPicker
                            color={principalColors[p.parent] || '#0000FF'}
                            onChange={(val) => onColorChange(p.parent, val)}
                            active={!!principalColors[p.parent]}
                        />
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isPending) onRemove(p);
                        }}
                        className={`transition-colors ${isPending ? "text-muted-foreground/30" : "text-muted-foreground hover:text-red-500"}`}
                        disabled={isPending}
                    >
                        {isPending ? (
                            <Spinner size="sm" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                    </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PrincipalsList({
  searchQuery = "",
  refreshTrigger = 0,
  onCountChange,
}: {
  searchQuery?: string;
  refreshTrigger?: number;
  onCountChange?: (n: number) => void;
}) {
  const { sendNui } = useNui();
  const { t } = useI18n();
  const { players } = useAppState();
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPrincipal, setNewPrincipal] = useState({
    child: "",
    parent: "",
    description: "",
  });
  const [principalColors, setPrincipalColors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<{
    type: "add" | "remove";
    principal?: Principal;
  } | null>(null);

  const fetchPrincipals = async () => {
    setLoading(true);
    try {
      if (isEnvBrowser()) {
        setTimeout(() => {
          const list = principals.length === 0 ? MOCK_PRINCIPALS : principals;
          if (principals.length === 0) setPrincipals(MOCK_PRINCIPALS);

          // Count unique children (principals)
          const unique = new Set(list.map((p) => p.child)).size;
          onCountChange?.(unique);

          setLoading(false);
        }, 500);
        return;
      }

      // Fetch Principals
      const data = await sendNui("mri_Qadmin:callback:GetPrincipals");
      const list = Array.isArray(data) ? data : [];
      setPrincipals(list);

      // Fetch Aces to find available groups
      const aces = await sendNui("mri_Qadmin:callback:GetAces");
      if (Array.isArray(aces)) {
        const uniqueGroups = Array.from(
          new Set(aces.map((a: any) => a.principal)),
        ).filter((p: string) => p.startsWith("group.")) as string[];
        setAvailableGroups(uniqueGroups);
      }

      // Count unique children (principals)
      const unique = new Set(list.map((p: any) => p.child)).size;
      onCountChange?.(unique);

      // Fetch Wall Colors
      const wallData = await sendNui("mri_Qadmin:callback:GetWallSettings", {}, { colors: {} });
      if (wallData && wallData.colors) {
          setPrincipalColors(wallData.colors);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!isEnvBrowser()) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrincipals();
  }, [refreshTrigger]);

  const handleAdd = async () => {
    if (!newPrincipal.child || !newPrincipal.parent) return;
    setConfirm({ type: "add" });
  };

  const handleRemove = async (principal: Principal) => {
    setConfirm({ type: "remove", principal });
  };

  const executeAction = async () => {
    if (!confirm) return;

    if (isEnvBrowser()) {
      if (confirm.type === "add") {
        const mockId = Math.floor(Math.random() * 10000);
        const newItem = {
          id: mockId,
          child: newPrincipal.child,
          parent: newPrincipal.parent,
          description: newPrincipal.description,
        };
        setPrincipals([...principals, newItem]);
        setNewPrincipal({ child: "", parent: "", description: "" });
      } else if (confirm.type === "remove" && confirm.principal) {
        setPrincipals(principals.filter((p) => p.id !== confirm.principal?.id));
      }
      setConfirm(null);
      return;
    }

    if (confirm.type === "add") {
      // Optimistic Add
      const tempId = Date.now();
      const newItem = {
        id: tempId,
        child: newPrincipal.child,
        parent: newPrincipal.parent,
        description: newPrincipal.description,
      };
      // Avoid duplicates in UI if spam clicking
      setPrincipals((prev) => {
        const exists = prev.some(
          (p) => p.child === newItem.child && p.parent === newItem.parent,
        );
        return exists ? prev : [...prev, newItem];
      });
      setNewPrincipal({ child: "", parent: "", description: "" });

      await sendNui("add_principal", {
        child: newPrincipal.child,
        parent: newPrincipal.parent,
        description: newPrincipal.description,
      });
    } else if (confirm.type === "remove" && confirm.principal) {
      // Optimistic Remove
      const removeId = confirm.principal.id;
      setPrincipals((prev) => prev.filter((p) => p.id !== removeId));

      await sendNui("remove_principal", { id: confirm.principal.id });
    }

    setConfirm(null);
    // No manual fetch - wait for server broadcast
  };

  const handleColorChange = async (principal: string, color: string) => {
    setPrincipalColors(prev => ({ ...prev, [principal]: color }));
    await sendNui('mri_Qadmin:server:SaveWallSetting', { type: 'principal', key: principal, value: color });
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex gap-2 items-end bg-card p-4 rounded-lg border border-border shrink-0">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {t("permissions_child_label")}
          </label>
          <CreatableCombobox
            options={[
              ...players.map((p) => ({
                label: `${p.name} (${p.license})`,
                value: p.license,
              })),
              ...principals.map((p) => ({ label: p.child, value: p.child })),
            ].filter(
              (v, i, a) => a.findIndex((t) => t.value === v.value) === i,
            )}
            value={newPrincipal.child}
            onChange={(val) => setNewPrincipal({ ...newPrincipal, child: val })}
            placeholder={t("select_player_label")}
            searchPlaceholder={t("search_placeholder_players")}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {t("permissions_parent_label")}
          </label>
          <CreatableCombobox
            options={[
              { label: "group.admin", value: "group.admin" },
              { label: "group.mod", value: "group.mod" },
              ...availableGroups.map((g) => ({ label: g, value: g })),
              ...principals.map((p) => ({ label: p.parent, value: p.parent })),
            ].filter(
              (v, i, a) => a.findIndex((t) => t.value === v.value) === i,
            )}
            value={newPrincipal.parent}
            onChange={(val) =>
              setNewPrincipal({ ...newPrincipal, parent: val })
            }
            placeholder={t("select_placeholder")}
            searchPlaceholder={t("actions_search_placeholder")}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {t("permissions_desc_label")}
          </label>
          <MriInput
            value={newPrincipal.description}
            onChange={(e) =>
              setNewPrincipal({ ...newPrincipal, description: e.target.value })
            }
            placeholder="Ex: Temp admin"
            className="bg-input border-input h-9"
          />
        </div>
        <MriButton size="sm" className="h-9" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1" /> {t("permissions_add_btn")}
        </MriButton>
      </div>

      <div className="bg-card border border-border rounded-lg flex flex-col gap-1 p-2 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pr-1">
          {loading && principals.length === 0 ? (
            <PermissionsSkeleton />
          ) : principals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t("permissions_no_inheritance")}
            </div>
          ) : (
            (() => {
              // Filter first
              const filtered = principals.filter((p) => {
                const search = searchQuery.toLowerCase();
                if (!search) return true;
                return (
                  p.child.toLowerCase().includes(search) ||
                  p.parent.toLowerCase().includes(search) ||
                  (p.description &&
                    p.description.toLowerCase().includes(search))
                );
              });

              if (filtered.length === 0 && searchQuery) {
                return (
                  <div className="p-8 text-center text-muted-foreground">
                    {t("permissions_no_matches").replace("%s", searchQuery)}
                  </div>
                );
              }

              // Group by child
              const grouped = filtered.reduce(
                (acc, curr) => {
                  if (!acc[curr.child]) acc[curr.child] = [];
                  acc[curr.child].push(curr);
                  return acc;
                },
                {} as Record<string, Principal[]>,
              );

              // Group by child
              const groupedEntries = Object.entries(grouped).map(([child, items]) => {
                  const uniqueMap = new Map<string, Principal>();
                  items.forEach((item) => {
                    uniqueMap.set(item.parent, { ...item });
                  });
                  return { child, items: Array.from(uniqueMap.values()) }
              });

              return (
                  <Virtuoso
                      style={{ height: '100%' }}
                      data={groupedEntries}
                      itemContent={(index, { child, items }) => (
                          <div className="pb-3">
                              <PrincipalGroup
                                  child={child}
                                  items={items}
                                  onRemove={handleRemove}
                                  players={players}
                                  principalColors={principalColors}
                                  onColorChange={handleColorChange}
                              />
                          </div>
                      )}
                  />
              );
            })()
          )}
        </div>
      </div>

      {confirm && (
        <ConfirmAction
          text={
            confirm.type === "add"
              ? t("permissions_confirm_add_principal")
                  .replace("%s", newPrincipal.child)
                  .replace("%s", newPrincipal.parent)
              : t("permissions_confirm_remove_principal")
                  .replace("%s", confirm.principal?.child || "")
                  .replace("%s", confirm.principal?.parent || "")
          }
          onConfirm={executeAction}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
