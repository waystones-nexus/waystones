export type WorkerUnit = 
  | "peasant" 
  | "peon" 
  | "acolyte" 
  | "wisp" 
  | "shade" 
  | "homunculus" 
  | "void-entity";

export interface Whisper {
  unit: WorkerUnit;
  text: string;
  rare?: boolean;
}

export const UNIT_THEMES: Record<WorkerUnit, { pulse: string; border: string }> = {
  peasant: { pulse: "bg-indigo-400/20", border: "border-indigo-100" },
  peon: { pulse: "bg-emerald-400/20", border: "border-emerald-100" },
  acolyte: { pulse: "bg-purple-400/20", border: "border-purple-100" },
  wisp: { pulse: "bg-sky-400/20", border: "border-sky-100" },
  shade: { pulse: "bg-slate-400/20", border: "border-slate-100" },
  homunculus: { pulse: "bg-amber-400/20", border: "border-amber-100" },
  "void-entity": { pulse: "bg-slate-500/10", border: "border-slate-200" },
};

export const QUEST_WHISPERS: Record<string, Whisper[]> = {
  landing_intro: [
    { unit: "peasant", text: "Welcome, Architect. I've cleared the site. Drop a GeoPackage, and we'll see if the stone is true." },
    { unit: "peon", text: "Something need doing? Me ready with hammer for the next model!" }
  ],
  file_hover: [
    { unit: "peon", text: "Drop it here! Me wait with spatial hammer!" },
    { unit: "peasant", text: "Laying the foundations... steady as she goes." }
  ],
  inference_success: [
    { unit: "peon", text: "Work work! Me crunched the geometry and found the layers. Me smart!" },
    { unit: "acolyte", text: "The data manifest reveals itself. The ancient tables are now part of our alignment." }
  ],
  styling_start: [
    { unit: "homunculus", text: "The mud of creation is soft. Let us mold the symbology of these layers." },
    { unit: "wisp", text: "A dash of color, a flicker of light... the map begins to breathe." }
  ],
  metadata_step: [
    { unit: "acolyte", text: "The OGC spirits demand clarity. A sacred manifest must have a name and a description." },
  ],
  metadata_step_shade: [
    { unit: "shade", text: "Names are just shadows cast by data. But even shadows require a surface. Fill in the metadata." }
  ],
  publish_ready: [
    { unit: "shade", text: "The design is complete. It enters the eternal archive of GitHub. Entropy is momentarily stalled." },
    { unit: "acolyte", text: "Thy will be done. The model is now ready to manifest in the cloud." }
  ],
  error_crs: [
    { unit: "void-entity", text: "A fracture in the manifest. The CRS is unknown. Entropy claims this layer." },
    { unit: "wisp", text: "The light fades... I cannot find where on Earth this data belongs." }
  ],
  error_generic: [
    { unit: "void-entity", text: "The abyss has swallowed the request. I see the error... it is beautiful." }
  ]
};

export const IDLE_WHISPERS: Whisper[] = [
  { unit: "wisp", text: "The Waystone is humming... the connection is pure." },
  { unit: "peon", text: "Me polish the Waystone. No more projection errors on my watch!" },
  { unit: "peasant", text: "Infrastructure artistry is 90% preparation. Foundations are still true." },
  { unit: "acolyte", text: "I have whispered to gods older than DNS. Their protocols are stable." },
  { unit: "shade", text: " Pausing the heartbeat of existence... saving you some compute entropy." }
];

export const LEGENDARY_WHISPERS: Whisper[] = [
  { unit: "void-entity", text: "I have seen the source code of reality itself. It was unindented. It was abominable.", rare: true },
  { unit: "shade", text: "Ozymandias had an empire. You have a GeoPackage. Look upon your standby, ye Mighty, and despair.", rare: true }
];
