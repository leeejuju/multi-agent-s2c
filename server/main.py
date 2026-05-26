import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi

from server.lifespan import lifespan
from server.middleware import AuthMiddleware
from server.router import api_router

SWAGGER_UI_PARAMETERS = {
    "displayRequestDuration": True,
    "persistAuthorization": True,
}

PUBLIC_OPENAPI_OPERATIONS = {
    ("/api/auth/register", "post"),
    ("/api/auth/login", "post"),
}

app = FastAPI(
    title="multi-agent-s2c",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    swagger_ui_parameters=SWAGGER_UI_PARAMETERS,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuthMiddleware)

app.include_router(api_router, prefix="/api")


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )
    components = openapi_schema.setdefault("components", {})
    security_schemes = components.setdefault("securitySchemes", {})
    security_schemes["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Use the access_token returned by /api/auth/login.",
    }

    for path, operations in openapi_schema.get("paths", {}).items():
        if not path.startswith("/api/"):
            continue
        for method, operation in operations.items():
            if method.lower() not in {"get", "post", "put", "patch", "delete"}:
                continue
            if (path, method.lower()) in PUBLIC_OPENAPI_OPERATIONS:
                continue
            security = operation.setdefault("security", [])
            if {"BearerAuth": []} not in security:
                security.append({"BearerAuth": []})

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/swagger", include_in_schema=False)
async def swagger_ui():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Swagger UI",
        swagger_ui_parameters=SWAGGER_UI_PARAMETERS,
    )


if __name__ == "__main__":
    uvicorn.run("server.main:app", host="localhost", port=5050, reload=True)
