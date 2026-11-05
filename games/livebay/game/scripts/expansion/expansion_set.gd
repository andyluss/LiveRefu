# LiveBay · 一次运行的扩展包集合
class_name LiveBayExpansionSet
extends RefCounted

var id := "baseline"
var slots: Dictionary = {}
var manifests: Array = []
var hash := ""


static func empty() -> LiveBayExpansionSet:
	var set := LiveBayExpansionSet.new()
	set.hash = "sha256:baseline"
	return set


static func build(set_id: String, slot_selection: Dictionary, packs: Array) -> LiveBayExpansionSet:
	var set := LiveBayExpansionSet.new()
	set.id = set_id
	set.slots = slot_selection.duplicate(true)
	set.manifests = packs.duplicate()
	var fingerprints: Array = []
	for m in packs:
		fingerprints.append({"id": m.id(), "version": m.data.version, "modifiers": m.data.get("modifiers", {})})
	fingerprints.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return str(a.id) < str(b.id))
	set.hash = "sha256:" + JSON.stringify(fingerprints).sha256_text()
	return set


func pack_ids() -> Array:
	var ids: Array = []
	for m in manifests:
		ids.append(m.id())
	return ids


func has_pack(pack_id: String) -> bool:
	return pack_id in pack_ids()


func to_meta() -> Dictionary:
	return {"set_id": id, "set_hash": hash, "packs": pack_ids(), "slots": slots}


func apply_data(game_data: Dictionary) -> Dictionary:
	var out: Dictionary = game_data.duplicate(true)
	for m in manifests:
		var mods: Dictionary = m.data.get("modifiers", {})
		if mods.has("starting_energy"):
			out["profession"]["start_energy"] = float(mods.starting_energy)
		var content: Dictionary = m.data.get("content", {})
		if content.has("procedures"):
			out["procedures"] = content.procedures.duplicate(true)
	return out
