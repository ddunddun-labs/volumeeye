import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('public');
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))throw Error();const body=await readFile(file);res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8','json':'application/json'})[file.split('.').pop()]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.end(body);}catch{res.writeHead(404);res.end('Not found');}}).listen(5173,'0.0.0.0',()=>console.log('VolumeEye: http://localhost:5173'));
