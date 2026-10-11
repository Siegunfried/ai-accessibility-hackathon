"""一键启动三个服务：感知层(8000) + 决策层(8001) + 前端静态(8002)。

用法：python start_demo.py
Ctrl+C 可同时结束所有服务。
"""
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PERCEPTION_DIR = ROOT / "backend" / "perception"
DECISION_DIR = ROOT / "backend" / "decision"


def main() -> None:
    procs = []
    try:
        # 1) 感知层
        procs.append(
            subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"],
                cwd=PERCEPTION_DIR,
            )
        )

        # 2) 决策层（连接感知层）
        env = os.environ.copy()
        env["PERCEPTION_BASE_URL"] = "http://localhost:8000"
        procs.append(
            subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"],
                cwd=DECISION_DIR,
                env=env,
            )
        )

        # 3) 前端静态服务（项目根目录，便于访问 /frontend 与 /demo）
        procs.append(
            subprocess.Popen(
                [sys.executable, "-m", "http.server", "8002"],
                cwd=ROOT,
            )
        )

        time.sleep(2)
        print("\n=== 视碍守护 服务已启动 ===")
        print("  前端 Demo:  http://localhost:8002/frontend/")
        print("  决策层 API: http://localhost:8001/docs")
        print("  感知层 API: http://localhost:8000/docs")
        print("  按 Ctrl+C 停止全部服务\n")
        for p in procs:
            p.wait()
    except KeyboardInterrupt:
        print("\n正在停止服务…")
    finally:
        for p in procs:
            p.terminate()
        for p in procs:
            try:
                p.wait(timeout=3)
            except subprocess.TimeoutExpired:
                p.kill()


if __name__ == "__main__":
    main()