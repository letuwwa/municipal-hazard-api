from fastapi import FastAPI
from fastapi.responses import FileResponse
from app.core import settings
from app.api.v1.router import api_router
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="fastapi-template",
    version="1.0.0",
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return FileResponse("frontend/welcome.html")
