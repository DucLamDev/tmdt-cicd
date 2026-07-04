import asyncio
import logging
import os
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from tryon_core import UPLOAD_DIR, generate_tryon_result, service_status

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5000").split(","))


def _run_async(coro):
    return asyncio.run(coro)


@app.get("/health")
def health_check():
    return jsonify(service_status())


@app.get("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(str(UPLOAD_DIR), filename)


@app.post("/api/tryon")
def virtual_tryon():
    try:
        user_image = request.files.get("user_image")
        product_image = request.files.get("product_image")
        if not user_image or not product_image:
            return jsonify({"success": False, "message": "Thieu anh nguoi dung hoac anh san pham"}), 400

        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if user_image.mimetype not in allowed_types or product_image.mimetype not in allowed_types:
            return jsonify({"success": False, "message": "Chi chap nhan JPG, PNG, WebP"}), 400

        user_bytes = user_image.read()
        product_bytes = product_image.read()
        product_name = request.form.get("product_name", "")
        product_category = request.form.get("product_category", "clothing")
        tryon_context = request.form.get("tryon_context", "")

        result = _run_async(
            generate_tryon_result(
                user_bytes=user_bytes,
                user_filename=user_image.filename,
                user_content_type=user_image.mimetype,
                product_bytes=product_bytes,
                product_filename=product_image.filename,
                product_content_type=product_image.mimetype,
                product_name=product_name,
                product_category=product_category,
                tryon_context=tryon_context,
            )
        )

        base_url = request.url_root.rstrip("/")
        return jsonify(
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
    except Exception as exc:
        logger.exception("Virtual try-on failed")
        return jsonify({"success": False, "message": f"Loi xu ly thu do AI: {exc}"}), 500


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    app.run(host=host, port=port, debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
