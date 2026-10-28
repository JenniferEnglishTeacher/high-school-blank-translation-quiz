import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'advanced-800-data.js');
const source = fs.readFileSync(dataPath, 'utf8');
const items = JSON.parse(source.slice(source.indexOf('['), source.lastIndexOf(']') + 1));

// Keep each vocabulary headword unchanged, but require the grammatically correct
// form in its sentence (verb tense/agreement or count-noun number).
const answers = {
  6:'activities',9:'adults',12:'advised',15:'aims',17:'airline',32:'barked',
  60:'bricks',77:'canceled',93:'charges',95:'chased',116:'commanded',
  121:'completed',126:'congratulations',129:'contact lenses',162:'damaged',
  169:'decorated',170:'decreased',174:'delivered',184:'dialed',193:'directed',
  194:'directions',195:'disappeared',196:'discovered',200:'divided',216:'dumplings',
  226:'elected',228:'embarrassed',230:'emphasized',233:'enemies',241:'errors',
  247:'excited',290:'frightened',295:'gathered',312:'greeted',335:'hopped',
  354:'includes',356:'inches',363:'insists',364:'inspired',366:'instruments',
  370:'introduced',371:'invented',394:'laid',397:'licked',399:'lifted',
  408:'locked',428:'measured',433:'meters',440:'mixed',464:'nodded',
  467:'nuts',471:'offered',499:'paused',527:'praised',536:'principles',
  540:'produces',550:'punished',561:'received',566:'refused',567:'regretted',
  569:'rejected',580:'robbed',584:'rubbed',587:'ruined',600:'searching',
  604:'seeking',605:'seems',606:'selected',614:'sheets',629:'skiing',
  630:'skills',636:'slices',647:'soft drinks',685:'supports',689:'sweeps',
  720:'tourists',731:'treated',734:'troops',737:'trusts',746:'underlined',
  760:'vegetables',764:'visitors',774:'waved',783:'wheels',784:'whispered',
  790:'wiped',792:'wishes',795:'workbooks',797:'worries',799:'wrapped'
};

const sentenceOverrides = {
  382: 'They ran a 5-__________ race.'
};

for (const item of items) {
  if (answers[item.id]) item.answer = answers[item.id];
  else delete item.answer;
  if (sentenceOverrides[item.id]) item.example = sentenceOverrides[item.id];
}

const output = `window.ADVANCED_800=${JSON.stringify(items)};\n`;
fs.writeFileSync(dataPath, output, 'utf8');
console.log(`Updated ${items.length} entries; ${Object.keys(answers).length} context forms corrected.`);
