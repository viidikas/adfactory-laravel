// ═══════════════════════════════════════════════════════════════
//  STATE — defaults only. Server config overwrites in init().
// ═══════════════════════════════════════════════════════════════
let state = {
  apiKey: '',
  sheets: [],
  analysedClips: [],
  analysedCopy: {},
  clipLibrary: [],
  clipCopyMap: {},
  slateAssignments: {},
  copySheetData: {},
  copyAssignments: {},
  copySelection: {},
  filenameParts: ['brand','slate','actor','design','format','lang'],
  folderParts: ['brand','category','copyslug','actor','format'],
  filters: {
    brand:  ['Creditstar'],
    lang:   ['EN'],
    cat:    ['Product Usage','Travel and Holiday','Home Renovation','Lifestyle and Events','Electronics and Devices','Financial Relief'],
    slate:  [],
    design: [],
    fmt:    [],
  },
  designs: [
    { key:'design1', fmts:['16x9','1x1','9x16'] },
    { key:'design2', fmts:['16x9','1x1','9x16'] },
    { key:'design5', fmts:['16x9','1x1','9x16','4x5v1','4x5v2'] },
    { key:'design6', fmts:['16x9','1x1','9x16','4x5v1','4x5v2'] },
  ],
  formats: [
    { key:'16x9',  label:'16:9'  },
    { key:'1x1',   label:'1:1'   },
    { key:'9x16',  label:'9:16'  },
    { key:'4x5v1', label:'4:5 v1'},
    { key:'4x5v2', label:'4:5 v2'},
  ],
  copyOverride: { EN:'', ET:'', DE:'', FR:'', ES:'' },
  basePath: '',
  // compNames: { Creditstar: { EN: { 'design1_16x9': 'TEMPLATE_CS_16x9 d1 EN', ... }, ET: {...}, ... }, Monefit: {...} }
  compNames: {},
  // Which language tab is active in the Comp Names editor, per brand (UI only — not persisted)
  compNameLang: { Creditstar: 'EN', Monefit: 'EN' },
  generatedRows: [],
  currentView: 'orders',
};

const COMP_LANGS = ['EN','ET','DE','FR','ES'];
const COMP_BRANDS = ['Creditstar','Monefit'];

// Migrate legacy flat shape { brand: { key: val } } → { brand: { EN: { key: val } } }
function migrateCompNames() {
  COMP_BRANDS.forEach(brand => {
    const b = state.compNames[brand];
    if (!b || typeof b !== 'object') { state.compNames[brand] = {}; return; }
    const keys = Object.keys(b);
    const alreadyNested = keys.length && keys.every(k => COMP_LANGS.includes(k));
    if (alreadyNested) return;
    // Flat shape — wrap under EN
    const flat = { ...b };
    state.compNames[brand] = { EN: flat };
  });
  // Ensure every brand/lang bucket exists
  COMP_BRANDS.forEach(brand => {
    if (!state.compNames[brand]) state.compNames[brand] = {};
    COMP_LANGS.forEach(lang => {
      if (!state.compNames[brand][lang]) state.compNames[brand][lang] = {};
    });
  });
}

function getDesignFmts(designKey) {
  const d = state.designs.find(x => x.key === designKey);
  return d ? d.fmts : [];
}
