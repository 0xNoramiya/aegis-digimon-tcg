"""CI-only owned-descendant signal extension. Requires independent review.
Root entry executes validation and pidfd signaling only, never application code.
Diagnostic transport is not the production sudo caller-chain attestation.
"""
import ast
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys

MONITOR_SHA = '05f07176a530f54605388fc59b914d2c06c63e433492669a9c056c271236e2f8'
ORIGINAL_SIGNAL_SHA = '973a4eaf96daf5aaa9c04ca4bd2091563a1ee68b6fa0ce505d83105e03c168b8'


def row(pid):
    fields = Path('/proc/%d/stat' % pid).read_text().rsplit(')', 1)[1].split()
    status = Path('/proc/%d/status' % pid).read_text().splitlines()
    uid = tuple(map(int, next(x for x in status if x.startswith('Uid:')).split()[1:]))
    return (int(fields[1]), fields[19], fields[0], uid)


def namespace(pid):
    return os.readlink('/proc/%d/ns/pid' % pid)


def validate_and_signal(request, diagnostic_controller=None):
    """Root-only; diagnostic override must never be exposed by command-line API."""
    if os.geteuid() != 0:
        raise PermissionError('root helper required')
    if set(request) != {'monitorPID', 'monitorTicks', 'namespace', 'pid', 'startTicks', 'signal'}:
        raise ValueError('exact request schema required')
    m, p, sig = request['monitorPID'], request['pid'], request['signal']
    if any(type(x) is not int or x <= 0 for x in (m, p, sig)) or sig not in (15, 9):
        raise ValueError('only positive identities and TERM/KILL accepted')
    for key in ('monitorTicks', 'startTicks'):
        if type(request[key]) is not str or not request[key].isdigit():
            raise ValueError('decimal startTicks required')
    monitor = row(m)
    if monitor[1] != request['monitorTicks'] or any(u == 0 for u in monitor[3]):
        raise PermissionError('normal monitor identity required')
    if request['namespace'] != namespace(m) or namespace(os.getpid()) != namespace(m):
        raise PermissionError('namespace token mismatch')
    parent = os.getppid()
    parent_row = row(parent)
    if diagnostic_controller is None:
        if parent_row[0] != m:
            raise PermissionError('helper parent must be immediate monitor child')
        if os.path.realpath('/proc/%d/exe' % parent) != '/usr/bin/sudo':
            raise PermissionError('helper -> sudo -> monitor required')
        if os.environ.get('SUDO_UID') != str(monitor[3][0]):
            raise PermissionError('sudo caller UID mismatch')
    elif (parent, parent_row[1]) != diagnostic_controller:
        raise PermissionError('diagnostic controller identity mismatch')
    # Exclude helper, monitor and ALL monitor ancestors explicitly.
    # A sudo/bootstrap transport is itself an OWNED descendant, not exempt.
    forbidden = {os.getpid()}
    cur = m
    while cur > 0 and cur not in forbidden:
        forbidden.add(cur)
        cur = row(cur)[0]
    if p in forbidden:
        raise PermissionError('monitor/ancestor/helper/transport target forbidden')
    fd = os.pidfd_open(p)
    pins = []
    try:
        target = row(p)
        if target[1] != request['startTicks']:
            raise PermissionError('stale PID/startTicks')
        if target[3] != (0, 0, 0, 0):
            raise PermissionError('root-owned target required')
        # Pin each live ancestry link; recheck every link before delivery.
        cur = p
        seen = set()
        while cur != m:
            if cur in seen or cur <= 1:
                raise PermissionError('not an owned monitor descendant')
            seen.add(cur)
            ident = row(cur)
            pin = os.pidfd_open(cur)
            pins.append((cur, ident, pin))
            cur = ident[0]
        current_monitor = row(m)
        if current_monitor[:2] != monitor[:2] or current_monitor[3] != monitor[3]:
            raise PermissionError('monitor identity changed')
        for pid, ident, pin in pins:
            current = row(pid)
            if current[:2] != ident[:2] or current[3] != ident[3]:
                raise PermissionError('ancestry changed during validation')
            signal.pidfd_send_signal(pin, 0)
        if row(p)[1] != request['startTicks']:
            raise PermissionError('target identity changed')
        signal.pidfd_send_signal(fd, sig)
        return True
    finally:
        for _, _, pin in pins:
            os.close(pin)
        os.close(fd)


def install(monitor, callback):
    """Preserve original guards; privilege callback ONLY on original EPERM.
    Caller must already have hash-verified the adapter bytes before execution.
    No run/terminate/ownership function is changed.
    """
    source = Path(monitor.__file__).read_bytes()
    if hashlib.sha256(source).hexdigest() != MONITOR_SHA:
        raise RuntimeError('original monitor bytes rejected')
    text = source.decode()
    node = next(n for n in ast.parse(text).body if isinstance(n, ast.FunctionDef) and n.name == 'signal_identity')
    if hashlib.sha256(ast.get_source_segment(text, node).encode()).hexdigest() != ORIGINAL_SIGNAL_SHA:
        raise RuntimeError('original signal function rejected')
    original = monitor.signal_identity
    import types
    compiled = compile(source, monitor.__file__, 'exec')
    expected = next(c for c in compiled.co_consts if isinstance(c, types.CodeType) and c.co_name == 'signal_identity')
    if original.__code__ != expected:
        raise RuntimeError('unexpected signal implementation')
    monitor_pid = os.getpid()
    monitor_ticks = row(monitor_pid)[1]
    token = namespace(monitor_pid)
    def adapted(pid, ticks, sig):
        try:
            return original(pid, ticks, sig)
        except PermissionError:
            return callback(dict(monitorPID=monitor_pid, monitorTicks=monitor_ticks,
                                 namespace=token, pid=pid, startTicks=ticks, signal=int(sig)))
    monitor.signal_identity = adapted
    return original


def sudo_callback(helper_path, helper_sha):
    """Hash-check exact source bytes in isolated root Python, not pyc import."""
    loader = "import hashlib,sys; p=sys.argv[1]; b=open(p,'rb').read(); assert hashlib.sha256(b).hexdigest()==sys.argv[2]; exec(compile(b,p,'exec'),{'__name__':'__main__','__file__':p})"
    def call(request):
        result = subprocess.run(['/usr/bin/sudo', '-n', '/usr/bin/python3', '-I', '-B', '-c', loader,
                                 str(helper_path), helper_sha, '--signal'],
                                input=json.dumps(request), text=True, capture_output=True, timeout=2)
        if result.returncode:
            raise PermissionError('owned cleanup helper rejected: ' + result.stderr[-2000:])
        reply = json.loads(result.stdout)
        if reply != {'signaled': True}:
            raise RuntimeError('invalid helper reply')
        return True
    return call


if __name__ == '__main__':
    if sys.argv[-1:] != ['--signal']:
        raise SystemExit('only --signal supported')
    request = json.loads(sys.stdin.read(4097))
    print(json.dumps({'signaled': validate_and_signal(request)}))
