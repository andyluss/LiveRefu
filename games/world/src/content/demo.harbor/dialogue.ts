import { defineDialogue } from "#world-authoring";

defineDialogue({
  id: "dlg.keeper.intro",
  start: "greet",
  nodes: {
    greet: {
      speaker: "demo.keeper",
      text: "loc:dlg.keeper.greet",
      choices: [
        { text: "loc:dlg.keeper.ask_shift", next: "shift" },
        { text: "loc:dlg.keeper.bye", next: "end" },
      ],
    },
    shift: {
      speaker: "demo.keeper",
      text: "loc:dlg.keeper.shift",
      next: "end",
    },
    end: { end: true },
  },
});

defineDialogue({
  id: "dlg.engineer.intro",
  start: "greet",
  nodes: {
    greet: {
      speaker: "demo.engineer",
      text: "loc:dlg.engineer.greet",
      choices: [
        { text: "loc:dlg.engineer.ask", next: "task" },
        { text: "loc:dlg.engineer.bye", next: "end" },
      ],
    },
    task: {
      speaker: "demo.engineer",
      text: "loc:dlg.engineer.task",
      next: "end",
    },
    end: { end: true },
  },
});
