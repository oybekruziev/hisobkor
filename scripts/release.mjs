import {execFileSync} from 'node:child_process';
import {mkdir,stat} from 'node:fs/promises';
execFileSync('npm',['run','build'],{stdio:'inherit'});
execFileSync('npm',['test'],{stdio:'inherit'});
await mkdir('release',{recursive:true});
const files=['package.json','package-lock.json','build.mjs','server.mjs','server-config.mjs','server-storage.mjs','ai-service.mjs','src','tests','scripts','worker','migrations','docs','wrangler.jsonc','public/index.html','public/favicon.svg','public/app.js','public/style.css','public/landing.html','public/landing.css','public/.assetsignore','Dockerfile','.dockerignore','.env.example','README.md','DEPLOYMENT.md','RELEASE-CHECK.md'];
execFileSync('tar',['-czf','release/hisobkor-release.tar.gz',...files],{stdio:'inherit',env:{...process.env,COPYFILE_DISABLE:'1'}});
console.log(`Release tayyor: release/hisobkor-release.tar.gz (${Math.round((await stat('release/hisobkor-release.tar.gz')).size/1024)} KB)`);
