import json, pathlib, subprocess, tempfile, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(200);self.send_header('Content-Type','application/json' if self.path=='/json' else 'text/html');self.end_headers()
  if self.path=='/json': self.wfile.write(json.dumps(tabs).encode())
  else:self.wfile.write(b'<html>Studio</html>')
 def log_message(self,*a):pass
servers=[]
try:
 for _ in range(2):
  s=HTTPServer(('127.0.0.1',0),Handler);servers.append(s);threading.Thread(target=s.serve_forever,daemon=True).start()
 preview_url=f'http://127.0.0.1:{servers[0].server_port}/#project/test'
 tabs=[{'type':'page','id':'one','title':'Studio','url':preview_url}]
 with tempfile.TemporaryDirectory() as d:
  p=pathlib.Path(d);session=p/'browser.json';receipt=p/'receipt.json'
  session.write_text(json.dumps({'status':'ready','port':servers[1].server_port}))
  cmd=['node',str(pathlib.Path(__file__).resolve().parents[1] / 'preview-handoff.mjs')]
  first=subprocess.run(cmd+['record',d,preview_url,str(receipt),'timed preview pending',str(session)],capture_output=True,text=True)
  print(first.returncode,first.stdout,first.stderr)
  assert first.returncode==0
  state=json.loads(receipt.read_text());assert state['previewHealth']['ok'] and state['tab']['status']=='one matching tab'
  second=subprocess.run(cmd+['check',str(receipt)],capture_output=True,text=True)
  print(second.returncode,second.stdout,second.stderr)
  assert second.returncode==0 and json.loads(receipt.read_text())['checkpoint']=='timed preview pending'
  bad=subprocess.run(cmd+['record',d,'http://127.0.0.1:1/',str(p/'bad.json'),'review'],capture_output=True,text=True)
  assert bad.returncode==2 and not json.loads((p/'bad.json').read_text())['previewHealth']['ok']
  tabs=[{'type':'page','id':'other','url':preview_url.replace('/test','/other')}, {'type':'page','id':'bad','url':'not a URL'}]
  third=subprocess.run(cmd+['check',str(receipt)],capture_output=True,text=True)
  assert third.returncode==0 and json.loads(receipt.read_text())['tab']['status']=='no matching tab'
  tabs.extend([{'type':'page','id':'one','url':preview_url},{'type':'page','id':'two','url':preview_url}])
  fourth=subprocess.run(cmd+['check',str(receipt)],capture_output=True,text=True)
  assert fourth.returncode==0 and json.loads(receipt.read_text())['tab']['status']=='duplicate matching tabs'
  print('preview handoff 5 cases passed')
finally:
 for s in servers:s.shutdown()
