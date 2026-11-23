import { defineProp } from "#world-authoring";

defineProp({
  id: "demo.airlock",
  name: "loc:prop.airlock.name",
  tags: ["prop", "door", "harbor"],
  body: { shape: "aabb", size: [1.2, 2.2, 0.4] },
  interactable: { verbs: ["interact"] },
  locked_by: "item.keycard",
});
