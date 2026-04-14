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
  compNames: {},
  generatedRows: [],
  currentView: 'orders',
};

function getDesignFmts(designKey) {
  const d = state.designs.find(x => x.key === designKey);
  return d ? d.fmts : [];
}
