import { defineProp } from "#world-authoring";

defineProp({
  id: "demo.airlock",
  name: "loc:prop.airlock.name",
  tags: ["prop", "door", "harbor"],
  body: { shape: "aabb", size: [1.2, 2.2, 0.4] },
  interactable: { verbs: ["interact"] },
  locked_by: "item.keycard",
  visual: "mesh.airlock",
});

defineProp({
  id: "demo.console",
  name: "loc:prop.console.name",
  tags: ["prop", "console", "harbor"],
  body: { shape: "aabb", size: [2, 1, 1] },
  interactable: { verbs: ["inspect"] },
});

defineProp({
  id: "demo.crate",
  name: "loc:prop.crate.name",
  tags: ["prop", "crate", "harbor"],
  body: { shape: "aabb", size: [1.2, 1.2, 1.2] },
  interactable: { verbs: ["inspect"] },
});
