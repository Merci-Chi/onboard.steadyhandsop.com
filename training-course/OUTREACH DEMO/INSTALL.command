#!/bin/bash
# Install new walkthrough over EXISTING local demo files. Nothing uploaded.
set -e
cd "$(dirname "$0")"
ROOT="${1:-}"
if [ -z "$ROOT" ]; then
  if [ -f index.html ] && [ -f call.html ]; then ROOT="$PWD";
  elif [ -f ../index.html ] && [ -f ../call.html ]; then ROOT="$(cd .. && pwd)";
  elif [ -d "$HOME/Desktop/demo.steadyhandsop.com" ]; then ROOT="$HOME/Desktop/demo.steadyhandsop.com";
  else echo "Drag the local demo folder onto this script, or run: bash INSTALL.command /path/to/demo.steadyhandsop.com"; read -r -p 'Press Enter to exit...';exit 1;fi
fi
python3 - "$PWD" "$ROOT" <<'PY'
import sys,pathlib,shutil,re
patch=pathlib.Path(sys.argv[1]);root=pathlib.Path(sys.argv[2])
if not (root/'index.html').exists() or not (root/'call.html').exists(): raise SystemExit('ERROR: Folder needs index.html and call.html: '+str(root))
for name in ('walkthrough.js','walkthrough.css'): shutil.copyfile(patch/name,root/name)
for file in ('index.html','call.html','sales.html'):
 p=root/file
 if not p.exists(): continue
 s=p.read_text(encoding='utf-8')
 if file=='sales.html':
  # Sales had a live Supabase SDK; force the pre-existing offline demo runtime for training.
  s=re.sub(r'<script[^>]*src="https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js[^"]*"[^>]*></script>', '<script src="demo-data.js"></script><script src="demo-supabase.js"></script>',s)
 # Avoid duplicate tags on repeat install
 s=re.sub(r'\s*<link[^>]*href="walkthrough\.css[^>]*>','',s)
 s=re.sub(r'\s*<script[^>]*src="walkthrough\.js[^>]*></script>','',s)
 # Use the existing offline demo account, not the real authentication redirect.
 guard='<script>if(new URLSearchParams(location.search).get("training")==="first-call"||sessionStorage.getItem("sh-demo-walkthrough-20261013")){window.SteadyHandsDemo=Object.assign({},window.SteadyHandsDemo,{enabled:true})}</script>'
 s=s.replace(guard,'')
 s=s.replace('</head>','<link rel="stylesheet" href="walkthrough.css?v=20261013" />\n</head>',1)
 # Early script must run before auth-guard.js.
 s=re.sub(r'(<script[^>]*src="auth-guard\.js[^>]*></script>)',guard+r'\n\1',s,count=1)
 s=s.replace('</body>','<script src="walkthrough.js?v=20261013" defer></script>\n</body>',1)
 p.write_text(s,encoding='utf-8')
 print('Updated:',p.name)
for f in ('training.html','training.css','training.js'):
 if (root/f).exists(): (root/f).unlink();print('Deleted old standalone:',f)
print('\nInstalled locally. Open index.html?training=first-call using a local web server.')
PY
