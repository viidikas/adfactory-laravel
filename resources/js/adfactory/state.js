// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════
let state = {
  apiKey: localStorage.getItem('af_api_key') || '',
  sheets: [],
  analysedClips: [],
  analysedCopy: {},
  // Clip Library
  clipLibrary: [],          // { id, name, file, fileHandle, url, category, actor, slate, matchStatus, copyMap }
  clipCopyMap: {},          // legacy — kept for compatibility
  // Copy key assignment: { clipId: 'Mins' } — maps a clip to a copy key slug
  slateAssignments: JSON.parse(localStorage.getItem('af_slate_assignments') || '{}'),
  // Copy sheet data: all parsed rows from sheet
  copySheetData: {},
  // Multi-copy: { slate → [ {key, en, et, fr, de, es, category, brand}, ... ] }
  copyAssignments: JSON.parse(localStorage.getItem('af_copy_assignments') || '{}'),
  // Active copy index per slate: { slate → index } (which of multiple matches to use)
  copySelection: JSON.parse(localStorage.getItem('af_copy_selection') || '{}'),
  // Filename parts order for output filenames
  filenameParts: JSON.parse(localStorage.getItem('af_filename_parts') || 'null') || ['brand','slate','actor','design','format','lang'],
  // Folder structure parts — each becomes one subfolder level
  folderParts: JSON.parse(localStorage.getItem('af_folder_parts') || 'null') || ['brand','category','copyslug','actor','format'],
  filters: {
    brand:  ['Creditstar'],
    lang:   ['EN'],
    cat:    ['Product Usage','Travel and Holiday','Home Renovation','Lifestyle and Events','Electronics and Devices','Financial Relief'],
    slate:  [], // populated from SCENE_DATA — empty means all selected
    design: [],
    fmt:    [],
  },
  // Designs: array of { key, fmts } — fmts is array of format keys
  designs: JSON.parse(localStorage.getItem('af_designs') || 'null') || [
    { key:'design1', fmts:['16x9','1x1','9x16'] },
    { key:'design2', fmts:['16x9','1x1','9x16'] },
    { key:'design5', fmts:['16x9','1x1','9x16','4x5v1','4x5v2'] },
    { key:'design6', fmts:['16x9','1x1','9x16','4x5v1','4x5v2'] },
  ],
  // Formats: array of { key, label }
  formats: JSON.parse(localStorage.getItem('af_formats') || 'null') || [
    { key:'16x9',  label:'16:9'  },
    { key:'1x1',   label:'1:1'   },
    { key:'9x16',  label:'9:16'  },
    { key:'4x5v1', label:'4:5 v1'},
    { key:'4x5v2', label:'4:5 v2'},
  ],
  copyOverride: { EN:'', ET:'', DE:'', FR:'', ES:'' },
  basePath: localStorage.getItem('af_base_path') || '/Users/viljar.sarekanno/Working stuff/Evergreen/AdFactory',
  // compNames: { Creditstar: { 'design1_16x9': 'TEMPLATE_CS_16x9 d1', ... }, Monefit: { ... } }
  compNames: JSON.parse(localStorage.getItem('af_comp_names') || 'null') || {},
  generatedRows: [],
  currentStep: 1,
};

// DESIGN_FMTS is now derived from state.designs dynamically
function getDesignFmts(designKey) {
  const d = state.designs.find(x => x.key === designKey);
  return d ? d.fmts : [];
}
