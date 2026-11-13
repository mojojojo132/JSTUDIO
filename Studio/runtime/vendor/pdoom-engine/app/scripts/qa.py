"""Local engineering regression checks. Needs installed dependencies and explicit ffmpeg."""
import argparse, subprocess, pathlib, json, hashlib, time
ap=argparse.ArgumentParser();ap.add_argument('--ffmpeg',required=True);args=ap.parse_args()
app=pathlib.Path(__file__).resolve().parents[1];qa=app.parents[1]/'engine-qa';qa.mkdir(exist_ok=True)
bun=app/'node_modules/.bin/bun';ffmpeg=str(pathlib.Path(args.ffmpeg).resolve());results=[]
def run(name,options,success):
 command=[str(bun),str(app/'scripts/render.ts')]+options
 started=time.monotonic();p=subprocess.run(command,cwd=app,capture_output=True,text=True,timeout=100)
 (qa/(name+'.log')).write_text(p.stdout+p.stderr)
 passed=(p.returncode==0)==success
 results.append({'test':name,'passed':passed,'exit':p.returncode,'seconds':round(time.monotonic()-started,2)})
 if not passed: print(p.stdout+p.stderr);raise RuntimeError(name)
base=['video','--ffmpeg',ffmpeg,'--workers','1','--fps','24','--to','0.5']
for name in ['missing-scene','missing-asset','render-exception']:
 out=qa/(name+'.mp4');run(name,base+['--project',f'projects/qa-{name}.json','--out',str(out)],False)
 assert not out.exists() and not list(qa.glob(name+'.mp4.*.partial.mp4'))
run('unknown-shot',base+['--project','projects/engineering-test.json','--only','absent','--out',str(qa/'unknown.mp4')],False)
run('invalid-range',base+['--project','projects/engineering-test.json','--from','1','--out',str(qa/'range.mp4')],False)
run('ffmpeg-failure',['video','--project','projects/engineering-test.json','--ffmpeg','/usr/bin/false','--to','0.5','--out',str(qa/'ffmpeg-failure.mp4')],False)
assert not (qa/'ffmpeg-failure.mp4').exists()
for name,times in [('seek-forward','0,3,5.9'),('seek-reverse','5.9,3,0')]:
 run(name,['stills','--project','projects/engineering-test.json','--t',times,'--out',str(qa/name)],True)
for p in (qa/'seek-forward').glob('*.png'):
 assert hashlib.sha256(p.read_bytes()).digest()==hashlib.sha256((qa/'seek-reverse'/p.name).read_bytes()).digest(),p.name
results.append({'test':'forward/reverse seek PNG equality at 0,3,5.9 seconds','passed':True})
(qa/'regression-results.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))
