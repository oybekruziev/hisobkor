import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,unlink,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import React from 'react';
import {renderToString} from 'react-dom/server';
const options={bundle:true,jsx:'automatic',minify:true,sourcemap:false,target:['es2022'],define:{'process.env.NODE_ENV':'"production"'}};
await build({...options,entryPoints:['src/main.tsx'],outfile:'public/app.js'});
await build({...options,entryPoints:['src/landing-entry.tsx'],outfile:'public/landing.js'});
for(const [input,output]of [['src/styles.css','public/style.css'],['src/landing.css','public/landing.css']])execFileSync(process.execPath,['node_modules/@tailwindcss/cli/dist/index.mjs','-i',input,'-o',output,'--minify'],{stdio:'inherit'});
// Self-hosted Geist (OFL-1.1) comes from the npm package; only the subsets the UI can need are published.
await mkdir('public/fonts',{recursive:true});
for(const subset of ['latin','latin-ext','cyrillic'])await copyFile(`node_modules/@fontsource-variable/geist/files/geist-${subset}-wght-normal.woff2`,`public/fonts/Geist-${subset}.woff2`);
await copyFile('node_modules/@fontsource-variable/geist/LICENSE','public/fonts/Geist-LICENSE.txt');
await unlink('public/app.js.map').catch(e=>{if(e.code!=='ENOENT')throw e});
const version=createHash('sha256').update(await readFile('public/app.js')).update(await readFile('public/style.css')).digest('hex').slice(0,12);
const html=(await readFile('public/index.html','utf8')).replace(/(app\.js|style\.css)(?:\?v=[a-z0-9]+)?/g,`$1?v=${version}`);
await writeFile('public/index.html',html);
// Pre-render the public page so its content and links also work before hydration.
await mkdir('node_modules/.cache/hisobkor',{recursive:true});
const renderPath=resolve('node_modules/.cache/hisobkor/landing.mjs');
await build({...options,entryPoints:['src/Landing.tsx'],outfile:renderPath,platform:'node',format:'esm',packages:'external'});
const {Landing,questions}=await import(pathToFileURL(renderPath).href);
const markup=renderToString(React.createElement(Landing));
const site='https://hisobkor.uz';
const pageTitle='Hisobkor.uz — hujjatlar tartibda, hisob nazoratda';
const pageDescription='Buxgalterlar uchun kompaniyalar, hujjatlar va tekshiruvlar bir ish joyida. Hisobkor bilan hujjatni toping, tekshiring va qaror tarixini saqlang.';
// JSON-LD is data, not executable script; "<" is escaped so content can never close the tag.
const jsonLd=data=>`<script type="application/ld+json">${JSON.stringify(data).replace(/</g,'\\u003c')}</script>`;
const structuredData=jsonLd({'@context':'https://schema.org','@graph':[
{'@type':'Organization','@id':`${site}/#organization`,name:'Hisobkor.uz',url:`${site}/`,logo:`${site}/brand-h.png`},
{'@type':'WebSite','@id':`${site}/#website`,url:`${site}/`,name:'Hisobkor.uz',description:pageDescription,inLanguage:'uz',publisher:{'@id':`${site}/#organization`}},
{'@type':'SoftwareApplication',name:'Hisobkor',url:'https://app.hisobkor.uz/',applicationCategory:'BusinessApplication',operatingSystem:'Web',description:pageDescription,inLanguage:'uz'},
{'@type':'FAQPage',mainEntity:questions.map(([name,text])=>({'@type':'Question',name,acceptedAnswer:{'@type':'Answer',text}}))}
]});
const social=`<meta property="og:type" content="website"><meta property="og:site_name" content="Hisobkor.uz"><meta property="og:locale" content="uz_UZ"><meta property="og:url" content="${site}/"><meta property="og:title" content="${pageTitle}"><meta property="og:description" content="${pageDescription}"><meta property="og:image" content="${site}/og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">`;
await writeFile('public/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site}/</loc></url></urlset>\n`);
const landingVersion=createHash('sha256').update(await readFile('public/landing.js')).update(await readFile('public/landing.css')).digest('hex').slice(0,12);
await writeFile('public/landing.html',`<!doctype html>
<html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#ffffff"><title>${pageTitle}</title><meta name="description" content="${pageDescription}"><link rel="canonical" href="https://hisobkor.uz/"><link rel="icon" href="/brand-h.png" type="image/png">${social}${structuredData}<link rel="stylesheet" href="/landing.css?v=${landingVersion}"><script defer src="/landing.js?v=${landingVersion}"></script></head><body><div id="landing-root">${markup}</div></body></html>`);
await unlink(renderPath);
console.log(`Hisobkor.uz production build: ${version}; landing: ${landingVersion}`);
