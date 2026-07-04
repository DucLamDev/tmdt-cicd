import logging
import os
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from tryon_core import (
    RESULTS_DIR,
    UPLOAD_DIR,
    generate_style_analysis,
    generate_tryon_result,
    gemini_model,
    service_status,
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Virtual Try-On Service",
    description="Virtual try-on microservice with local GPU pipeline, Replicate IDM-VTON, and OpenCV fallback.",
    version="2.0.0",
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


def validate_image(upload: UploadFile, label: str):
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if upload.content_type not in allowed_types:
        raise HTTPException(400, f"{label} khong hop le. Chap nhan JPG, PNG, WebP")


@app.get("/health")
async def health_check():
    return service_status()


@app.post("/api/tryon")
async def virtual_tryon(
    request: Request,
    user_image: UploadFile = File(...),
    product_image: UploadFile = File(...),
    product_name: str = Form(default=""),
    product_category: str = Form(default="clothing"),
    tryon_context: str = Form(default=""),
):
    try:
        validate_image(user_image, "Anh nguoi dung")
        validate_image(product_image, "Anh san pham")

        user_bytes = await user_image.read()
        product_bytes = await product_image.read()

        result = await generate_tryon_result(
            user_bytes=user_bytes,
            user_filename=user_image.filename,
            user_content_type=user_image.content_type,
            product_bytes=product_bytes,
            product_filename=product_image.filename,
            product_content_type=product_image.content_type,
            product_name=product_name,
            product_category=product_category,
            tryon_context=tryon_context,
        )

        base_url = str(request.base_url).rstrip("/")
        return JSONResponse(
            {
                "success": True,
                "message": "Thu do bang AI thanh cong",
                "data": {
                    "resultImage": f"{base_url}/uploads/results/{result['result_filename']}",
                    "aiAnalysis": result["ai_analysis"],
                    "productName": product_name,
                    "productCategory": product_category,
                    "tryonContext": result["tryon_context"],
                    "provider": result["provider"],
                    "warning": result["warning"],
                    "generationPrompt": result["generation_prompt"],
                    "processedAt": datetime.now().isoformat(),
                },
            }
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Virtual try-on failed")
        raise HTTPException(500, f"Loi xu ly thu do AI: {exc}") from exc


@app.post("/api/analyze-outfit")
async def analyze_outfit(
    image: UploadFile = File(...),
    question: str = Form(default=""),
):
    if not gemini_model:
        raise HTTPException(503, "AI service chua duoc cau hinh GEMINI_API_KEY")

    try:
        image_bytes = await image.read()
        analysis = generate_style_analysis(image_bytes, image_bytes, question or "outfit")
        return JSONResponse(
            {
                "success": True,
                "data": {
                    "analysis": analysis,
                    "analyzedAt": datetime.now().isoformat(),
                },
            }
        )
    except Exception as exc:
        logger.exception("Outfit analysis failed")
        raise HTTPException(500, f"Loi phan tich outfit: {exc}") from exc


@app.post("/api/size-recommend")
async def size_recommendation(
    user_image: UploadFile = File(...),
    product_name: str = Form(default=""),
    product_sizes: str = Form(default="S,M,L,XL,XXL"),
):
    if not gemini_model:
        raise HTTPException(503, "AI service chua duoc cau hinh GEMINI_API_KEY")

    try:
        image_bytes = await user_image.read()
        analysis = generate_style_analysis(image_bytes, image_bytes, product_name)
        return JSONResponse(
            {
                "success": True,
                "data": {
                    "recommendation": analysis,
                    "availableSizes": [size.strip() for size in product_sizes.split(",") if size.strip()],
                    "analyzedAt": datetime.now().isoformat(),
                },
            }
        )
    except Exception as exc:
        logger.exception("Size recommendation failed")
        raise HTTPException(500, f"Loi goi y kich co: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
