// ═══════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════

const LANGS = ['EN','ET','DE','FR','ES'];

// Category → short slug used in filenames
const CATEGORY_SLUG = {
  'Product Usage':           'PU',
  'Travel and Holiday':      'TH',
  'Home Renovation':         'HR',
  'Lifestyle and Events':    'LE',
  'Electronics and Devices': 'ED',
  'Financial Relief':        'FR',
};

// ─── COPY KEYS — from Simplicity Final Lines sheet ───────────
// key → { en, et, fr, de, es }
const COPY_KEYS = {
  'Tap':        { en:'Tap to invest',                        et:'Puuduta, et investeerida',                  fr:'Appuyez pour investir',                            de:'Zum Investieren tippen',                  es:'Invierte con un toque' },
  'Small':      { en:'Small investment, big potential',      et:'Väike investeering, suur potentsiaal',      fr:'Petit investissement, grand potentiel',            de:'Kleine Investition, großes Potenzial',    es:'Pequeña inversión, gran potencial' },
  'Easy':       { en:'Easy peasy suncream squeezy',          et:'Lust ja lillepidu',                         fr:'Facile comme bonjour, la crème solaire',           de:'Sonnencreme quetschen, kinderleicht',     es:'Fácil, fácil… como el verano' },
  'Save':       { en:'Save today, travel tomorrow',          et:'Säästa täna, reisi homme',                  fr:'Économisez aujourd\'hui, voyagez demain',          de:'Heute sparen, morgen reisen',             es:'Ahorra hoy, viaja mañana' },
  'Strong':     { en:'A stronger home ahead',                et:'Tugevam kodu tulevikuks',                   fr:'Un foyer plus solide en perspective',              de:'Ein stärkeres Zuhause voraus',            es:'Un hogar más sólido por venir' },
  'Vowa':       { en:'Future vows, funded',                  et:'Rahasta teie ühist tulevikku',              fr:'Des vœux d\'avenir, financés',                     de:'Zukünftige Gelübde, finanziert',          es:'Promesas de futuro, bien financiadas' },
  'Cake':       { en:'Investing is piece of cake',           et:'Investeerimine on magusalt lihtne',         fr:'Investir, c\'est simple comme bonjour',            de:'Investieren ist kinderleicht',            es:'Invertir es pan comido' },
  'Retire':     { en:'Retirement starts today',              et:'Pensionipõlv algab täna',                   fr:'La retraite commence aujourd\'hui',                de:'Der Ruhestand beginnt heute',             es:'Tu jubilación empieza hoy' },
  'Big':        { en:'Invest in the big moments',            et:'Investeeri suurtesse hetkedesse',           fr:'Investissez dans les grands moments',              de:'Investiere in die großen Momente',        es:'Invierte en los grandes momentos' },
  'Phone':      { en:'Invest for your next phone',           et:'Investeeri järgmisesse telefoni',           fr:'Investissez pour votre prochain téléphone',        de:'Investiere für dein nächstes Handy',      es:'Invierte para tu próximo teléfono' },
  'Smart':      { en:'Smart investing for smart tech',       et:'Nutikas investeerimine nutikasse tehnoloogiasse', fr:'L\'investissement intelligent pour la tech intelligente', de:'Smart investieren in smarte Technologie', es:'Inversión inteligente para tecnología inteligente' },
  'Double tap': { en:'Tap. Apply. Done.',                    et:'Puuduta. Taotle. Valmis.',                  fr:'Appuyez. Appliquez. Terminé.',                     de:'Tippen. Anwenden. Fertig.',               es:'Toca. Solicita. Listo.' },
  'Mins':       { en:'Money in minutes',                     et:'Raha minutitega',                           fr:'De l\'argent en quelques minutes',                 de:'Geld in Minuten',                         es:'Dinero en minutos' },
  'Relax':      { en:'Apply today, relax tomorrow',          et:'Taotle täna, puhka homme',                  fr:'Postulez aujourd\'hui, détendez-vous demain',      de:'Heute bewerben, morgen entspannen',       es:'Solicita hoy, relájate mañana' },
  'Fun':        { en:'Funds for fun',                        et:'Raha teeb rõõmsaks',                        fr:'Fonds pour le plaisir',                            de:'Geld für Spaß',                           es:'Fondos para diversión' },
  'Suncream':   { en:'Easy peasy suncream squeezy',          et:'Lust ja lillepidu',                         fr:'Facile comme bonjour, la crème solaire',           de:'Sonnencreme leicht gemacht',              es:'Fácil, fácil… como el verano' },
  'Fun fun':    { en:'Today funds, tomorrow fun',            et:'Kui täna kogud, on homme lõbus',            fr:'Aujourd\'hui les fonds, demain le plaisir',        de:'Heute Geld, morgen Spaß',                 es:'Los fondos de hoy, la diversión de mañana' },
  'Paint':      { en:'Fresh paint, fresh start',             et:'Värske värv, värske algus',                 fr:'Nouvelle peinture, nouveau départ',                de:'Frische Farbe, frischer Start',           es:'Nuevo color, nuevo comienzo' },
  'Build':      { en:'Borrow smart, build happy',            et:'Laena targalt, ehita rõõmuga',              fr:'Empruntez intelligemment, construisez sereinement',de:'Clever leihen, glücklich leben',          es:'Solicita hoy, construye con ilusión' },
  'Glow-Up':    { en:'Your home glow-up made easy',          et:'Renoveeri kodu veelgi lihtsamalt',          fr:'Sublimez votre intérieur facilement',              de:'Dein Home-Glow-up leicht gemacht',        es:'Dale a tu hogar el cambio que merece' },
  'Forever':    { en:'Fund your forever',                    et:'Toeta oma tulevikku',                       fr:'Financez votre avenir',                            de:'Finanziere dein Für-immer',               es:'Financia tu "para siempre"' },
  'Living':     { en:'A loan for living',                    et:'Laen elu elamiseks',                        fr:'Un prêt pour vivre',                               de:'Ein Kredit zum Leben',                    es:'Financiación para vivir mejor' },
  'Moving':     { en:'Because life keeps moving',            et:'Sest elu läheb edasi',                      fr:'Parce que la vie continue',                        de:'Weil das Leben nicht stehen bleibt',      es:'Porque la vida sigue avanzando' },
  'Device':     { en:'Borrow for better devices',            et:'Laena ja uuenda oma tehnikat',              fr:'Empruntez pour de meilleurs appareils',            de:'Leihen für bessere Geräte',               es:'Solicita para mejores dispositivos' },
  'Matter':     { en:'Help when it matters',                 et:'Abi siis, kui seda vajad',                  fr:'Une aide quand il le faut',                        de:'Hilfe, wenn es darauf ankommt',           es:'Apoyo cuando más lo necesitas' },
  'Stress':     { en:'Stress less, live more',               et:'Vähem stressi, rohkem elu',                 fr:'Moins de stress, plus de vie',                     de:'Weniger Stress, mehr Leben',              es:'Menos preocupaciones, más vida' },
};

// ─── SCENE DATA — all 6 category clip manifests ──────────────
const SCENE_DATA = [
  // PRODUCT USAGE
  { slate:'PU1',  category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Phone passed from one hand to another, smile' },
  { slate:'PU2',  category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Standing hero pose with phone in hand' },
  { slate:'PU3',  category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Phone raised from waist to eyelevel' },
  { slate:'PU4',  category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'One-hand phone use, other hand relaxed' },
  { slate:'PU5',  category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Showing phone screen directly to camera' },
  { slate:'PU6',  category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Using phone with both hands' },
  { slate:'PU7',  category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Phone in hand – single confident tap' },
  { slate:'PU8',  category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Phone in hand – tapping and typing' },
  { slate:'PU9',  category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Over-the-shoulder phone scroll' },
  { slate:'PU10', category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Tight phone tap (Macro focus)' },
  { slate:'PU11', category:'Product Usage', actor_options:[], markets:'EEA', shot:'(no actors assigned)' },
  { slate:'PU12', category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Phone scroll — tight on screen' },
  { slate:'PU13', category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Phone tap — wide angle' },
  { slate:'PU14', category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Hero stance, phone raised' },
  { slate:'PU15', category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Two-hand phone interaction' },
  { slate:'PU16', category:'Product Usage', actor_options:['Andrey','Kemal'],                               markets:'EEA', shot:'Phone tap — close-up hands' },
  { slate:'PU17', category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Smile to camera with phone' },
  { slate:'PU18', category:'Product Usage', actor_options:['Victoria','Andrey','Viktoria','Kemal','Lauri'], markets:'EEA', shot:'Walking shot with phone' },
  // TRAVEL AND HOLIDAY
  { slate:'TH1',  category:'Travel and Holiday', actor_options:['Victoria','Andrey','Viktoria'], markets:'CZ, ES, PL, EE', shot:'Pulling a suitcase into frame + walking away' },
  { slate:'TH2',  category:'Travel and Holiday', actor_options:['Victoria','Andrey','Viktoria'], markets:'CZ, ES, PL, EE', shot:'Pulling a suitcase (lower half) + walking away' },
  { slate:'TH3',  category:'Travel and Holiday', actor_options:['Victoria','Andrey','Viktoria'], markets:'EEA',            shot:'Two people walking through the camera' },
  { slate:'TH4',  category:'Travel and Holiday', actor_options:['Victoria','Andrey','Viktoria'], markets:'CZ, ES, PL, EE', shot:'Walk into frame + Dropping beach towel over shoulder' },
  { slate:'TH5',  category:'Travel and Holiday', actor_options:['Victoria','Andrey','Viktoria'], markets:'CZ, ES, PL, EE', shot:'Sitting/lying on towel, applying suncream' },
  { slate:'TH6',  category:'Travel and Holiday', actor_options:['Victoria','Andrey','Viktoria'], markets:'CZ, ES, PL, EE', shot:'Posing with sunglasses' },
  { slate:'TH7',  category:'Travel and Holiday', actor_options:['Victoria','Andrey','Viktoria'], markets:'CZ, ES, PL, EE', shot:'Taking a selfie' },
  { slate:'TH8',  category:'Travel and Holiday', actor_options:['Victoria','Andrey','Viktoria'], markets:'CZ, ES, PL, EE', shot:'Checking boarding pass / passport' },
  { slate:'TH9',  category:'Travel and Holiday', actor_options:['Victoria','Andrey','Viktoria'], markets:'CZ, ES, PL, EE', shot:'Hero shot at departure gate' },
  { slate:'TH10', category:'Travel and Holiday', actor_options:['Victoria','Andrey','Viktoria'], markets:'EEA, CZ',        shot:'Celebrating arrival at destination' },
  { slate:'TH11', category:'Travel and Holiday', actor_options:['Victoria','Andrey','Viktoria'], markets:'CZ, ES, PL, EE', shot:'Looking at map / phone on holiday' },
  // HOME RENOVATION
  { slate:'HR1',  category:'Home Renovation', actor_options:['Kemal','Andrey','Viktoria'], markets:'ES, EE, CZ', shot:'Comparing two light fixtures/bulbs' },
  { slate:'HR2',  category:'Home Renovation', actor_options:['Kemal','Andrey','Viktoria'], markets:'ES, EE, CZ', shot:'Tape measure pullout (toward lens)' },
  { slate:'HR3',  category:'Home Renovation', actor_options:['Kemal','Andrey','Viktoria'], markets:'ES, EE, CZ', shot:'Opening a toolbox (light reveal)' },
  { slate:'HR4',  category:'Home Renovation', actor_options:['Kemal','Andrey','Viktoria'], markets:'ES, EE, CZ', shot:'Examining a paint swatch/color card' },
  { slate:'HR5',  category:'Home Renovation', actor_options:['Kemal','Andrey','Viktoria'], markets:'ES, EE, CZ', shot:'Unboxing a home appliance' },
  { slate:'HR6',  category:'Home Renovation', actor_options:['Kemal','Andrey','Viktoria'], markets:'ES, EE, CZ', shot:'Standing back, admiring finished wall' },
  { slate:'HR7',  category:'Home Renovation', actor_options:['Kemal','Andrey','Viktoria'], markets:'ES, EE, CZ', shot:'Holding up renovation plans/blueprints' },
  // LIFESTYLE AND EVENTS
  { slate:'LE1',  category:'Lifestyle and Events', actor_options:['Andrey','Lauri','Viktoria','Kemal','Victoria'], markets:'EEA', shot:'Standing hero pose (Family stability)' },
  { slate:'LE2',  category:'Lifestyle and Events', actor_options:['Lauri','Viktoria','Kemal','Victoria'],           markets:'EEA', shot:'Actor blowing out a birthday candle' },
  { slate:'LE3',  category:'Lifestyle and Events', actor_options:['Andrey','Lauri','Viktoria'],                     markets:'EEA', shot:'Older actor (Retirement) sighing with joy' },
  { slate:'LE4',  category:'Lifestyle and Events', actor_options:['Lauri','Kemal','Victoria'],                      markets:'EEA', shot:'Opening a large ribboned gift box' },
  { slate:'LE5',  category:'Lifestyle and Events', actor_options:[],                                                markets:'EEA', shot:'Group celebration scene' },
  { slate:'LE6',  category:'Lifestyle and Events', actor_options:['Lauri','Viktoria','Kemal'],                      markets:'EEA', shot:'Couple/family moment on sofa' },
  { slate:'LE7',  category:'Lifestyle and Events', actor_options:['Andrey','Lauri','Kemal'],                        markets:'EEA', shot:'Graduation / milestone moment' },
  { slate:'LE8',  category:'Lifestyle and Events', actor_options:['Kemal','Victoria'],                              markets:'EEA', shot:'Wedding/engagement ring moment' },
  { slate:'LE9',  category:'Lifestyle and Events', actor_options:['Lauri','Victoria'],                              markets:'EEA', shot:'Relaxing holiday/staycation moment' },
  // ELECTRONICS AND DEVICES
  { slate:'EG1',  category:'Electronics and Devices', actor_options:['Lauri','Viktoria'],                   markets:'EEA, DK, EE, CZ, ES, PL', shot:'Hand sliding old laptop out; new sleek laptop sliding in' },
  { slate:'EG2',  category:'Electronics and Devices', actor_options:['Lauri','Victoria','Viktoria'],        markets:'EEA, DK, EE, CZ, ES, PL', shot:'Flipping cracked phone to reveal brand new one' },
  { slate:'EG3',  category:'Electronics and Devices', actor_options:['Lauri','Victoria','Viktoria'],        markets:'EEA, DK, EE, CZ, ES, PL', shot:'Sweeping away cables; reveals wireless headphones' },
  { slate:'EG4',  category:'Electronics and Devices', actor_options:['Lauri','Victoria','Viktoria'],        markets:'EEA, DK, EE, CZ, ES, PL', shot:'Trying to turn on old phone — not turning on' },
  // FINANCIAL RELIEF
  { slate:'FR1',  category:'Financial Relief', actor_options:['Andrey','Lauri','Viktoria'], markets:'EEA', shot:'Confident hero stance' },
  { slate:'FR2',  category:'Financial Relief', actor_options:['Andrey','Lauri','Viktoria'], markets:'EEA', shot:'Actor "stepping" into light' },
  { slate:'FR3',  category:'Financial Relief', actor_options:['Andrey','Lauri','Viktoria'], markets:'EEA', shot:'Holding a "New Item" (Box)' },
  { slate:'FR4',  category:'Financial Relief', actor_options:['Andrey','Lauri','Viktoria'], markets:'EEA', shot:'Sitting, looking at sky' },
  { slate:'FR5',  category:'Financial Relief', actor_options:['Andrey','Lauri','Viktoria'], markets:'EEA', shot:'Exhale of relief — weight lifted' },
  { slate:'FR6',  category:'Financial Relief', actor_options:['Andrey','Lauri','Viktoria'], markets:'EEA', shot:'Looking out window with calm expression' },
  { slate:'FR7',  category:'Financial Relief', actor_options:['Andrey','Lauri','Viktoria'], markets:'EEA', shot:'Counting/holding cash or card' },
  { slate:'FR8',  category:'Financial Relief', actor_options:['Andrey','Lauri','Viktoria'], markets:'EEA', shot:'Walking with confidence / freedom' },
  { slate:'FR9',  category:'Financial Relief', actor_options:['Andrey','Lauri','Viktoria'], markets:'EEA', shot:'Smiling at phone — good news received' },
];

// CAT_SLUG_MAP — used in buildClipEntry
const CAT_SLUG_MAP = {
  'Product Usage':'PU', 'Travel and Holiday':'TH', 'Home Renovation':'HR',
  'Lifestyle and Events':'LE', 'Electronics and Devices':'EG', 'Financial Relief':'FR',
  'Product_Usage':'PU', 'Travel_and_Holiday':'TH', 'Home_Renovation':'HR',
  'Lifestyle_and_Events':'LE', 'Electronics_and_Devices':'EG', 'Financial_Relief':'FR',
};
