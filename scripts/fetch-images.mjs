/**
 * Fetches portrait images from Wikipedia for all category characters.
 * Usage: node scripts/fetch-images.mjs
 *
 * Skips bible-characters (needs artistic depictions, not photos).
 * Skips files that already exist.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import sharp from 'sharp';

const CATEGORIES_PATH = './shared/dist/categories.js';
const OUTPUT_BASE = './client/public/images/categories';
const SIZE = 400;
const SKIP_CATEGORIES = ['bible_characters'];

// Some names don't match their Wikipedia article title exactly.
// Add overrides here as needed: character name -> Wikipedia article title
const WIKI_OVERRIDES = {
  // Digital Creators
  'KSI': 'KSI_(entertainer)',
  'Miniminter': 'Miniminter',
  'Vikkstar123': 'Vikkstar123',
  'W2S': 'W2S',
  'Niko Omilana': 'Niko_Omilana',
  'Chunkz': 'Chunkz',
  'Yung Filly': 'Yung_Filly',
  'GK Barry': 'GK_Barry',
  'Madame Joyce': 'Madame_Joyce',
  'MrBeast': 'MrBeast',
  'PewDiePie': 'PewDiePie',
  'Emma Chamberlain': 'Emma_Chamberlain',
  'James Charles': 'James_Charles_(internet_personality)',
  'Jeffree Star': 'Jeffree_Star',
  'Addison Rae': 'Addison_Rae',
  "Charli D'Amelio": "Charli_D'Amelio",
  'Khaby Lame': 'Khaby_Lame',
  'Zach King': 'Zach_King',
  'JoJo Siwa': 'JoJo_Siwa',
  'Marques Brownlee': 'Marques_Brownlee',
  'Mercy Eke': 'Mercy_Eke',
  'Nengi Hampson': 'Nengi_Hampson',
  'Laycon': 'Laycon',
  'Whitemoney': 'Whitemoney',
  'Neo Akpofure': 'Neo_Akpofure',
  'Uti Nwachukwu': 'Uti_Nwachukwu',
  'Tacha Akide': 'Tacha_Akide',
  'Kiddwaya': 'Kiddwaya',
  'Cee-C': 'Cee-C',
  'Ebuka Obi-Uchendu': 'Ebuka_Obi-Uchendu',
  'Ekin-Su Culculoglu': 'Ekin-Su_Cülcüloğlu',
  'Indiyah Polack': 'Indiyah_Polack',
  'Dami Hope': 'Dami_Hope',
  'Sam Thompson': 'Sam_Thompson_(television_personality)',
  'Amber Gill': 'Amber_Gill',
  'Maura Higgins': 'Maura_Higgins',
  'Joey Essex': 'Joey_Essex',
  'Justine Ndiba': 'Justine_Ndiba',
  'Francesca Farago': 'Francesca_Farago',
  'Chloe Veitch': 'Chloe_Veitch',
  'Harry Jowsey': 'Harry_Jowsey',
  // Music
  'The Weeknd': 'The_Weeknd',
  'Lil Nas X': 'Lil_Nas_X',
  'Bad Bunny': 'Bad_Bunny',
  'Megan Thee Stallion': 'Megan_Thee_Stallion',
  'Ice Spice': 'Ice_Spice',
  'Lil Baby': 'Lil_Baby',
  'Young Thug': 'Young_Thug',
  'Metro Boomin': 'Metro_Boomin',
  'Playboi Carti': 'Playboi_Carti',
  'Central Cee': 'Central_Cee',
  'Burna Boy': 'Burna_Boy',
  'Tyler, the Creator': 'Tyler,_the_Creator',
  'J. Cole': 'J._Cole',
  '21 Savage': '21_Savage',
  'Roddy Ricch': 'Roddy_Ricch',
  'Post Malone': 'Post_Malone',
  'Doja Cat': 'Doja_Cat',
  'Cardi B': 'Cardi_B',
  'Ayra Starr': 'Ayra_Starr',
  'Chris Brown': 'Chris_Brown',
  'Dave': 'Dave_(rapper)',
  'SZA': 'SZA',
  'Ed Sheeran': 'Ed_Sheeran',
  'Sam Smith': 'Sam_Smith_(singer)',
  'Bruno Mars': 'Bruno_Mars',
  // Actors
  'Robert Downey Jr.': 'Robert_Downey_Jr.',
  "Lupita Nyong'o": "Lupita_Nyong'o",
  'Timothée Chalamet': 'Timothée_Chalamet',
  'Anya Taylor-Joy': 'Anya_Taylor-Joy',
  'Regé-Jean Page': 'Regé-Jean_Page',
  'Michael B. Jordan': 'Michael_B._Jordan',
  'Ana de Armas': 'Ana_de_Armas',
  // Athletes
  "Sha'Carri Richardson": "Sha'Carri_Richardson",
  "Shaquille O'Neal": "Shaquille_O'Neal",
  'Kylian Mbappé': 'Kylian_Mbappé',
  'Zlatan Ibrahimović': 'Zlatan_Ibrahimović',
  'Giannis Antetokounmpo': 'Giannis_Antetokounmpo',
  'Floyd Mayweather Jr.': 'Floyd_Mayweather_Jr.',
  'Conor McGregor': 'Conor_McGregor',
  'Sydney McLaughlin': 'Sydney_McLaughlin-Levrone',
  'Mo Farah': 'Mo_Farah',
  'Oscar Pistorius': 'Oscar_Pistorius',
  'Didier Drogba': 'Didier_Drogba',
  // Famous Faces
  'Alexandria Ocasio-Cortez': 'Alexandria_Ocasio-Cortez',
  'Neil deGrasse Tyson': 'Neil_deGrasse_Tyson',
  'Queen Elizabeth II': 'Elizabeth_II',
  'Ruth Bader Ginsburg': 'Ruth_Bader_Ginsburg',
  'Jay-Z': 'Jay-Z',
  'Kim Jong Un': 'Kim_Jong_Un',
  'Vladimir Putin': 'Vladimir_Putin',
  'Joe Biden': 'Joe_Biden',
  'Kamala Harris': 'Kamala_Harris',
  'Rishi Sunak': 'Rishi_Sunak',
  'Boris Johnson': 'Boris_Johnson',
  'Andrew Tate': 'Andrew_Tate',
  'Jordan Peterson': 'Jordan_Peterson',
  'David Attenborough': 'David_Attenborough',
  'Snoop Dogg': 'Snoop_Dogg',
  'Ellen DeGeneres': 'Ellen_DeGeneres',
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'GuessWhoImageFetcher/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function getWikiImageUrl(articleTitle) {
  // Use Wikipedia API to get the main image (pageimage) for an article
  const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`;
  const data = await fetchUrl(apiUrl);
  const json = JSON.parse(data.toString());

  // Use thumbnail URL resized to 500px — less likely to be rate-limited than originals
  if (json.thumbnail?.source) {
    return json.thumbnail.source.replace(/\/\d+px-/, '/500px-');
  }
  if (json.originalimage?.source) return json.originalimage.source;
  return null;
}

async function processImage(buffer, outputPath) {
  await sharp(buffer)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const { categoryRosters } = await import('file:///' + path.resolve(CATEGORIES_PATH).replace(/\\/g, '/'));

  const results = { success: 0, skipped: 0, failed: [] };

  for (const roster of categoryRosters) {
    if (SKIP_CATEGORIES.includes(roster.id)) {
      console.log(`\n⏭ Skipping ${roster.label} (needs artistic depictions)`);
      results.skipped += roster.characters.length;
      continue;
    }

    console.log(`\n📁 ${roster.label}`);
    const folder = roster.characters[0].imageUrl.split('/')[3];
    const outDir = path.join(OUTPUT_BASE, folder);

    for (const char of roster.characters) {
      const filename = char.imageUrl.split('/').pop();
      const outPath = path.join(outDir, filename);

      // Skip if already exists
      if (fs.existsSync(outPath)) {
        console.log(`  ✓ ${char.name} (exists)`);
        results.success++;
        continue;
      }

      const wikiTitle = WIKI_OVERRIDES[char.name] || char.name.replace(/ /g, '_');

      try {
        const imageUrl = await getWikiImageUrl(wikiTitle);
        if (!imageUrl) {
          console.log(`  ✗ ${char.name} — no image found on Wikipedia`);
          results.failed.push({ name: char.name, filename, reason: 'no image' });
          continue;
        }

        const imageBuffer = await fetchUrl(imageUrl);
        await processImage(imageBuffer, outPath);
        console.log(`  ✓ ${char.name}`);
        results.success++;
      } catch (err) {
        console.log(`  ✗ ${char.name} — ${err.message}`);
        results.failed.push({ name: char.name, filename, reason: err.message });
      }

      // Delay to avoid Wikimedia rate limits
      await sleep(5000);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Success: ${results.success}`);
  console.log(`Skipped: ${results.skipped} (bible characters)`);
  console.log(`Failed: ${results.failed.length}`);
  if (results.failed.length > 0) {
    console.log('\nFailed images:');
    for (const f of results.failed) {
      console.log(`  ${f.name} (${f.filename}) — ${f.reason}`);
    }
  }
}

main().catch(console.error);
