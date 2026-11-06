import ast
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import types

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ['AEGIS_SMOKE_OUT'])
ADAPTER_SHA = '0ee4a6b0c5cdbfff8c3bd7fbc18cce22120e85396fbaee800b02689a94466b0a'
MONITOR_SHA = '05f07176a530f54605388fc59b914d2c06c63e433492669a9c056c271236e2f8'
SIGNAL_SHA = '973a4eaf96daf5aaa9c04ca4bd2091563a1ee68b6fa0ce505d83105e03c168b8'
BOOTSTRAP = '''import json,os,signal,subprocess,sys,time
mode,node=sys.argv[1:]
signal.signal(signal.SIGTERM,signal.SIG_IGN)
child=None
def emergency(sig,frame):
 print(json.dumps({'event':'EMERGENCY_SELF_DEADLINE','pid':os.getpid()}),flush=True)
 if child is not None:
  try: child.kill();child.wait(timeout=2)
  except Exception: pass
 os._exit(99)
signal.signal(signal.SIGALRM,emergency);signal.alarm(25)
if mode=='node':
 def drop():
  os.setgroups([]);os.setresgid(1001,1001,1001);os.setresuid(1001,1001,1001)
 child=subprocess.Popen([node,'-e',"process.on('SIGTERM',()=>{});console.log(JSON.stringify({event:'node-ready',pid:process.pid,uid:process.getuid()}));setInterval(()=>{},1000)"],preexec_fn=drop,env={'PATH':'/usr/bin:/bin'})
print(json.dumps({'event':'root-bootstrap','pid':os.getpid(),'uid':os.getuid()}),flush=True)
while True: time.sleep(1)
'''

def save(path, value):
    path.write_text(json.dumps(value, indent=2)+'\n')

def bound(path, expected):
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != expected:
        raise RuntimeError('source hash mismatch: '+str(path))
    module = types.ModuleType(path.stem.replace('-','_'))
    module.__file__ = str(path)
    exec(compile(data,str(path),'exec',dont_inherit=True),module.__dict__)
    return module, data

def fixture_monitor(data, seconds):
    text = data.decode()
    replacements = {'available() < 6 * 1024 * 1024':'available() < 640 * 1024', 'rss > 4 * 1024 * 1024':'rss > 512 * 1024', 'available() < 2 * 1024 * 1024':'available() < 128 * 1024', 'time.monotonic() - start > 600':'time.monotonic() - start > '+str(seconds)}
    for old,new in replacements.items():
        if text.count(old)!=1: raise RuntimeError('fixture substitution mismatch')
        text=text.replace(old,new)
    module=types.ModuleType('fixture_monitor')
    module.__file__=str(ROOT/'tools/ci/sealed-c-sdk-native.py')
    exec(compile(text,module.__file__,'exec',dont_inherit=True),module.__dict__)
    return module

def monitor_case(mode, foreign, node):
    out=OUT/mode;out.mkdir()
    A,_=bound(ROOT/'tools/ci/sealed-c-owned-cleanup.py',ADAPTER_SHA)
    _,data=bound(ROOT/'tools/ci/sealed-c-sdk-native.py',MONITOR_SHA)
    segment=next(n for n in ast.parse(data).body if isinstance(n,ast.FunctionDef) and n.name=='signal_identity')
    if hashlib.sha256(ast.get_source_segment(data.decode(),segment).encode()).hexdigest()!=SIGNAL_SHA: raise RuntimeError('signal binding')
    M=fixture_monitor(data,0.5)
    M.OUT=out;M.ENV={'PATH':os.environ['PATH']}
    callback=A.sudo_callback(ROOT/'tools/ci/sealed-c-owned-cleanup.py',ADAPTER_SHA)
    A.install(M,callback)
    negative_results=[]
    real_popen=subprocess.Popen
    def launch(*args,**kwargs):
        child=real_popen(*args,**kwargs)
        if BOOTSTRAP not in args[0]: return child
        deadline=time.monotonic()+3
        bootstrap=None
        while time.monotonic()<deadline:
            for line in (out/'timeout.log').read_text().splitlines():
                try: event=json.loads(line)
                except ValueError: continue
                if event.get('event')=='root-bootstrap': bootstrap=event['pid']
            if bootstrap: break
            if child.poll() is not None: raise RuntimeError('root bootstrap exited before initialization')
            time.sleep(0.02)
        if bootstrap is None: raise RuntimeError('root bootstrap init missing')
        base=dict(monitorPID=os.getpid(),monitorTicks=A.row(os.getpid())[1],namespace=A.namespace(os.getpid()),pid=bootstrap,startTicks=A.row(bootstrap)[1],signal=15)
        negatives=[dict(base,namespace='pid:[bad]'),dict(base,startTicks='0'),dict(base,pid=foreign,startTicks=A.row(foreign)[1]),dict(base,pid=os.getpid(),startTicks=A.row(os.getpid())[1]),dict(base,signal=10)]
        for req in negatives:
            try: callback(req)
            except PermissionError as error: negative_results.append(dict(request=req,rejected=True,error=str(error)))
            else: raise RuntimeError('negative request accepted')
        save(out/'negatives.json',negative_results)
        return child
    subprocess.Popen=launch
    primary=None
    try:
        M.run('timeout',['/usr/bin/sudo','-n','/usr/bin/python3','-I','-B','-c',BOOTSTRAP,mode,node],cwd=out)
    except BaseException as error:
        primary=repr(error)
    finally:
        subprocess.Popen=real_popen
        save(out/'final.json',dict(primary=primary,receiptExists=(out/'timeout-exit.json').exists(),directChildren=M.direct_children(),uid=os.getuid(),adapterSHA=ADAPTER_SHA,monitorSHA=MONITOR_SHA,bootstrapSHA=hashlib.sha256(BOOTSTRAP.encode()).hexdigest()))
    if not (out/'timeout-exit.json').exists(): raise RuntimeError('missing receipt; primary='+str(primary))
    receipt=json.loads((out/'timeout-exit.json').read_text())
    log=(out/'timeout.log').read_text()
    if not (primary and receipt['guard'] and receipt['exit']!=0 and receipt['ownedChildrenAbsent'] and receipt['cleanupElapsedSeconds']<10 and len(negative_results)==5): raise RuntimeError('timeout cleanup oracle rejected')
    if 'EMERGENCY_SELF_DEADLINE' in log: raise RuntimeError('emergency cleanup is not success')
    if mode=='node' and 'node-ready' not in log: raise RuntimeError('node readiness missing')
    for pid,ticks in receipt['observedPidStarttimes'].items():
        try:
            if A.row(int(pid))[1]==ticks: raise RuntimeError('observed identity survives')
        except FileNotFoundError: pass
    if A.row(foreign)[2]=='Z': raise RuntimeError('foreign died')

def main():
    if os.getuid()!=1001 or os.geteuid()!=1001: raise RuntimeError('actual UID1001 runner required')
    if os.environ.get('GITHUB_REPOSITORY')!='0xNoramiya/aegis-digimon-tcg' or os.environ.get('GITHUB_REF')!='refs/heads/ci/sealed-c-root-cleanup-smoke': raise RuntimeError('fork/exact branch gate')
    import shutil
    node=shutil.which('node')
    if not node: raise RuntimeError('node missing')
    A,_=bound(ROOT/'tools/ci/sealed-c-owned-cleanup.py',ADAPTER_SHA)
    _,data=bound(ROOT/'tools/ci/sealed-c-sdk-native.py',MONITOR_SHA)
    outcomes=[]
    for mode in ['copy-pause','node']:
        foreign=subprocess.Popen(['/usr/bin/sudo','-n','/usr/bin/python3','-I','-B','-c','import os,time; print(os.getpid(),flush=True); time.sleep(30)'],stdout=subprocess.PIPE,text=True)
        if foreign.stdout is None: raise RuntimeError("foreign stdout missing")
        foreign_pid=int(foreign.stdout.readline())
        foreign_ticks=A.row(foreign_pid)[1]
        pid=os.fork()
        if pid==0:
            fd=os.open(OUT/(mode+'-monitor.log'),os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600);os.dup2(fd,1);os.dup2(fd,2);os.close(fd)
            try: monitor_case(mode,foreign_pid,node)
            except BaseException:
                import traceback
                traceback.print_exc();os._exit(1)
            os._exit(0)
        _,status=os.waitpid(pid,0)
        alive=A.row(foreign_pid)[1]==foreign_ticks and foreign.poll() is None
        foreign_exit=foreign.wait(timeout=40)
        outcomes.append(dict(mode=mode,monitorWaitStatus=status,foreignSurvived=alive,foreignNaturalExit=foreign_exit))
        save(OUT/'results.json',dict(cases=outcomes,applicationCIAllowed=False,acceptance=False))
        if status or not alive or foreign_exit: raise RuntimeError('actual sudo timeout case failed: '+mode)
    fixture=fixture_monitor(data,60)
    fixture.OUT=OUT;fixture.ENV=dict(os.environ)
    fixture.run('node-toolchain',[node,'-e',"const fs=require('node:fs');fs.writeFileSync('fixture.mjs','export default 42');import('./fixture.mjs').then(m=>{if(m.default!==42)process.exit(1);console.log('NODE_TOOLCHAIN_OK')})"],cwd=OUT)
    receipt=json.loads((OUT/'node-toolchain-exit.json').read_text())
    if receipt['exit']!=0 or receipt['guard'] or not receipt['ownedChildrenAbsent']: raise RuntimeError('60-second fixture profile rejected')
    save(OUT/'results.json',dict(status='ACTUAL_GHA_SUDO_SMOKE_PASS',cases=outcomes,negativeRequestsRejected=10,fixtureProfile=dict(rssMiB=512,reserveMiB=128,seconds=60),timeoutFixtureSeconds=0.5,productionProfileUnchanged=True,applicationCIAllowed=False,acceptance=False,adapterSHA=ADAPTER_SHA,monitorSHA=MONITOR_SHA))

if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    try: main()
    except BaseException as error:
        save(OUT/'primary-failure.json',dict(error=repr(error),applicationCIAllowed=False,acceptance=False))
        raise
