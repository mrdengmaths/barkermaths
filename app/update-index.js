const fs = require('fs');
const path = require('path');

const appRoot = __dirname;
const indexPath = path.join(appRoot, 'index.html');
const excludedDirs = new Set(['.git', 'node_modules']);

const appMeta = {
  'algebra-app': { icon: '🧮', description: 'Practice algebra with interactive questions.', keywords: 'algebra equations expressions variables simplify linear quadratic solving factor expand substitute evaluate polynomial constant coefficient' },
  'angle-mastery': { icon: '📏', description: 'Name angles and find complementary, supplementary and vertically opposite angles.', keywords: 'angle naming complementary supplementary vertically opposite angles year 7 angle relationships' },
  'angles-in-transversal': { icon: '📐', description: 'Explore and play with corresponding, alternate, co-interior and vertically opposite angles.', keywords: 'transversal parallel lines corresponding alternate co-interior allied vertically opposite angles year 7 geometry' },
  'calculus-cricket': { icon: '🏏', description: 'Explore calculus through a game.', keywords: 'calculus derivative integration limits area motion graph rate change antiderivative function curve' },
  'calculator': { icon: '🧮', description: 'Use an interactive fx-8200 AU II ClassWiz calculator simulator.', keywords: 'calculator fx-8200 AU II ClassWiz simulator arithmetic fractions decimals powers roots trigonometry statistics' },
  'collecting-like-terms': { icon: '➕', description: 'Simplify expressions by collecting like terms.', keywords: 'like terms simplify algebra expressions combine collect polynomial term expand contract' },
  'congruency-crunch': { icon: '🔺', description: 'Test triangle congruence with quick problems.', keywords: 'congruence triangles congruent sides angles sss sas asa aas rhs geometry proof' },
  'distance-vs-time-graph': { icon: '📈', description: 'Interpret motion graphs and speed.', keywords: 'distance time graph speed velocity acceleration gradient rate motion linear' },
  'divisibility-dash': { icon: '🔢', description: 'Race through divisibility rules.', keywords: 'divisibility factors multiples prime composite remainder divisible integer' },
  'equivalent-fraction-quest': { icon: '🍕', description: 'Explore equivalent fractions with visual models.', keywords: 'equivalent fractions simplify numerator denominator ratio proportion reduce' },
  'fraction-pizza-party': { icon: '🍕', description: 'Compare fraction slices in a fun party setting.', keywords: 'fractions pizza equivalent partition parts sharing numerator denominator portion' },
  'integration-practice': { icon: '∫', description: 'Practise integration with guided questions.', keywords: 'integration calculus antiderivative definite integral area region function' },
  'mixed-graphing-2': { icon: '📊', description: 'Plot and interpret mixed graphs.', keywords: 'graphing functions coordinates plot lines curves intercepts' },
  'mixed-numeral-conversion': { icon: '🔄', description: 'Convert between mixed numerals and improper fractions.', keywords: 'mixed numbers improper fraction convert decimal fraction ratio percent' },
  'parabola-sketcher': { icon: '📐', description: 'Sketch parabolas and explore transformations.', keywords: 'parabola sketch graph quadratic vertex axis curve functions graphing symmetry' },
  'set-notation-in-venn-diagram': { icon: '📚', description: 'Learn set notation visually with Venn diagrams.', keywords: 'set notation venn diagram union intersection complement subset elements logic' },
  'simplify-fractions': { icon: '✂️', description: 'Simplify fractions quickly and confidently.', keywords: 'simplify reduce fractions numerator denominator gcd lowest terms fraction' },
  'simplify-proper-fractions': { icon: '✂️', description: 'Simplify proper fractions with confidence.', keywords: 'proper fractions simplify reduce numerator denominator mixed number improper' },
  'soh-cah-toa-challenge': { icon: '📐', description: 'Solve right-triangle problems using trigonometry.', keywords: 'soh cah toa sine cosine tangent right triangle trigonometry ratio' },
  'thermal-directed-number-lab': { icon: '🌡️', description: 'Explore directed numbers with a temperature lab.', keywords: 'directed numbers positive negative integers temperature thermal opposites absolute value' },
  'transformation-explorer': { icon: '🔄', description: 'Explore transformations in geometry.', keywords: 'transformation functions translation rotation reflect scale curve graph mapping shift' },
  'trig-equation-builder': { icon: '📐', description: 'Build and solve trigonometric equations.', keywords: 'trig equations sine cosine tangent identities solve radians degrees periodic' },
  'trig-side-master': { icon: '📐', description: 'Master trigonometric side-length problems.', keywords: 'trig sides sine rule cosine rule triangle lengths opposite adjacent hypotenuse' }
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toTitle(name) {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function getAppInfo(relativePath) {
  const key = relativePath.toLowerCase().replace(/\\/g, '/').replace(/ /g, '-');
  const title = toTitle(path.basename(relativePath));
  const meta = appMeta[key];

  if (meta) return { title, ...meta };

  const fallbackIcons = ['🧠', '📐', '🎯', '📊', '✨', '🔢', '🧪', '📈'];
  const iconIndex = Array.from(relativePath).reduce((sum, character) => sum + character.charCodeAt(0), 0) % fallbackIcons.length;
  const description = `Interactive ${title.toLowerCase()} activity.`;
  return { title, icon: fallbackIcons[iconIndex], description, keywords: `${title.toLowerCase()} ${description.toLowerCase()}` };
}

function findAppDirectories(directory, relativePath = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory() || excludedDirs.has(entry.name) || entry.name.startsWith('.')) return [];

    const entryPath = path.join(directory, entry.name);
    const entryRelativePath = path.join(relativePath, entry.name);
    const descendants = findAppDirectories(entryPath, entryRelativePath);
    return fs.existsSync(path.join(entryPath, 'index.html')) ? [entryRelativePath, ...descendants] : descendants;
  });
}

if (!fs.existsSync(indexPath)) {
  console.error(`Homepage file not found at ${indexPath}`);
  process.exit(1);
}

const appDirectories = findAppDirectories(appRoot).sort((first, second) => first.localeCompare(second));
const items = appDirectories.map((relativePath) => {
  const app = getAppInfo(relativePath);
  const href = `./${relativePath.split(path.sep).map(encodeURIComponent).join('/')}/`;
  const appKey = encodeURIComponent(relativePath.replace(/\\/g, '/'));

  return `            <li class="app-item" data-app-name="${appKey}">
                <a href="${href}" class="app-link">
                    <div class="app-card-top">
                        <span class="app-icon" aria-hidden="true">${app.icon}</span>
                        <div class="app-text">
                            <span class="title">${escapeHtml(app.title)}</span>
                            <span class="app-description">${escapeHtml(app.description)}</span>
                            <div class="app-rating" aria-label="Rate ${escapeHtml(app.title)} from one to five stars">
                                <div class="stars"></div>
                                <span class="rating-text">No rating</span>
                            </div>
                            <span class="visually-hidden">${escapeHtml(app.keywords)}</span>
                        </div>
                    </div>
                    <span class="app-button">Open app</span>
                </a>
            </li>`;
}).join('\n');

const html = fs.readFileSync(indexPath, 'utf8');
const markerPattern = /<!-- APP_LIST_START -->[\s\S]*?<!-- APP_LIST_END -->/;
if (!markerPattern.test(html)) {
  console.error('App list markers were not found in index.html.');
  process.exit(1);
}

fs.writeFileSync(indexPath, html.replace(markerPattern, `<!-- APP_LIST_START -->\n${items}\n            <!-- APP_LIST_END -->`));
console.log(`Updated app index with ${appDirectories.length} apps.`);