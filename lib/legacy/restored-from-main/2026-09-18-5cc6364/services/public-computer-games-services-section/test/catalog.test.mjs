import test from 'node:test';
import assert from 'node:assert/strict';
import {gameBrowserUrl,gamePlayAvailability,gamesWithAnyKeyword,gameStorefront,GLYPHS} from '../src/catalog.mjs';
const entry={id:'solitaire',displayName:'Solitaire',description:'Technical specification',subdomain:'solitaire',status:'playable',shelf:'Cards',keywords:['cards'],entryPoints:{browser:'/web/table.html',headless:'node play.mjs'}};
test('a playable manifest and an explicitly live browser binding are both necessary for a play action',()=>{
 assert.equal(gamePlayAvailability(entry).kind,'unavailable');
 assert.deepEqual(gamePlayAvailability(entry,new Set(['solitaire'])),{kind:'browser',href:'https://solitaire.561.group/web/table.html'});
 assert.equal(gamePlayAvailability({...entry,status:'draft'},new Set(['solitaire'])).kind,'unavailable');
 assert.equal(gamePlayAvailability({...entry,entryPoints:{headless:'node play.mjs'}},new Set(['solitaire'])).kind,'unavailable');
 for(const subdomain of ['evil.test/path','bad name','javascript:evil'])assert.throws(()=>gameBrowserUrl({...entry,subdomain}),/Invalid/);
 for(const browser of ['javascript:alert(1)','/evil\\path','/bad path'])assert.throws(()=>gameBrowserUrl({...entry,entryPoints:{browser}}),/Invalid/);
});
test('catalog projections retain authored graphics and technical facts while presenting customer summaries',()=>{
 const before=JSON.stringify(entry);const catalog=gameStorefront([entry],{liveSubdomains:new Set(['solitaire'])});
 assert.equal(catalog.items[0].title,'Solitaire');assert.notEqual(catalog.items[0].summary,entry.description);
 assert.ok(catalog.items[0].detail.length);assert.ok(GLYPHS.solitaire);assert.equal(catalog.items[0].actions[0].kind,'link');
 assert.equal(catalog.items[0].facts[0].detailOnly,true);assert.equal(JSON.stringify(entry),before);
 assert.deepEqual(gamesWithAnyKeyword([entry],['cards']),[entry]);assert.deepEqual(gamesWithAnyKeyword([entry],['mud']),[]);
});
