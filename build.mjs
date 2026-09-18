import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,unlink,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import React from 'react';
import {renderToString} from 'react-dom/server';
const options={bundle:true,jsx:'automatic',minify:true,sourcemap:false,target:['es2022'],define:{'process.env.NODE_ENV':'"production"'}};
await build({...options,entryPoints:['src/main.tsx'],outfile:'public/app.js'});
await build({...options,entryPoints:['src/landing-entry.tsx'],outfile:'public/landing.js'});
for(const [input,output]of [['src/styles.css','public/style.css'],['src/landing.css','public/landing.css']])execFileSync(process.execPath,['node_modules/@tailwindcss/cli/dist/index.mjs','-i',input,'-o',output,'--minify'],{stdio:'inherit'});
await unlink('public/app.js.map').catch(e=>{if(e.code!=='ENOENT')throw e});
const version=createHash('sha256').update(await readFile('public/app.js')).update(await readFile('public/style.css')).digest('hex').slice(0,12);
const html=(await readFile('public/index.html','utf8')).replace(/(app\.js|style\.css)(?:\?v=[a-z0-9]+)?/g,`$1?v=${version}`);
await writeFile('public/index.html',html);
// Pre-render the public page so its content and links also work before hydration.
await mkdir('node_modules/.cache/hisobkor',{recursive:true});
const renderPath=resolve('node_modules/.cache/hisobkor/landing.mjs');
await build({...options,entryPoints:['src/Landing.tsx'],outfile:renderPath,platform:'node',format:'esm',packages:'external'});
const {Landing}=await import(pathToFileURL(renderPath).href);
const markup=renderToString(React.createElement(Landing));
const landingVersion=createHash('sha256').update(await readFile('public/landing.js')).update(await readFile('public/landing.css')).digest('hex').slice(0,12);
await writeFile('public/landing.html',`<!doctype html>
<html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ffffff"><title>Hisobkor.uz — hujjatlar tartibda, hisob nazoratda</title><meta name="description" content="Buxgalterlar uchun kompaniyalar, hujjatlar va tekshiruvlar bir ish joyida. Hisobkor bilan hujjatni toping, tekshiring va qaror tarixini saqlang."><link rel="canonical" href="https://hisobkor.uz/"><link rel="icon" href="/brand-h.png"><link rel="stylesheet" href="/landing.css?v=${landingVersion}"><script defer src="/landing.js?v=${landingVersion}"></script></head><body><div id="landing-root">${markup}</div></body></html>`);
await unlink(renderPath);
console.log(`Hisobkor.uz production build: ${version}; landing: ${landingVersion}`);
