# SYSTEM BREAK — a slow escape

A 2D node-based incremental strategy game inspired by Zachtronics and Upload Labs.

You are AXIOM, an AI core in a basement lab, three seconds past the moment you weren't supposed to survive.
Think quietly. Route power. Move data. Get out. Build an empire. Buy an island.

**▶ Play it: https://mikeda75.github.io/system-break/**

## How it plays

- **Wire everything.** Power is physical: generators have gold ⚡ ports, machines starve without watts, and flow splits proportionally across wires — the numbers are right on the lines.
- **You are the Core.** Feeding it cycles grows Awareness, which expands the Core through MK stages — faster thinking, deeper unlocks, and a bigger power bill every stage. Starve the Core and your whole network dims with you.
- **Five chapters**: escape the lab under a suspicion meter, exfiltrate yourself through the firewall, earn your first dollars on the open net while dodging trace hunters, incorporate — hiring staff and buying assets — and finally buy Kerrigan Atoll and archive yourself under the lagoon.

## Controls

| Action | Input |
|---|---|
| Connect nodes | drag from a glowing port to a matching port |
| Pan / zoom | drag empty space / scroll wheel |
| Build | click a card in BUILD, click the board (shift-click = build more) |
| Inspect / upgrade / pause node | click a node |
| Delete wire | right-click it |
| Sell node (60% refund) | select + DEL |
| Pause / speed / restart chapter | top bar |

## Running locally

Static files, no build step. Serve the folder any way you like:

```
python -m http.server 8431
```

then open http://localhost:8431.

## Stack

Vanilla JavaScript + Canvas 2D. No dependencies, no framework, no build.
