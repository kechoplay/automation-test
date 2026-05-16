import asyncio
import sys
import uvicorn

# Windows cần ProactorEventLoop để asyncio.create_subprocess_exec hoạt động
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

if __name__ == "__main__":
    uvicorn.run("web.app:app", host="127.0.0.1", port=8000, reload=True)
