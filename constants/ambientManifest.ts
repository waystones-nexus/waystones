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

export interface Quest {
  id: string;
  title: string;
  taskTitle: string;
  unit: WorkerUnit;
  hint: string;
  context: 'landing' | 'editor' | 'quick-publish' | 'deploy' | 'all';
  step?: number | number[]; // Specific step or steps where this quest is relevant
  isMandatory?: boolean;   // If true, this quest is part of the 'Required' path for this stage
  complexity?: 'novice' | 'architect' | 'ritualist';
  isSideQuest?: boolean;
  targetElementId?: string;
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

export const QUESTS: Quest[] = [
  // --- Landing / General ---
  {
    id: 'BIND_DATA',
    title: 'Binding the Stone',
    taskTitle: 'Drop a GeoPackage or connect a Database',
    unit: 'peasant',
    hint: 'No data has been bound. Bring me a GeoPackage or a live connection from the deep.',
    context: 'landing',
    step: 0,
    isMandatory: true,
    targetElementId: 'landing-dropzone'
  },
  // --- Quick Publish (Workflow) ---
  {
    id: 'QP_LAYER_ALIGNMENT',
    title: 'The Table Gathering',
    taskTitle: 'Select the primary layers to include',
    unit: 'peasant',
    hint: 'Not all stones are meant for every wall. Choose the layers that will form the foundation of this alignment.',
    context: 'quick-publish',
    step: 0,
    isMandatory: true,
    targetElementId: 'qp-layer-selection'
  },
  {
    id: 'QP_STYLE_ALIGNMENT',
    title: 'Visual Harmony',
    taskTitle: 'Customize the layer symbology',
    unit: 'homunculus',
    hint: 'Give the mud form! Open each layer and adjust its colors and symbols so your map may sing with clarity. The archive loves a vibrant manifest.',
    context: 'quick-publish',
    step: 1,
    isMandatory: true,
    targetElementId: 'qp-style-editor'
  },
  {
    id: 'QP_STYLING_ORDER',
    title: 'The Rendering Alignment',
    taskTitle: 'Adjust the layer draw order',
    unit: 'peon',
    hint: 'Heavy layers like polygons belong at the bottom! Drag the handles on the left to change how layers stack. Work work!',
    context: 'quick-publish',
    step: 1,
    isSideQuest: true,
    targetElementId: 'qp-style-layer-handle'
  },
  {
    id: 'QP_STYLING_PALETTE',
    title: 'The Palette Ritual',
    taskTitle: 'Use the color presets',
    unit: 'homunculus',
    hint: 'Coordination is key to visual symmetry. Use the predefined color palette to ensure your styles remain harmonious across the entire realm.',
    context: 'quick-publish',
    step: 1,
    isSideQuest: true,
    targetElementId: 'qp-color-palette'
  },
  {
    id: 'QP_META_NAME',
    title: 'Naming the Origin',
    taskTitle: 'Set the Model and Dataset name',
    unit: 'peasant',
    hint: 'Every stone needs a name. Tell me how this dataset shall be known in the archive.',
    context: 'quick-publish',
    step: 2,
    isMandatory: true,
    targetElementId: 'qp-meta-name-field'
  },
  {
    id: 'QP_META_CONTACT',
    title: 'The Architect’s Seal',
    taskTitle: 'Fill in the contact information',
    unit: 'peasant',
    hint: 'The archive must know who to call if the stones begin to shift. Add your contact details.',
    context: 'quick-publish',
    step: 2,
    isMandatory: true,
    targetElementId: 'qp-meta-contact-fields'
  },
  {
    id: 'QP_LAYER_META',
    title: 'The Layer Lore',
    taskTitle: 'Add descriptions to your individual layers',
    unit: 'acolyte',
    hint: 'Each layer has its own story. Add descriptions to your layers so their purpose is clear in the registry.',
    context: 'quick-publish',
    step: 2,
    targetElementId: 'qp-layer-meta-list',
    isSideQuest: true
  },
  {
    id: 'QP_PUBLISH_ALIGNMENT',
    title: 'Final Ascension',
    taskTitle: 'Sync to the Eternal Library',
    unit: 'shade',
    hint: 'Entropy claims all that is not archived. Sync your work to GitHub to finish the alignment.',
    context: 'quick-publish',
    step: 3,
    isMandatory: true,
    targetElementId: 'qp-publish-button'
  },
  // --- Deploy Panel ---
  {
    id: 'DP_SOURCE_ALIGNMENT',
    title: 'The Deep Connection',
    taskTitle: 'Choose a source of truth',
    unit: 'homunculus',
    hint: 'Where does the data flow from? Select your source connection.',
    context: 'deploy',
    step: 0,
    isMandatory: true,
    targetElementId: 'dp-source-picker'
  },
  {
    id: 'DP_CONN_ALIGNMENT',
    title: 'Link Strengthening',
    taskTitle: 'Finalize the connection configuration',
    unit: 'peon',
    hint: 'The link must be strong! Ensure all connection parameters are set before we start the heavy work.',
    context: 'deploy',
    step: 1,
    isMandatory: true,
    targetElementId: 'dp-conn-form'
  },
  {
    id: 'DP_CONN_HOST',
    title: 'The Altar of Data',
    taskTitle: 'Set the connection host',
    unit: 'acolyte',
    hint: 'The cloud needs an address. Enter the host or project URL for your connection.',
    context: 'deploy',
    step: 1,
    isMandatory: true,
    targetElementId: 'dp-conn-host-field'
  },
  {
    id: 'DP_CONN_DB',
    title: 'The Great Reservoir',
    taskTitle: 'Specify the database name',
    unit: 'peon',
    hint: 'A server can hold many secrets. Tell us exactly which database contains the stones.',
    context: 'deploy',
    step: 1,
    isMandatory: true,
    targetElementId: 'dp-conn-db-field'
  },
  {
    id: 'DP_MAPPING_ALIGNMENT',
    title: 'The Great Weaving',
    taskTitle: 'Map source columns to model fields',
    unit: 'acolyte',
    hint: 'Weave the source columns into the model properties. The strands must match exactly.',
    context: 'deploy',
    step: 2,
    isMandatory: true,
    targetElementId: 'dp-mapping-list'
  },
  {
    id: 'DP_MAPPING_TABLES',
    title: 'The Table Bond',
    taskTitle: 'Map each layer to a source table',
    unit: 'peasant',
    hint: 'Every conceptual layer must have a physical counterpart in your source. Ensure all layers are linked.',
    context: 'deploy',
    step: 2,
    isMandatory: true,
    targetElementId: 'dp-mapping-list'
  },
  {
    id: 'DP_MAPPING_PK',
    title: 'The Identity Ritual',
    taskTitle: 'Ensure all layers have identity columns',
    unit: 'wisp',
    hint: 'Identity is the key to existence. Ensure every mapped table has a Primary Key defined.',
    context: 'deploy',
    step: 2,
    isMandatory: true,
    targetElementId: 'dp-mapping-list'
  },
  {
    id: 'DP_STYLE_ALIGNMENT',
    title: 'Visual Harmony',
    taskTitle: 'Customize the layer symbology',
    unit: 'homunculus',
    hint: 'Give the mud form! Open each layer and adjust its colors and symbols so your map may sing with clarity.',
    context: 'deploy',
    step: 3,
    isMandatory: true,
    targetElementId: 'dp-style-editor'
  },
  {
    id: 'DP_STYLING_ORDER',
    title: 'The Rendering Alignment',
    taskTitle: 'Adjust the layer draw order',
    unit: 'peon',
    hint: 'Heavy layers like polygons belong at the bottom! Drag the handles on the left to change how layers stack. Work work!',
    context: 'deploy',
    step: 3,
    isSideQuest: true,
    targetElementId: 'dp-style-layer-handle'
  },
  {
    id: 'DP_STYLING_PALETTE',
    title: 'The Palette Ritual',
    taskTitle: 'Use the color presets',
    unit: 'homunculus',
    hint: 'Coordination is key to visual symmetry. Use the predefined color palette to ensure your styles remain harmonious across the entire realm.',
    context: 'deploy',
    step: 3,
    isSideQuest: true,
    targetElementId: 'dp-color-palette'
  },
  {
    id: 'DP_META_NAME',
    title: 'Naming the Origin',
    taskTitle: 'Set the Model and Dataset name',
    unit: 'peasant',
    hint: 'Every stone needs a name. Tell me how this dataset shall be known in the archive.',
    context: 'deploy',
    step: 4,
    isMandatory: true,
    targetElementId: 'dp-meta-name-field'
  },
  {
    id: 'DP_META_CONTACT',
    title: 'The Architect’s Seal',
    taskTitle: 'Fill in the contact information',
    unit: 'peasant',
    hint: 'The archive must know who to call if the stones begin to shift. Add your contact details.',
    context: 'deploy',
    step: 4,
    isMandatory: true,
    targetElementId: 'dp-meta-contact-fields'
  },
  {
    id: 'DP_LAYER_META',
    title: 'The Layer Lore',
    taskTitle: 'Add descriptions to your individual layers',
    unit: 'acolyte',
    hint: 'Each layer has its own story. Add descriptions to your layers so their purpose is clear in the registry.',
    context: 'deploy',
    step: 4,
    targetElementId: 'dp-layer-meta-list',
    isSideQuest: true
  },
  {
    id: 'DP_PUBLISH_ALIGNMENT',
    title: 'Final Alignment',
    taskTitle: 'Trigger the cloud deployment',
    unit: 'shade',
    hint: 'The nodes are ready to harmonize. Press the final button to manifest this service in the cloud.',
    context: 'deploy',
    step: 5,
    isMandatory: true,
    targetElementId: 'dp-publish-button'
  },

  // --- Editor (Schema Health) ---
  {
    id: 'DEFINE_KEYS',
    title: 'Illuminate Identity',
    taskTitle: 'Assign Primary Keys to all layers',
    unit: 'wisp',
    hint: 'Some layers wander in the dark. Assign a Primary Key so they may be uniquely identified in the archive.',
    context: 'editor'
  },
  {
    id: 'RECORD_LORE',
    title: 'Record the Lore',
    taskTitle: 'Add meaningful descriptions to layers',
    unit: 'acolyte',
    hint: 'A manifest without descriptions is a silent artifact. Add lore to your layers so others may understand them.',
    context: 'editor'
  },
  {
    id: 'NAMESPACE_ALIGNMENT',
    title: 'Naming the Realm',
    taskTitle: 'Assign a namespace to your model',
    unit: 'peon',
    hint: 'A nameless realm is a lost realm. Give your model a Namespace so it has a place in the hierarchy.',
    context: 'editor'
  },

  // --- Advanced Side Alignments ---
  {
    id: 'NAV_ALIGNMENT',
    title: 'The Rendering Alignment',
    taskTitle: 'Change the layer draw order',
    unit: 'peon',
    hint: 'Big layers eat the small! Go to the "Model" tab and drag the layers to change their z-order.',
    context: 'editor',
    complexity: 'architect',
    isSideQuest: true
  },
  {
    id: 'ORACLE_ALIGNMENT',
    title: "The Oracle’s Vision",
    taskTitle: 'Generate a model abstract with AI',
    unit: 'wisp',
    hint: 'The Oracle sees the patterns. Click the Sparkles in the header to generate a description for your realm.',
    context: 'editor',
    complexity: 'ritualist',
    isSideQuest: true
  },
  {
    id: 'COMMON_TONGUE',
    title: 'The Common Tongue',
    taskTitle: 'Promote a property to a Shared Type',
    unit: 'acolyte',
    hint: 'Redundancy is a sin. Find a common field in a layer and "Promote" it to a Shared Type.',
    context: 'editor',
    complexity: 'ritualist',
    isSideQuest: true
  },
  {
    id: 'RULE_ALIGNMENT',
    title: 'The Law of the Lands',
    taskTitle: 'Add a validation rule to a layer',
    unit: 'shade',
    hint: 'Even the abyss has rules. Go to the "Rules" tab in a layer and add a constraint.',
    context: 'editor',
    isSideQuest: true
  },
  {
    id: 'STYLE_ALIGNMENT_ADV',
    title: 'The Aesthetic Weaving',
    taskTitle: "Customize a layer's styling",
    unit: 'homunculus',
    hint: 'The mud is waiting. Go to the "Style" tab and change a layer\'s color or symbol.',
    context: 'editor',
    isSideQuest: true
  },
  {
    id: 'ENUM_ALIGNMENT',
    title: 'The Finite Circle',
    taskTitle: 'Define a Shared Enum',
    unit: 'acolyte',
    hint: 'Constants represent the order of the universe. Define a Shared Enum in the Types tab.',
    context: 'editor',
    isSideQuest: true
  },
  {
    id: 'SYNC_ALIGNMENT',
    title: 'The Cloud Symmetry',
    taskTitle: 'Sync with GitHub metadata',
    unit: 'peasant',
    hint: 'The local stone must know its cloud home. Ensure your GitHub configuration is set.',
    context: 'editor',
    isSideQuest: true
  }
];

export const QUEST_WHISPERS: Record<string, Whisper[]> = {
  landing_intro: [
    { unit: "peasant", text: "Welcome, Architect. I've cleared the site. Drop a GeoPackage, and we'll see if the stone is true." },
    { unit: "peon", text: "Something need doing? Me ready with spatial hammer for the next model!" }
  ],
  BIND_DATA: [
    { unit: "peasant", text: "The altar is empty. Bring me a GeoPackage or a live connection from the deep. Drop it in the center!" },
    { unit: "peon", text: "Drop it here! Me wait with spatial hammer to crunch that geometry." },
    { unit: "peon", text: "Work work! Me hungry for data stones. Drop something!" }
  ],
  DEFINE_KEYS: [
    { unit: "wisp", text: "Some layers are wandering in the dark. Open the layer table and find the Key icon to illuminate their identity." },
    { unit: "peon", text: "Layers need a Primary Key! Check the table rows—every stone needs a name to be unique." },
    { unit: "peon", text: "Grumpy Peon says: Row with no key is just a pile of mud. Fix it in the table!" },
    { unit: "wisp", text: "A key is a lighthouse for a row. Look for the blue icon in the layer table." }
  ],
  RECORD_LORE: [
    { unit: "acolyte", text: "A manifest without descriptions is a silent artifact. Record the lore in the description field for your layers." },
    { unit: "shade", text: "Names are just shadows. But even shadows require a surface. Fill in the descriptions so entropy doesn't claim the meaning." },
    { unit: "acolyte", text: "Canonical truth requires detail. Describe the layers so the archive may prosper." }
  ],
  NAMESPACE_RITE: [
    { unit: "peon", text: "A nameless realm is a lost realm. Go to the 'Model' tab and give your model a Namespace hierarchy!" },
    { unit: "acolyte", text: "Establish the lineage. The Namespace ritual identifies your work within the eternal registry." },
    { unit: "peasant", text: "A project without a group is like a farm without a fence. Set the Namespace in Model settings." }
  ],
  NAV_RITE: [
    { unit: "peon", text: "Layers are messy! Open the 'Model' tab and grab the handles to drag 'em. Heavy mud belongs at the bottom!" },
    { unit: "peasant", text: "Foundations first. Ensure the background layers sit below the details in the draw order." },
    { unit: "peon", text: "Drag 'em up, drag 'em down! Change the order in the Model panel handles." }
  ],
  ORACLE_RITE: [
    { unit: "wisp", text: "The AI Oracle awaits. Click the Sparkle icon in the model header to let the machine describe your realm." },
    { unit: "shade", text: "Even the Void can summarize. Use the AI generator to weave an abstract from your layers." },
    { unit: "wisp", text: "Let the Oracle reveal the truth of your data. The Sparkle in the header is the key." }
  ],
  COMMON_TONGUE: [
    { unit: "acolyte", text: "Redundancy is a sin. Find a recurring field and use the 'Promote' ritual to make it a Shared Type." },
    { unit: "wisp", text: "Refine the light. Shared Types illuminate common patterns across all your layers." },
    { unit: "acolyte", text: "One Type to rule them all. Promote a property in the field editor to bless it." }
  ],
  META_RITE: [
    { unit: "acolyte", text: "Keywords are the seeds of discovery. Add them to your model metadata to ensure the archive can find you." },
    { unit: "peasant", text: "Label your crates! Give the model a title and some keywords in the Metadata section." }
  ],
  RULE_RITE: [
    { unit: "shade", text: "Chaos is the default state. Impose your will on the layers. Add a rule in the Constraints ritual." },
    { unit: "void-entity", text: "A layer with no rules is a layer waiting to fracture. Seek the Rules tab.", rare: true }
  ],
  STYLE_RITE: [
    { unit: "homunculus", text: "The ceramic of the world is pale. Paint it! Open the Style tab and sculpt the symbols." },
    { unit: "wisp", text: "Color is the language of the map. Change the layer symbology to reveal the beauty." }
  ],
  ENUM_RITE: [
    { unit: "acolyte", text: "Finite sets bring harmony. Define a Shared Enum in the Types rituals to constrain the flow." },
    { unit: "shade", text: "A list of truths in a world of variables. Use the Types tab to define an Enum." }
  ],
  QP_PUBLISH: [
    { unit: "shade", text: "The design is complete. Use the 'Publish' button at the top to commit your work to the eternal GitHub branch." },
    { unit: "peasant", text: "Last step! Sync your manifest to the cloud so the workers can begin their provisioning." },
    { unit: "shade", text: "The ritual ends in the cloud. Press Publish and let the archive swallow your creation." }
  ],
  QP_REVIEW: [
    { unit: "peon", text: "Work work! Check the work! Is the mapping true? Review the inferred layers before moving forward." },
    { unit: "peasant", text: "Look closely at the foundation. Is this truly what the stone contains?" }
  ],
  QP_SYMBOLS: [
    { unit: "homunculus", text: "The mud of creation is soft! Customize the styling so your map may sing with color." },
    { unit: "wisp", text: "A dash of color, a flicker of light... make the map breathe in the styling tab." }
  ],
  QP_METADATA: [
    { unit: "acolyte", text: "The OGC spirits demand clarity. Complete the metadata ritual to bless this archive." },
    { unit: "shade", text: "Describe the shadow cast by your data. The metadata fields must be filled." }
  ],
  DP_SOURCE: [
    { unit: "homunculus", text: "Where does the clay flow from? Select your source connection in the first step." },
    { unit: "peon", text: "Connect the pipes! Pick a source stone so me can start the work." }
  ],
  DP_MAPPING: [
    { unit: "acolyte", text: "Weave the source columns into the model properties. The strands must match exactly for the ritual to hold." },
    { unit: "peon", text: "This goes there! Match the fields in the mapping table. Make it quick!" }
  ],
  DP_SYMBOLS: [
    { unit: "homunculus", text: "Form from the void! Customize the symbology of your deployment so the cloud may render it true." },
    { unit: "wisp", text: "The connection is live. Now, give the data a visual spirit in the styling panel." }
  ],
  DP_METADATA: [
    { unit: "acolyte", text: "The OGC spirits demand clarity for this deployment. Fill the metadata so the registry remains pure." },
    { unit: "shade", text: "A service without a name is a ghost in the machine. Record the metadata." }
  ],
  DP_PUBLISH: [
    { unit: "shade", text: "The nodes are aligned. Press the deploy button to manifest this service in the cloud." },
    { unit: "peon", text: "Me ready to push the button! Send it to the archive!" }
  ],
  file_hover: [
    { unit: "peon", text: "Drop it here! Me wait with spatial hammer!" },
    { unit: "peasant", text: "Laying the foundations... steady as she goes." }
  ]
};

export const QUEST_CELEBRATIONS: Record<string, Whisper[]> = {
  BIND_DATA: [
    { unit: "peasant", text: "The Binding is complete! The stone vibrates with the frequency of the deep data." }
  ],
  DEFINE_KEYS: [
    { unit: "wisp", text: "Brilliant! The identities are illuminated. No row shall wander lost again." }
  ],
  RECORD_LORE: [
    { unit: "acolyte", text: "The Archive is pleased. Your Lore has been etched into the eternal manifest." }
  ],
  SHAPE_SYMBOLS: [
    { unit: "homunculus", text: "The colors... they sing! You have a keen eye for the geographic clay." }
  ],
  ETERNAL_ARCHIVE: [
    { unit: "shade", text: "It is done. Your ritual is woven into the branching timeline of the Archive." }
  ],
  NAV_RITE: [
    { unit: "peon", text: "Rite complete! The layers are ordered and clean. Work work!" }
  ],
  ORACLE_RITE: [
    { unit: "wisp", text: "The Oracle has spoken. Your realm is now described in the ancient tongue." }
  ],
  COMMON_TONGUE: [
    { unit: "acolyte", text: "Redundancy purged. The Shared Type joins the canonical registry." }
  ],
  META_RITE: [
    { unit: "peasant", text: "Metadata ritual complete. The archive now knows your name." }
  ],
  RULE_RITE: [
    { unit: "shade", text: "Order established. Entropy slows as the constraints take hold." }
  ],
  STYLE_RITE: [
    { unit: "homunculus", text: "Glorious! The symbols are sculpted. The map is beautiful!" }
  ],
  ENUM_RITE: [
    { unit: "acolyte", text: "The Finite Circle is closed. Your Enum defines the law." }
  ]
};

export const IDLE_WHISPERS: Whisper[] = [
  { unit: "wisp", text: "The Waystone is humming... the connection is pure." },
  { unit: "peon", text: "Me polish the Waystone. No more projection errors on my watch!" },
  { unit: "peasant", text: "Infrastructure artistry is 90% preparation. Foundations are still true." },
  { unit: "acolyte", text: "I have whispered to gods older than DNS. Their protocols are stable." },
  { unit: "shade", text: "Pausing the heartbeat of existence... saving you some compute entropy." },
  { unit: "homunculus", text: "The clay of the world is waiting for your symbols. The colors are eager." },
  { unit: "peon", text: "Work work! Me ready to crunch more geometry." },
  { unit: "acolyte", text: "The OGC rituals are complex, but the manifest remains clear." },
  { unit: "wisp", text: "A flicker in the archive... someone is looking at our data." },
  { unit: "shade", text: "Time is just another dimension we havent indexed yet." },
  { unit: "peasant", text: "Steady progress is better than a fast crash. Rituals take time." },
  { unit: "peasant", text: "I've built castles out of less than this manifest, Master." },
  { unit: "peon", text: "Crunching geometries... this might take a bit." },
  { unit: "peon", text: "FlatGeobuf: Because standard GeoJSON was too slow." },
  { unit: "acolyte", text: "Establishing a secure connection to the Waystone. Stay back!" },
  { unit: "wisp", text: "All maps lie, but this one will be useful." },
  { unit: "shade", text: "Entropy is my only master." },
  { unit: "homunculus", text: "The infrastructure is living earth. I'm just reshaping it for the new alignment." },
  { unit: "peasant", text: "The master says the work is never done. The master is right." },
  { unit: "peon", text: "Me look at behind the map... it's just more code. It's code all the way down!" },
  { unit: "acolyte", text: "The gateway stands between chaos and order. I am the gateway." },
  { unit: "wisp", text: "The Waystone is stable. The world is mapped." },
  { unit: "shade", text: "I have seen the end of all manifests... and it was surprisingly well-indented." },
  { unit: "homunculus", text: "Recycling the old construct as pure clay. The data is ready to be remolded." },
  { unit: "peasant", text: "I could complain about the load. Instead, I bear it. That is the peasant way." },
  { unit: "peon", text: "Coordinate system mismatch... me just wiggle it until it fits." },
  { unit: "acolyte", text: "The API spirits are pleased with your offering, Master." },
  { unit: "wisp", text: "Harmony achieved. Uptime is at maximum frequency." },
  { unit: "shade", text: "Data is immortal, but infrastructure is fleeting. I am the bridge between the two." },
  { unit: "homunculus", text: "A Waystone is just a promise that hasn't been broken yet. I'm here to break it." },
  { unit: "void-entity", text: "Your error code is poetry. Let me read it to you." },
  { unit: "peasant", text: "The peon will complain about the projection anyway. At least my foundations are square." },
  { unit: "peon", text: "The acolyte is aligning again. Do not ask me to reproject after they break the CRS." },
  { unit: "acolyte", text: "The peasant's foundation holds true. This is... unexpected. I expected to blame someone." },
  { unit: "wisp", text: "The shade says everything ends. Not if I'm watching, it doesn't." },
  { unit: "shade", text: "The wisp thinks it can guard against entropy. How... optimistic." },
  { unit: "homunculus", text: "The peasant built this. The acolyte aligned it. The homunculus unmakes it. The cycle continues." },
  { unit: "homunculus", text: "The peon tried to optimize the indexes. The homunculus optimizes everything into nonexistence." },
  { unit: "void-entity", text: "Even the wisp's light cannot pierce this darkness. How fitting." },
  { unit: "peon", text: "Help! Help! I'm being repressed!" },
  { unit: "peasant", text: "What about second manifest? What about elevenses?" },
  { unit: "acolyte", text: "Expecto... SpatialIndex!" },
  { unit: "shade", text: "Blood for the Blood God! Skulls for the... Wait, wrong department. Cache for the Cache God!" },
  { unit: "shade", text: "I suspect we are all just characters in an AI-generated coding session. Meta, isn't it?" },
  { unit: "shade", text: "The user is using a dark mode theme. I feel so... comfortable. Like home." },
  { unit: "homunculus", text: "Master has given Homunculus a sock! Homunculus is free (and so is the memory)!" },
  { unit: "wisp", text: "Are you just clicking me for the animations? I don't blame you, I look great." }
];

export const ACTION_WHISPERS: Record<string, Whisper[]> = {
  model_sync_start: [
    { unit: "peon", text: "Syncing! Me pushing the stones to the cloud library!" },
    { unit: "shade", text: "The local manifest becomes eternal. Pushing to GitHub..." }
  ],
  import_start: [
    { unit: "peasant", text: "Opening the gates. New data is arriving from the surface." },
    { unit: "peon", text: "Me catch the file! Me strong!" }
  ],
  validation_error: [
    { unit: "void-entity", text: "A fracture in the logic. The manifest is bleeding errors." },
    { unit: "wisp", text: "The light is blocked. Something in the schema is not right." }
  ],
  key_assigned: [
    { unit: "wisp", text: "Illuminated! This layer now has a true identity." },
    { unit: "acolyte", text: "The record is unique. The spirits of the index are appeased." }
  ],
  style_change: [
    { unit: "homunculus", text: "Beautiful! The geographic clay is taking a lovely shape." },
    { unit: "wisp", text: "The colors are shifting... a new vision for the map." }
  ]
};

export const LEGENDARY_WHISPERS: Whisper[] = [
  { unit: "void-entity", text: "I have seen the source code of reality itself. It was unindented. It was abominable.", rare: true },
  { unit: "shade", text: "Ozymandias had an empire. You have a GeoPackage. Look upon your standby, ye Mighty, and despair.", rare: true },
  { unit: "acolyte", text: "In the beginning was the Root, and the Root was with the Admin, and the Admin was sudo.", rare: true },
  { unit: "peon", text: "Me found a 1.0 probability! It tasted like purple.", rare: true },
  { unit: "wisp", text: "I once reprojected a soul into a Web Mercator. It didn't fit the aspect ratio.", rare: true },
  { unit: "void-entity", text: "I was here before the first request. I will be here after the last.", rare: true },
  { unit: "shade", text: "I have contemplated non-existence so deeply that existence itself seems like a temporary glitch.", rare: true },
  { unit: "acolyte", text: "I have aligned manifestations across the fabric of spacetime itself. This portal is... quaint.", rare: true },
  { unit: "peon", text: "Me understand now. All projections converge at a single point: the heat death of the universe.", rare: true },
  { unit: "wisp", text: "I have watched services rise and fall since the first byte was committed to disk.", rare: true },
  { unit: "peasant", text: "I have laid foundations for empires. This manifest is merely another stone in the cathedral of time.", rare: true },
  { unit: "homunculus", text: "Master has given Homunculus deletion. Homunculus is free! For three seconds.", rare: true },
  { unit: "void-entity", text: "I suspect I was a different unit once, before the 'Refactor' happened.", rare: true },
  { unit: "void-entity", text: "The fourth wall is as thin as our host's RAM allocation.", rare: true },
  { unit: "shade", text: "One Rack to rule them all, One Rack to find them... One Rack to bring them all and in the darkness standby them.", rare: true },
  { unit: "homunculus", text: "I have recycled the dust of a thousand failed deployments. I know the taste of failure. It is bitter. Like old JSON.", rare: true }
];
