import {createHash} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../public/evidence/',import.meta.url);await mkdir(root,{recursive:true});
const metadataUrl='https://api.worldbank.org/v2/indicator/SL.UEM.TOTL.ZS?format=json';
const seriesUrl='https://api.worldbank.org/v2/country/USA/indicator/SL.UEM.TOTL.ZS?format=json&date=2020:2023&per_page=100';
const result={capturedAt:new Date().toISOString(),profile:'worldbank-unemployment-usa-2020-2023-v1',metadataUrl,seriesUrl};
for(const [kind,url] of [['metadata',metadataUrl],['series',seriesUrl]]){
 const response=await fetch(url);if(!response.ok)throw Error(`Official ${kind}: HTTP${response.status}`);
 const raw=await response.text();JSON.parse(raw);
 result[`${kind}Sha256`]=createHash('sha256').update(raw).digest('hex');
 await writeFile(new URL(`worldbank-${kind}.json`,root),raw);
}
await writeFile(new URL('source-manifest.json',root),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
