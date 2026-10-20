"""Long-lived Node game workers for cheap panel games."""

import hashlib
import json
import subprocess
import threading
from pathlib import Path
from typing import Any

WORKER = Path(__file__).resolve().parent / "panel_worker.mjs"
RESTART_AFTER = 400


class PanelWorker:
    def __init__(self, node: str, heap_megabytes: int) -> None:
        self.node = node
        self.heap_megabytes = heap_megabytes
        self.games = 0
        self.process: subprocess.Popen[str] | None = None

    def _ensure(self) -> subprocess.Popen[str]:
        if self.process is not None and self.games < RESTART_AFTER:
            return self.process
        self.close()
        self.process = subprocess.Popen(
            [self.node, f"--max-old-space-size={self.heap_megabytes}", str(WORKER)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            bufsize=1,
        )
        self.games = 0
        return self.process

    def request(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        for _ in range(2):
            process = self._ensure()
            if process.stdin is None or process.stdout is None:
                raise RuntimeError("Panel worker pipes are unavailable")
            try:
                process.stdin.write(json.dumps(payload) + "\n")
                process.stdin.flush()
                line = process.stdout.readline()
            except (BrokenPipeError, OSError):
                line = ""
            if line:
                self.games += 1
                return json.loads(line)
            self.close()
        return None

    def close(self) -> None:
        if self.process is None:
            return
        if self.process.stdin is not None:
            self.process.stdin.close()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait()
        self.process = None


class PanelPool:
    def __init__(self, node: str, size: int = 8, heap_megabytes: int = 768) -> None:
        if not 1 <= size <= 8:
            raise ValueError("Use 1–8 panel workers")
        if not WORKER.is_file():
            raise ValueError(f"Missing panel worker: {WORKER}")
        self.workers = [PanelWorker(node, heap_megabytes) for _ in range(size)]
        self.validator = PanelWorker(node, heap_megabytes)
        self.validator_lock = threading.Lock()

    def validate(self, program: dict[str, Any]) -> str | None:
        with self.validator_lock:
            answer = self.validator.request({"id": "validate", "validate": program})
        if answer is None:
            return "The program validator crashed"
        return answer["error"]

    def run(self, jobs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        remaining = iter(range(len(jobs)))
        lock = threading.Lock()
        results: list[dict[str, Any] | None] = [None] * len(jobs)

        def drain(worker: PanelWorker) -> None:
            while True:
                with lock:
                    index = next(remaining, None)
                if index is None:
                    return
                job = jobs[index]
                answer = worker.request(job)
                results[index] = (
                    answer
                    if answer is not None
                    else {"id": job["id"], "valid": False, "win": None, "error": "worker crashed"}
                )

        threads = [
            threading.Thread(target=drain, args=(worker,), daemon=True) for worker in self.workers
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        return [result for result in results if result is not None]

    def close(self) -> None:
        for worker in [*self.workers, self.validator]:
            worker.close()


def runtime_fingerprint(repository: Path) -> str:
    """Cheap identity of the compiled engine: path, size, and modification time of each file."""
    digest = hashlib.sha256(WORKER.read_bytes())
    for root in (repository / "apps/api/dist", repository / "packages/shared/dist"):
        for path in sorted(root.rglob("*")):
            if path.suffix in (".js", ".json") and path.is_file():
                status = path.stat()
                digest.update(
                    f"{path.relative_to(repository)}\0{status.st_size}\0{status.st_mtime_ns}\n".encode()
                )
    return digest.hexdigest()
