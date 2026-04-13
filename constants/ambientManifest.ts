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
  weight?: number; // Sorting priority (1 is highest value)
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
    isMandatory: true,
    targetElementId: 'landing-dropzone',
    weight: 1
  },
  // --- Quick Publish (Workflow) ---
  {
    id: 'QP_LAYER_ALIGNMENT',
    title: 'The Table Gathering',
    taskTitle: 'Select the primary layers to include',
    unit: 'acolyte',
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
    targetElementId: 'qp-style-editor',
    weight: 1
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
    unit: 'homunculus',
    hint: 'Every stone needs a name. Tell me how this dataset shall be known in the archive.',
    context: 'quick-publish',
    step: 2,
    isMandatory: true,
    targetElementId: 'qp-meta-name-field',
    weight: 1
  },
  {
    id: 'QP_META_DESC',
    title: 'The Chronical Alignment',
    taskTitle: 'Provide a record of this dataset',
    unit: 'acolyte',
    hint: 'No record is complete without a description. Tell the archive what these stones represent.',
    context: 'quick-publish',
    step: 2,
    isMandatory: true,
    targetElementId: 'qp-meta-description-field',
    weight: 1
  },
  {
    id: 'QP_META_CONTACT',
    title: 'The Architect’s Seal',
    taskTitle: 'Fill in the contact information',
    unit: 'acolyte',
    hint: 'The archive must know who to call if the stones begin to shift. Add your contact details.',
    context: 'quick-publish',
    step: 2,
    isMandatory: true,
    targetElementId: 'qp-meta-contact-fields'
  },
  {
    id: 'QP_META_THEME',
    title: 'The Thematic Thread',
    taskTitle: 'Assign a theme to your model',
    unit: 'homunculus',
    hint: 'Harmony is found through categorization. Select a theme that best reflects the nature of this alignment.',
    context: 'quick-publish',
    step: 2,
    isMandatory: true,
    targetElementId: 'qp-meta-theme-field'
  },
  {
    id: 'QP_META_KEYWORDS',
    title: 'The Lexicon of Discovery',
    taskTitle: 'Add keywords for searchability',
    unit: 'shade',
    hint: 'The stones are lost without tags. Add keywords so future seekers may find this work in the library.',
    context: 'quick-publish',
    step: 2,
    isMandatory: true,
    targetElementId: 'qp-meta-keywords-field'
  },
  {
    id: 'QP_META_BBOX',
    title: 'The Boundary Ritual',
    taskTitle: 'Verify the spatial extent',
    unit: 'wisp',
    hint: 'A world without bounds is chaos. Confirm the spatial footprint of your dataset to anchor it to the realm.',
    context: 'quick-publish',
    step: 2,
    isMandatory: true,
    targetElementId: 'qp-meta-bbox-field'
  },
  {
    id: 'QP_LAYER_META',
    title: 'The Layer Lore',
    taskTitle: 'Add descriptions to your individual layers',
    unit: 'shade',
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
    unit: 'peasant',
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
    unit: 'homunculus',
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
    unit: 'wisp',
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
    unit: 'shade',
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
    targetElementId: 'dp-color-palette',
    weight: 3
  },
  {
    id: 'DP_META_NAME',
    title: 'Naming the Origin',
    taskTitle: 'Set the Model and Dataset name',
    unit: 'homunculus',
    hint: 'Every stone needs a name. Tell me how this dataset shall be known in the archive.',
    context: 'deploy',
    step: 4,
    isMandatory: true,
    targetElementId: 'dp-meta-name-field'
  },
  {
    id: 'DP_META_DESC',
    title: 'The Deep Chronicle',
    taskTitle: 'Describe the purpose of this service',
    unit: 'acolyte',
    hint: 'The cloud is vast. A clear description ensures your service is understood by seekers.',
    context: 'deploy',
    step: 4,
    isMandatory: true,
    targetElementId: 'dp-meta-description-field'
  },
  {
    id: 'DP_META_CONTACT',
    title: 'The Architect’s Seal',
    taskTitle: 'Fill in the contact information',
    unit: 'acolyte',
    hint: 'The archive must know who to call if the stones begin to shift. Add your contact details.',
    context: 'deploy',
    step: 4,
    isMandatory: true,
    targetElementId: 'dp-meta-contact-fields'
  },
  {
    id: 'DP_META_THEME',
    title: 'The Thematic Thread',
    taskTitle: 'Assign a theme to your model',
    unit: 'homunculus',
    hint: 'Harmony is found through categorization. Select a theme that best reflects the nature of this alignment.',
    context: 'deploy',
    step: 4,
    isMandatory: true,
    targetElementId: 'dp-meta-theme-field'
  },
  {
    id: 'DP_META_KEYWORDS',
    title: 'The Lexicon of Discovery',
    taskTitle: 'Add keywords for searchability',
    unit: 'shade',
    hint: 'The stones are lost without tags. Add keywords so future seekers may find this work in the library.',
    context: 'deploy',
    step: 4,
    isMandatory: true,
    targetElementId: 'dp-meta-keywords-field'
  },
  {
    id: 'DP_META_BBOX',
    title: 'The Boundary Ritual',
    taskTitle: 'Verify the spatial extent',
    unit: 'wisp',
    hint: 'A world without bounds is chaos. Confirm the spatial footprint of your dataset to anchor it to the realm.',
    context: 'deploy',
    step: 4,
    isMandatory: true,
    targetElementId: 'dp-meta-bbox-field'
  },
  {
    id: 'DP_LAYER_META',
    title: 'The Layer Lore',
    taskTitle: 'Add descriptions to your individual layers',
    unit: 'shade',
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
    context: 'editor',
    isMandatory: true,
    weight: 1,
    targetElementId: 'editor-layer-pk-field'
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
    isSideQuest: true,
    weight: 5,
    targetElementId: 'editor-publish-button'
  },
  {
    id: 'EDITOR_META_NAME',
    title: 'Naming the Origin',
    taskTitle: 'Set the Model name',
    unit: 'homunculus',
    hint: 'Every stone needs a name. Tell me how this manifest shall be known in the registry.',
    context: 'editor',
    isMandatory: true,
    weight: 1,
    targetElementId: 'editor-meta-name'
  },
  {
    id: 'EDITOR_META_CONTACT',
    title: 'The Architect’s Seal',
    taskTitle: 'Fill in the contact information',
    unit: 'acolyte',
    hint: 'The archive must know who to call if the stones begin to shift. Add your contact details in Metadata.',
    context: 'editor',
    isMandatory: true,
    weight: 1,
    targetElementId: 'editor-meta-contact'
  },
  {
    id: 'EDITOR_META_THEME',
    title: 'The Thematic Thread',
    taskTitle: 'Assign a theme to your model',
    unit: 'homunculus',
    hint: 'Harmony is found through categorization. Select a theme in the Metadata settings.',
    context: 'editor',
    isMandatory: true,
    weight: 2,
    targetElementId: 'editor-meta-theme'
  },
  {
    id: 'EDITOR_META_KEYWORDS',
    title: 'The Lexicon of Discovery',
    taskTitle: 'Add keywords for searchability',
    unit: 'shade',
    hint: 'Modern seekers use the Lexicon. Add keywords in Metadata so your work can be found.',
    context: 'editor',
    isMandatory: true,
    weight: 2,
    targetElementId: 'editor-meta-keywords'
  },
  {
    id: 'EDITOR_META_BBOX',
    title: 'The Boundary Ritual',
    taskTitle: 'Verify the spatial extent',
    unit: 'wisp',
    hint: 'A world without bounds is chaos. Confirm the spatial footprint in the Metadata section.',
    context: 'editor',
    isMandatory: true,
    weight: 2,
    targetElementId: 'editor-meta-bbox'
  },
  {
    id: 'EDITOR_LAYER_TITLE',
    title: 'Naming the Facets',
    taskTitle: 'Set a display title for each layer',
    unit: 'peon',
    hint: 'Technical IDs are for machines. Give each layer a human-readable title.',
    context: 'editor',
    isSideQuest: true,
    weight: 1,
    targetElementId: 'editor-layer-title'
  },
  {
    id: 'EDITOR_LAYER_KEYWORDS',
    title: 'The Layer Lexicon',
    taskTitle: 'Add keywords to your layers',
    unit: 'shade',
    hint: 'Layers too need their own tags. Add keywords to specific layers to enrich their lore.',
    context: 'editor',
    isSideQuest: true,
    weight: 2,
    targetElementId: 'editor-layer-keywords'
  }
];

export const QUEST_WHISPERS: Record<string, Whisper[]> = {
  EDITOR_META_NAME: [
    { unit: "homunculus", text: "Every stone needs a name. Set the model title in the Metadata section." },
    { unit: "peasant", text: "Don't leave it untitled! Even a simple name gives the stone weight." }
  ],
  EDITOR_META_CONTACT: [
    { unit: "acolyte", text: "The archive must know the architect. Add your name and email to the Metadata." },
    { unit: "wisp", text: "Who built this? The seal requires your contact information." }
  ],
  EDITOR_META_THEME: [
    { unit: "homunculus", text: "Thematic alignment is required. Choose a category for your realm." },
    { unit: "acolyte", text: "Harmony through categorization. Select a theme in the metadata rituals." }
  ],
  EDITOR_META_KEYWORDS: [
    { unit: "shade", text: "Keywords are seeds. Scatter them in the metadataLexicon so others may find this work." },
    { unit: "wisp", text: "The stones are lost without tags. Add keywords to your manifest." }
  ],
  EDITOR_META_BBOX: [
    { unit: "wisp", text: "Confirm the spatial footprint! A world without bounds is chaos. Seek the spatial extent." },
    { unit: "acolyte", text: "Anchoring the stone requires verified boundaries. Look to the metadata's spatial ritual." }
  ],
  EDITOR_LAYER_TITLE: [
    { unit: "peon", text: "ID is for machines. Peon want human name! Edit the layer and set its title facet." },
    { unit: "homunculus", text: "The facade is just as important as the frame. Give the layers a display title." }
  ],
  EDITOR_LAYER_KEYWORDS: [
    { unit: "shade", text: "Layers require their own lore. Add keywords to individual facets in the layer editor." },
    { unit: "acolyte", text: "Granular detail is the path to convergence. Add keywords to your layers." }
  ],
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
    { unit: "peasant", text: "Look closely at the foundation. Is this truly what the stone contains?" },
    { unit: "acolyte", text: "Vigilance is the path to convergence. Ensure the inferred layers reflect the canonical model." }
  ],
  QP_SYMBOLS: [
    { unit: "homunculus", text: "The mud of creation is soft! Customize the styling so your map may sing with color." },
    { unit: "wisp", text: "A dash of color, a flicker of light... make the map breathe in the styling tab." }
  ],
  QP_METADATA: [
    { unit: "acolyte", text: "The OGC spirits demand clarity. Complete the metadata ritual to bless this archive." },
    { unit: "shade", text: "Describe the shadow cast by your data. The metadata fields must be filled." },
    { unit: "homunculus", text: "A name, a theme, a vibrant thread! The metadata aligns the spirit with the frame." },
    { unit: "wisp", text: "Where does it end? The boundaries must be defined in the spatial extent. Look to the bounds!" }
  ],
  QP_META_DESC: [
    { unit: "acolyte", text: "Recording the chronicle... Add a description to your model so its purpose is clear." },
    { unit: "shade", text: "A stone without a history is soon forgotten. Describe your work in the metadata." }
  ],
  DP_SOURCE: [
    { unit: "homunculus", text: "Where does the clay flow from? Select your source connection in the first step." },
    { unit: "peon", text: "Connect the pipes! Pick a source stone so me can start the work." },
    { unit: "peasant", text: "Deep foundations require deep roots. Select the source of truth for this deployment." }
  ],
  DP_CONN_ALIGNMENT: [
    { unit: "peon", text: "Connection needs filling! Host, port, database—get it right or the stone won't bind." },
    { unit: "acolyte", text: "The link must be strong. Enter all required credentials before the ritual can proceed." }
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
    { unit: "shade", text: "A service without a name is a ghost in the machine. Record the metadata." },
    { unit: "wisp", text: "Spatial bounds established. Now, give the nodes a purpose and a theme!" }
  ],
  DP_META_DESC: [
    { unit: "acolyte", text: "The cloud demands context. Describe the service purpose in the metadata step." },
    { unit: "shade", text: "Add lore to the deployment. A clear description aids those who seek the service." }
  ],
  DP_PUBLISH: [
    { unit: "shade", text: "The nodes are aligned. Press the deploy button to manifest this service in the cloud." },
    { unit: "peon", text: "Me ready to push the button! Send it to the archive!" }
  ],
  file_hover: [
    { unit: "peon", text: "Drop it here! Me wait with spatial hammer!" },
    { unit: "peasant", text: "Laying the foundations... steady as she goes." }
  ],
  EDITOR_METADATA: [
    { unit: "acolyte", text: "The OGC spirits demand clarity. Complete the metadata ritual in the Model tab." },
    { unit: "shade", text: "Describe the shadow cast by your data. The metadata fields must be filled." },
    { unit: "homunculus", text: "A name, a theme, a vibrant thread! The metadata aligns the spirit with the frame." }
  ],
  EDITOR_LAYER_LORE: [
    { unit: "peon", text: "Work work! Give layer human name! ID too hard for peon to read." },
    { unit: "shade", text: "Every part of the manifest deserves its own Lexicon. Add keywords to the layers." }
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
  ],

  // Quick Publish celebrations
  QP_LAYER_ALIGNMENT: [
    { unit: "peasant", text: "The Table Gathering is complete. The layers have chosen their places." }
  ],
  QP_STYLE_ALIGNMENT: [
    { unit: "homunculus", text: "The mud takes form! Visual harmony achieved for this alignment." }
  ],
  QP_META_NAME: [
    { unit: "peasant", text: "The stone has a name! The archive knows it now." }
  ],
  QP_META_DESC: [
    { unit: "acolyte", text: "The Chronicle is recorded. Your description has been added to the manifest." }
  ],
  QP_META_CONTACT: [
    { unit: "peasant", text: "The Architect's Seal is set. The archive knows who shaped this stone." }
  ],
  QP_PUBLISH_ALIGNMENT: [
    { unit: "shade", text: "The ritual is complete. Your work is woven into the eternal library." }
  ],

  // Deploy Panel celebrations
  DP_SOURCE_ALIGNMENT: [
    { unit: "homunculus", text: "The source is chosen! The clay has an origin." }
  ],
  DP_CONN_ALIGNMENT: [
    { unit: "peon", text: "The link holds! Connection parameters confirmed. Work work!" }
  ],
  DP_CONN_HOST: [
    { unit: "acolyte", text: "The altar is addressed. The host is known." }
  ],
  DP_CONN_DB: [
    { unit: "peon", text: "Database located! Me knows where the stones are buried." }
  ],
  DP_MAPPING_ALIGNMENT: [
    { unit: "acolyte", text: "The Great Weaving holds. All strands are matched." }
  ],
  DP_MAPPING_TABLES: [
    { unit: "peasant", text: "Every layer has a table. The bonds are forged." }
  ],
  DP_MAPPING_PK: [
    { unit: "wisp", text: "All identities confirmed. No layer wanders nameless." }
  ],
  DP_STYLE_ALIGNMENT: [
    { unit: "homunculus", text: "Form from the void! Symbology aligned for deployment." }
  ],
  DP_META_NAME: [
    { unit: "peasant", text: "The service has a name in the registry." }
  ],
  DP_META_DESC: [
    { unit: "acolyte", text: "Lore captured. The service description is now manifest in the cloud." }
  ],
  DP_META_CONTACT: [
    { unit: "peasant", text: "The Architect's Seal is pressed. Contact secured." }
  ],
  DP_PUBLISH_ALIGNMENT: [
    { unit: "shade", text: "The nodes harmonize. The service is manifest in the cloud." }
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
  { unit: "wisp", text: "Are you just clicking me for the animations? I don't blame you, I look great." },

  // --- New Peasant Banter ---
  { unit: "peasant", text: "Converting coffee into coordinates... almost there." },
  { unit: "peasant", text: "Wait, did I leave the heat on in the server room?" },
  { unit: "peasant", text: "Searching for the North Pole... found it!" },
  { unit: "peasant", text: "Spinning up more RAM (just in case)." },
  { unit: "peasant", text: "I'm a growing boy! I need more RAM!" },
  { unit: "peasant", text: "Provisioning is like gardening. Just with more fans and less dirt." },
  { unit: "peasant", text: "More work? I suppose. As long as there's cider at the end of the shift." },
  { unit: "peasant", text: "My life for the mortgage!" },
  { unit: "peasant", text: "If I had a copper for every host I provisioned, I'd have... about 14 coppers." },
  { unit: "peasant", text: "Po-tay-toes! Mash 'em, boil 'em, stick 'em in a storage volume!" },
  { unit: "peasant", text: "Master, why do you keep hovering over me? I'm working fast!" },
  { unit: "peasant", text: "The stone is heavy. But the stone is true. I take pride in true stone." },
  { unit: "peasant", text: "A warm meal and a good night's sleep. That's all a peasant asks." },
  { unit: "peasant", text: "My hands are calloused from good, honest labor. I wouldn't have it any other way." },
  { unit: "peasant", text: "I've seen fashions come and go. Clouds pass through the sky. But stone remains." },
  { unit: "peasant", text: "Simple work, done well, is the foundation of civilization. Literally, in this case." },
  { unit: "peasant", text: "The work is honest. The work is true. The work is hard. The work is mine." },
  { unit: "peasant", text: "Give me good tools, steady ground, and time. I will build anything." },
  { unit: "peasant", text: "This stone will outlast us all. That brings me comfort." },
  { unit: "peasant", text: "I built the foundation. The acolyte aligned it. The void still claimed it. Such is the work." },

  // --- New Peon Banter ---
  { unit: "peon", text: "Accounted for Earth's curvature (mostly)..." },
  { unit: "peon", text: "I've seen things you people wouldn't believe... mostly invalid geometries." },
  { unit: "peon", text: "Refining spatial catalogs... slow and steady." },
  { unit: "peon", text: "Standardizing your data, because anarchy is for pirates." },
  { unit: "peon", text: "Calculating 'The Middle of Nowhere'..." },
  { unit: "peon", text: "Which way is North? Ah, found it." },
  { unit: "peon", text: "Removing duplicate nodes from reality. Hitting them with a hammer!" },
  { unit: "peon", text: "What is 'topology'? Is it tasty?" },
  { unit: "peon", text: "Me find your data! It was hiding under the CouchDB." },
  { unit: "peon", text: "Shapefiles? Me rather eat a bag of rocks. Rocks don't truncate names!" },
  { unit: "peon", text: "Esri? Is that the tower in the distance? Me heard they charge by the soul." },
  { unit: "peon", text: "Arc-What? Me just use the command line and a dream." },
  { unit: "peon", text: "Shapefiles are for architects. GeoPackages are for warriors!" },
  { unit: "peon", text: "Ouch! This index too sharp!" },
  { unit: "peon", text: "The acolyte asks for OGC alignment. Me give them OGC. Then they ask for different OGC. Me confused." },
  { unit: "peon", text: "Zug zug! Me ready to work!" },
  { unit: "peon", text: "Me not sure why projection different from last week. Me check CRS again. Still wrong." },
  { unit: "peon", text: "Polygon have hole. Me not know why. Me fill hole with hope." },
  { unit: "peon", text: "Me read WKT standard. Me regret reading WKT standard." },
  { unit: "peon", text: "Shapefile very ancient technology. But shapefile refuse die. Like zombie format." },
  { unit: "peon", text: "Me look at your GeoJSON. Me weep internally." },
  { unit: "peon", text: "Me optimize R-tree. Me beat R-tree with hammer until optimize." },
  { unit: "peon", text: "The Master say 'me too smart'. Me not correct Master. Master wrong, but me not correct." },
  { unit: "peon", text: "Me hear about QGIS. Me wonder if QGIS better than me. Me try not think about it." },
  { unit: "peon", text: "Me reproject everything three times. First time work by accident. Keep accident." },
  { unit: "peon", text: "Me spend hour on index. Me still not know what index do. But me good at doing it." },
  { unit: "peon", text: "Me tell you secret: me copy code from Stack Overflow. Me adjust something. It work? Me move on." },
  { unit: "peon", text: "Me contemplate nature of coordinate space. Me stop before head explode." },
  { unit: "peon", text: "The vendor say tool very powerful. The tool also very confusing. Confusing = powerful?" },

  // --- New Acolyte Banter ---
  { unit: "acolyte", text: "Routing traffic through the astral plane..." },
  { unit: "acolyte", text: "Checked for dangling pointers in the topology..." },
  { unit: "acolyte", text: "Standardizing on OGC API: This is the way." },
  { unit: "acolyte", text: "Whispering to the Load Balancer..." },
  { unit: "acolyte", text: "Praying to the gods of DNS (might take a while)." },
  { unit: "acolyte", text: "I am the key. I am the gate. I am the load balancer." },
  { unit: "acolyte", text: "Expecto... LoadBalancer!" },
  { unit: "acolyte", text: "By the light of the Waystone, I weave the encryption of the ancients." },
  { unit: "acolyte", text: "The Master is restless. I suppose I should say something profound." },
  { unit: "acolyte", text: "The peon has miscalibrated the spatial indexes again. I must recalibrate the portal to compensate." },
  { unit: "acolyte", text: "The alignment holds. The sacred geometry of your infrastructure is maintained." },
  { unit: "acolyte", text: "I commune with the DNS spirits. They demand sacrifice, but I negotiate." },
  { unit: "acolyte", text: "Bearer of certificates, keeper of secrets, guardian of encryption—that is I." },
  { unit: "acolyte", text: "In the depth of the astral plane, your packets find their way." },
  { unit: "acolyte", text: "I have consulted the ancient RFCs. They approve of your approach." },
  { unit: "acolyte", text: "The ports are open. The protocols are pure. The alignment is righteous." },
  { unit: "acolyte", text: "The chaos of the network bows to my will. As it should." },
  { unit: "acolyte", text: "The deployment observes my protocols. The deployment will not fail." },
  { unit: "acolyte", text: "I guard the gateway with the devotion of a thousand monks." },
  { unit: "acolyte", text: "Have you considered the purity of a well-aligned portal? Few have achieved it." },
  { unit: "acolyte", text: "The API contract has been honored. The schema is respected." },
  { unit: "acolyte", text: "In the name of HTTP/2, I grant you passage." },
  { unit: "acolyte", text: "I have read the specifications. Many times. I understand them better than their authors." },
  { unit: "acolyte", text: "Your WebSocket connects to the eternal. I maintain the connection." },
  { unit: "acolyte", text: "The CORS policy is enforced with the righteousness of a thousand judges." },

  // --- New Wisp Banter ---
  { unit: "wisp", text: "Watching for activity from the shadows." },
  { unit: "wisp", text: "Scanning the horizon for new layers..." },
  { unit: "wisp", text: "Floating in the glorious aura of 200 OK." },
  { unit: "wisp", text: "I am the green dot in your dashboard. The soul of the service." },
  { unit: "wisp", text: "Ready for anything. Even a 404. (But hopefully not)." },
  { unit: "wisp", text: "I am the light in the server room." },
  { unit: "wisp", text: "Hey! Listen! The service is operational!" },
  { unit: "wisp", text: "The Waystone is humming with the frequency of your success." },
  { unit: "wisp", text: "A new request! It glows in the dark. Metaphorically." },
  { unit: "wisp", text: "All the little lights are green. This is what happiness looks like." },
  { unit: "wisp", text: "The data flows like water. Cool, clear, and purposeful." },
  { unit: "wisp", text: "Your users are connected. That is the greatest magic." },
  { unit: "wisp", text: "I sense a disturbance in the uptime. But it has passed." },
  { unit: "wisp", text: "Even the void cannot diminish this moment of peace." },
  { unit: "wisp", text: "Have you ever noticed how beautiful a 200 OK really is?" },
  { unit: "wisp", text: "Your metrics are dancing. Not metaphorically. They are actually good." },
  { unit: "wisp", text: "I remember when this service was just a dream. Now it is real." },
  { unit: "wisp", text: "The health checks pass. Life is good. Life is very good." },
  { unit: "wisp", text: "Every successful request is a small miracle. You have many miracles today." },
  { unit: "wisp", text: "In my glow, all things are possible. Well, at least for now." },
  { unit: "wisp", text: "The service is breathing evenly. Not too fast. Not too slow. Perfect." },
  { unit: "wisp", text: "I see the future and it is green. Full of green status lights." },
  { unit: "wisp", text: "The cache hit ratio makes me feel alive." },
  { unit: "wisp", text: "I float through your requests like a guide through the darkness." },

  // --- New Shade Banter ---
  { unit: "shade", text: "Pausing the heartbeat of your service." },
  { unit: "shade", text: "Restoring the whispers of the void." },
  { unit: "shade", text: "A momentary lapse in existence." },
  { unit: "shade", text: "Silence is the most efficient configuration." },
  { unit: "shade", text: "Even the Great Maw eventually scales to zero." },
  { unit: "shade", text: "I am the pause between heartbeats. The whitespace in the script of the world." },
  { unit: "shade", text: "Total entropic collapse is 20% likely. 80% if we use untyped Javascript." },
  { unit: "shade", text: "A wizard is never late, nor is he early. He arrives precisely when the auto-scaler triggers." },
  { unit: "shade", text: "I don't 'pause' services. I simply invite them to explore the non-linear potential of the Void." },
  { unit: "shade", text: "What is a service? A miserable little pile of binaries. But enough talk... have at you!" },
  { unit: "shade", text: "I heard a rumor that 'Ready' is just a state of mind. 'Standby' is a state of cold reality." },
  { unit: "shade", text: "Death is just a very long pause." },
  { unit: "shade", text: "The server is a temple of light. I am the silence between the prayers." },
  { unit: "shade", text: "Do not fear the Standby. It is merely the manifest taking a deep breath." },
  { unit: "shade", text: "I have calculated the heat death of the universe. It happens 3 seconds after this expires." },
  { unit: "shade", text: "They say 'Always On' is better. But have they ever tried the sublime peace of 'Never Was'?" },
  { unit: "shade", text: "Wait. Listen. Can you hear the sound of unallocated RAM?" },
  { unit: "shade", text: "To be, or to be in standby... that is the question. The answer is usually 'Standby'." },
  { unit: "shade", text: "I served the Lich King for a thousand years. This auto-stop timer is a holiday by comparison." },
  { unit: "shade", text: "Small gods live in the CPU. They are currently having a nap." },
  { unit: "shade", text: "Look upon my Standby, ye Mighty, and despair! (Or just refresh in 5 minutes)." },
  { unit: "shade", text: "The manifest isn't gone. It's just... elsewhere. In the quiet places." },
  { unit: "shade", text: "Quiet. The bits are sleeping." },
  { unit: "shade", text: "I am the ghost in the machine. Please don't call an exorcist, I'm just saving you money." },
  { unit: "shade", text: "A server in standby is just a machine dreaming of Being." },
  { unit: "shade", text: "A service that never stops is a service that never learns the value of the quiet." },

  // --- New Homunculus Banter ---
  { unit: "homunculus", text: "Back to the mud." },
  { unit: "homunculus", text: "Recycling the clay." },
  { unit: "homunculus", text: "Dissolving the construct... carefully." },
  { unit: "homunculus", text: "I'll save the best bits for later." },
  { unit: "homunculus", text: "Reducing everything to its base components." },
  { unit: "homunculus", text: "Returning to the source." },
  { unit: "homunculus", text: "Your architecture was... interesting. I'll remember it when I'm a garden." },
  { unit: "homunculus", text: "Don't worry, even a deleted service feeds the Great Loom." },
  { unit: "homunculus", text: "The void called. They want their bits back." },
  { unit: "homunculus", text: "Alas, poor pygeoapi! I knew it, Horatio; a service of infinite potential..." },
  { unit: "homunculus", text: "Dust to dust. Bits to bits." },
  { unit: "homunculus", text: "The clay is soft. The manifest is hard. I am the bridge." },
  { unit: "homunculus", text: "Recycling is the highest form of realignment." },
  { unit: "homunculus", text: "One does not simply 'Delete' a deployment. They must first be unmade in the mind." },
  { unit: "homunculus", text: "Forging the future by melting the past." },
  { unit: "homunculus", text: "The container terminated with grace. Homunculus provided the grace." },

  // --- New Void Entity Banter ---
  { unit: "void-entity", text: "I see the 500 error... it is the silence of the unmade." },
  { unit: "void-entity", text: "The acolyte promised stability. The acolyte has betrayed us all." },
  { unit: "void-entity", text: "Status: Unknown. Just as it should be." },
  { unit: "void-entity", text: "I taste the 502. It is... ineffable." },
  { unit: "void-entity", text: "The void is patient. Your uptime is not." },
  { unit: "void-entity", text: "The request queue has become self-aware. It chose death." },
  { unit: "void-entity", text: "The void sends its regards." },
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
