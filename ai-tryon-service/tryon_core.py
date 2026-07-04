import asyncio
import base64
import io
import logging
import os
import platform
import shlex
import subprocess
import uuid
from datetime import datetime
from pathlib import Path

import cv2
import google.generativeai as genai
import httpx
import numpy as np
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
RESULTS_DIR = UPLOAD_DIR / "results"
WORK_DIR = UPLOAD_DIR / "work"
for directory in (UPLOAD_DIR, RESULTS_DIR, WORK_DIR):
    directory.mkdir(parents=True, exist_ok=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
TRYON_PROVIDER = os.getenv("TRYON_PROVIDER", "openai").strip().lower()
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_API_BASE_URL = os.getenv("OPENAI_API_BASE_URL", "https://api.openai.com/v1").strip().rstrip("/")
OPENAI_IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2").strip()
OPENAI_IMAGE_SIZE = os.getenv("OPENAI_IMAGE_SIZE", "1024x1536").strip()
OPENAI_IMAGE_QUALITY = os.getenv("OPENAI_IMAGE_QUALITY", "medium").strip()
OPENAI_IMAGE_FORMAT = os.getenv("OPENAI_IMAGE_FORMAT", "jpeg").strip().lower()
OPENAI_IMAGE_TIMEOUT = int(os.getenv("OPENAI_IMAGE_TIMEOUT", "180"))
REPLICATE_MODEL_ENDPOINT = os.getenv(
    "REPLICATE_IDM_ENDPOINT",
    "https://api.replicate.com/v1/models/cuuupid/idm-vton/predictions",
).strip()
REPLICATE_POLL_TIMEOUT = int(os.getenv("REPLICATE_POLL_TIMEOUT", "120"))
LOCAL_TRYON_TIMEOUT = int(os.getenv("LOCAL_TRYON_TIMEOUT", "600"))
TRYON_STRICT = os.getenv("TRYON_STRICT", "false").strip().lower() == "true"
PROMPT_IMAGE_COMMAND = os.getenv("PROMPT_IMAGE_COMMAND", "").strip()
PROMPT_IMAGE_TIMEOUT = int(os.getenv("PROMPT_IMAGE_TIMEOUT", str(LOCAL_TRYON_TIMEOUT)))

gemini_model = None
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"))
        logger.info("Gemini initialized")
    except Exception as exc:
        logger.error("Gemini init failed: %s", exc)


def get_cuda_status():
    try:
        import torch

        return {
            "torch_available": True,
            "cuda_available": bool(torch.cuda.is_available()),
            "device_count": int(torch.cuda.device_count()) if torch.cuda.is_available() else 0,
            "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        }
    except Exception:
        return {
            "torch_available": False,
            "cuda_available": False,
            "device_count": 0,
            "device_name": None,
        }


def service_status():
    local_command = get_local_tryon_command()
    return {
        "status": "healthy",
        "service": "AI Virtual Try-On",
        "provider": TRYON_PROVIDER,
        "gemini_available": gemini_model is not None,
        "openai_available": bool(OPENAI_API_KEY),
        "openai_image_model": OPENAI_IMAGE_MODEL,
        "replicate_available": bool(REPLICATE_API_TOKEN),
        "local_pipeline_available": bool(local_command),
        "prompt_image_available": bool(PROMPT_IMAGE_COMMAND),
        "cuda": get_cuda_status(),
        "timestamp": datetime.now().isoformat(),
    }


def save_upload_bytes(file_bytes: bytes, filename: str) -> str:
    suffix = Path(filename or "image.jpg").suffix or ".jpg"
    filepath = UPLOAD_DIR / f"{uuid.uuid4()}{suffix}"
    filepath.write_bytes(file_bytes)
    return str(filepath)


def save_result_image(image_bytes: bytes, suffix: str = ".jpg") -> str:
    result_path = RESULTS_DIR / f"tryon_{uuid.uuid4()}{suffix}"
    result_path.write_bytes(image_bytes)
    return str(result_path)


def image_bytes_to_data_uri(image_bytes: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def map_category_for_idm(product_category: str) -> str:
    category = (product_category or "").strip().lower()
    if category == "dress":
        return "dresses"
    if category == "bottom":
        return "lower_body"
    return "upper_body"


def sanitize_prompt_text(value: str, max_length: int = 320) -> str:
    cleaned = " ".join((value or "").replace("\n", " ").split())
    return cleaned[:max_length]


def resolve_scene_context(product_category: str, tryon_context: str = "") -> str:
    custom_context = sanitize_prompt_text(tryon_context)
    if custom_context and custom_context.lower() not in {"auto", "tu dong", "tự động"}:
        return custom_context

    category = (product_category or "clothing").strip().lower()
    if category in {"top", "shirt", "clothing", "upper_body"}:
        return "a natural casual lifestyle setting, suitable for going out, staying at home, or light daily activity"
    if category == "dress":
        return "a bright cafe or city walking setting with elegant everyday styling"
    if category == "bottom":
        return "a relaxed streetwear setting with natural full-body posture"
    if category == "shoes":
        return "an outdoor walking or light running setting where the shoes are clearly visible"
    return "a realistic everyday lifestyle setting with clean ecommerce lighting"


def quote_arg(value) -> str:
    value = str(value)
    if platform.system().lower().startswith("win"):
        return subprocess.list2cmdline([value])
    return shlex.quote(value)


def get_local_tryon_command():
    provider_command_map = {
        "idm-vton": "IDM_VTON_COMMAND",
        "idm_vton": "IDM_VTON_COMMAND",
        "catvton": "CATVTON_COMMAND",
        "cat-vton": "CATVTON_COMMAND",
        "stable-diffusion": "STABLE_DIFFUSION_TRYON_COMMAND",
        "stable_diffusion": "STABLE_DIFFUSION_TRYON_COMMAND",
        "sd-tryon": "STABLE_DIFFUSION_TRYON_COMMAND",
    }
    env_name = provider_command_map.get(TRYON_PROVIDER)
    return os.getenv(env_name or "", "").strip() or os.getenv("LOCAL_TRYON_COMMAND", "").strip()


async def run_command_template(command_template: str, context: dict, timeout: int = LOCAL_TRYON_TIMEOUT):
    safe_context = {key: quote_arg(value) for key, value in context.items()}
    command = command_template.format_map(safe_context)
    logger.info("Running try-on command: %s", command)

    process = await asyncio.create_subprocess_shell(
        command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
    except asyncio.TimeoutError as exc:
        process.kill()
        raise RuntimeError(f"Try-on command timed out after {timeout}s") from exc

    if process.returncode != 0:
        error_text = stderr.decode("utf-8", errors="ignore")[-3000:]
        raise RuntimeError(f"Try-on command failed ({process.returncode}): {error_text}")

    return stdout.decode("utf-8", errors="ignore")


async def run_optional_preprocessors(context: dict):
    hooks = [
        ("OPENPOSE_COMMAND", "pose"),
        ("DENSEPOSE_COMMAND", "densepose"),
        ("HUMAN_PARSING_COMMAND", "human_parse"),
        ("SAM_COMMAND", "garment_mask"),
        ("CONTROLNET_COMMAND", "controlnet"),
    ]

    for env_name, output_key in hooks:
        command = os.getenv(env_name, "").strip()
        if not command:
            continue

        suffix = ".png" if output_key != "controlnet" else ".json"
        output_path = WORK_DIR / f"{output_key}_{uuid.uuid4()}{suffix}"
        hook_context = {**context, "output": output_path}
        await run_command_template(command, hook_context, timeout=LOCAL_TRYON_TIMEOUT)
        context[output_key] = output_path

    return context


async def tryon_with_local_pipeline(user_path: str, product_path: str, product_name: str, product_category: str) -> str:
    command = get_local_tryon_command()
    if not command:
        raise RuntimeError("LOCAL_TRYON_COMMAND/IDM_VTON_COMMAND/CATVTON_COMMAND is not configured")

    result_path = RESULTS_DIR / f"tryon_{uuid.uuid4()}.png"
    context = {
        "person": user_path,
        "human": user_path,
        "user": user_path,
        "garment": product_path,
        "cloth": product_path,
        "product": product_path,
        "output": result_path,
        "category": map_category_for_idm(product_category),
        "raw_category": product_category or "clothing",
        "description": product_name or "garment",
    }
    context = await run_optional_preprocessors(context)
    await run_command_template(command, context, timeout=LOCAL_TRYON_TIMEOUT)

    if not result_path.exists() or result_path.stat().st_size == 0:
        raise RuntimeError("Local try-on command did not create an output image")

    return str(result_path)


def generate_tryon_prompt(
    user_bytes: bytes,
    product_bytes: bytes,
    product_name: str,
    product_category: str,
    tryon_context: str = "",
):
    scene_context = resolve_scene_context(product_category, tryon_context)
    fallback_prompt = (
        "Photorealistic virtual try-on using the person reference and garment reference images. "
        "Preserve the exact person identity, face, body shape, skin tone, hands, and natural proportions. Replace only the "
        f"visible garment area with {product_name or 'the provided garment'}, category {product_category or 'clothing'}. "
        "The garment must match the product reference image: same color, fabric, neckline, sleeves, pattern and fit. "
        f"Place the person in this context when natural: {scene_context}. "
        "Natural cloth folds, realistic shadows, clean edges, no logo hallucination, ecommerce quality."
    )
    fallback_negative = (
        "bad anatomy, changed identity, changed face, changed pose, extra limbs, missing hands, distorted body, "
        "cartoon, painting, blur, low quality, watermark, text, wrong garment, wrong color, duplicate person, "
        "transparent overlay, pasted image, square patch, floating cloth"
    )

    if not gemini_model:
        return {"prompt": fallback_prompt, "negative_prompt": fallback_negative, "source": "fallback"}

    try:
        user_pil = Image.open(io.BytesIO(user_bytes))
        product_pil = Image.open(io.BytesIO(product_bytes))
        prompt = f"""You are a senior prompt engineer for virtual try-on image generation.
Create a production-ready English prompt and negative prompt for an image-to-image/inpainting model.

Goal:
- Keep the person photo identity, face, body shape, pose, hands, camera angle, background and lighting.
- Replace only the garment area with the product garment.
- Product name: {product_name or 'garment'}
- Product category: {product_category or 'clothing'}
- Requested scene/context: {scene_context}
- Preserve the garment color, material, neckline, sleeves, length, pattern and silhouette from the product image.
- If changing the background is helpful, use the requested scene/context while keeping the person realistic.
- Make the final image photorealistic and suitable for ecommerce preview.

Return plain JSON only:
{{"prompt":"...", "negative_prompt":"..."}}"""
        response = gemini_model.generate_content([prompt, user_pil, product_pil])
        text = response.text.strip().replace("```json", "").replace("```", "").strip()
        import json

        parsed = json.loads(text)
        return {
            "prompt": parsed.get("prompt") or fallback_prompt,
            "negative_prompt": parsed.get("negative_prompt") or fallback_negative,
            "source": "gemini",
        }
    except Exception as exc:
        logger.error("Gemini prompt generation failed: %s", exc)
        return {"prompt": fallback_prompt, "negative_prompt": fallback_negative, "source": "fallback"}


async def tryon_with_prompt_image(user_path: str, product_path: str, prompt_data: dict, product_name: str, product_category: str) -> str:
    if not PROMPT_IMAGE_COMMAND:
        raise RuntimeError("PROMPT_IMAGE_COMMAND is not configured")

    result_path = RESULTS_DIR / f"tryon_{uuid.uuid4()}.png"
    context = {
        "person": user_path,
        "human": user_path,
        "user": user_path,
        "garment": product_path,
        "cloth": product_path,
        "product": product_path,
        "output": result_path,
        "category": map_category_for_idm(product_category),
        "raw_category": product_category or "clothing",
        "description": product_name or "garment",
        "prompt": prompt_data.get("prompt", ""),
        "negative_prompt": prompt_data.get("negative_prompt", ""),
    }
    await run_command_template(PROMPT_IMAGE_COMMAND, context, timeout=PROMPT_IMAGE_TIMEOUT)

    if not result_path.exists() or result_path.stat().st_size == 0:
        raise RuntimeError("Prompt image command did not create an output image")

    return str(result_path)


async def tryon_with_openai_image(
    user_path: str,
    product_path: str,
    user_content_type: str,
    product_content_type: str,
    prompt_data: dict,
) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    prompt = (
        f"{prompt_data.get('prompt', '')}\n\n"
        "Use the first image as the person reference and the second image as the exact garment/product reference. "
        "Generate one polished, photorealistic result. Keep the person's identity, face, body shape and pose natural. "
        "Do not invent brand logos or alter the product color/pattern.\n\n"
        f"Avoid: {prompt_data.get('negative_prompt', '')}"
    ).strip()

    data = {
        "model": OPENAI_IMAGE_MODEL,
        "prompt": prompt,
        "size": OPENAI_IMAGE_SIZE,
        "quality": OPENAI_IMAGE_QUALITY,
        "output_format": OPENAI_IMAGE_FORMAT,
        "n": "1",
    }

    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
    endpoint = f"{OPENAI_API_BASE_URL}/images/edits"
    last_error = None

    for image_field_name in ("image[]", "image"):
        with open(user_path, "rb") as user_file, open(product_path, "rb") as product_file:
            files = [
                (image_field_name, ("person.jpg", user_file, user_content_type or "image/jpeg")),
                (image_field_name, ("garment.jpg", product_file, product_content_type or "image/jpeg")),
            ]

            async with httpx.AsyncClient(timeout=float(OPENAI_IMAGE_TIMEOUT)) as client:
                response = await client.post(endpoint, headers=headers, data=data, files=files)

        if response.status_code >= 400:
            last_error = response.text
            logger.warning("OpenAI image edit failed with field %s: %s", image_field_name, response.text[:1200])
            continue

        payload = response.json()
        output = (payload.get("data") or [{}])[0]
        b64_json = output.get("b64_json")
        suffix = ".png" if OPENAI_IMAGE_FORMAT == "png" else ".webp" if OPENAI_IMAGE_FORMAT == "webp" else ".jpg"

        if b64_json:
            return save_result_image(base64.b64decode(b64_json), suffix=suffix)

        output_url = output.get("url")
        if output_url:
            async with httpx.AsyncClient(timeout=60.0) as client:
                image_response = await client.get(output_url)
            if image_response.status_code >= 400:
                raise RuntimeError("Failed to download OpenAI generated image")
            content_type = image_response.headers.get("content-type", "")
            url_suffix = ".png" if "png" in content_type else ".webp" if "webp" in content_type else ".jpg"
            return save_result_image(image_response.content, suffix=url_suffix)

        raise RuntimeError("OpenAI image edit succeeded but returned no image")

    raise RuntimeError(f"OpenAI image edit failed: {last_error or 'unknown error'}")


async def tryon_with_replicate(
    user_bytes: bytes,
    user_content_type: str,
    product_bytes: bytes,
    product_content_type: str,
    product_name: str,
    product_category: str,
) -> str:
    if not REPLICATE_API_TOKEN:
        raise RuntimeError("REPLICATE_API_TOKEN is not configured")

    headers = {
        "Authorization": f"Token {REPLICATE_API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "input": {
            "human_img": image_bytes_to_data_uri(user_bytes, user_content_type or "image/jpeg"),
            "garm_img": image_bytes_to_data_uri(product_bytes, product_content_type or "image/jpeg"),
            "category": map_category_for_idm(product_category),
            "garment_des": product_name or "garment",
            "crop": True,
            "steps": 30,
        }
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        create_response = await client.post(REPLICATE_MODEL_ENDPOINT, headers=headers, json=payload)
        if create_response.status_code >= 400:
            raise RuntimeError(f"Replicate create failed: {create_response.status_code} - {create_response.text}")

        prediction = create_response.json()
        poll_url = prediction.get("urls", {}).get("get")
        if not poll_url:
            raise RuntimeError("Replicate response missing poll URL")

        started_at = datetime.now()
        while True:
            poll_response = await client.get(poll_url, headers=headers)
            if poll_response.status_code >= 400:
                raise RuntimeError(f"Replicate poll failed: {poll_response.status_code} - {poll_response.text}")

            polled = poll_response.json()
            status = polled.get("status")

            if status == "succeeded":
                output = polled.get("output")
                output_url = output[0] if isinstance(output, list) and output else output
                if not output_url:
                    raise RuntimeError("Replicate succeeded but output URL is empty")

                image_response = await client.get(output_url)
                if image_response.status_code >= 400:
                    raise RuntimeError("Failed to download generated try-on image")

                content_type = image_response.headers.get("content-type", "")
                suffix = ".png" if "png" in content_type else ".jpg"
                return save_result_image(image_response.content, suffix=suffix)

            if status in {"failed", "canceled"}:
                raise RuntimeError(f"Replicate prediction {status}: {polled.get('error')}")

            elapsed = (datetime.now() - started_at).total_seconds()
            if elapsed > REPLICATE_POLL_TIMEOUT:
                raise RuntimeError("Replicate prediction timed out")

            await asyncio.sleep(1.5)


def _grabcut_mask(product_bgr: np.ndarray) -> np.ndarray:
    h, w = product_bgr.shape[:2]
    if h < 10 or w < 10:
        return np.full((h, w), 255, dtype=np.uint8)

    mask = np.zeros((h, w), np.uint8)
    rect = (max(1, int(w * 0.04)), max(1, int(h * 0.04)), max(2, int(w * 0.92)), max(2, int(h * 0.92)))
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    try:
        cv2.grabCut(product_bgr, mask, rect, bgd_model, fgd_model, 4, cv2.GC_INIT_WITH_RECT)
        return np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype("uint8")
    except Exception:
        return np.zeros((h, w), dtype=np.uint8)


def _category_focus_mask(shape, category: str) -> np.ndarray:
    h, w = shape[:2]
    category = (category or "clothing").strip().lower()
    mask = np.zeros((h, w), dtype=np.uint8)

    if category == "dress":
        center = (w // 2, int(h * 0.52))
        axes = (int(w * 0.34), int(h * 0.42))
    elif category == "bottom":
        center = (w // 2, int(h * 0.64))
        axes = (int(w * 0.32), int(h * 0.34))
    elif category == "glasses":
        center = (w // 2, int(h * 0.22))
        axes = (int(w * 0.28), int(h * 0.09))
    elif category == "shoes":
        center = (w // 2, int(h * 0.82))
        axes = (int(w * 0.36), int(h * 0.13))
    else:
        center = (w // 2, int(h * 0.42))
        axes = (int(w * 0.32), int(h * 0.26))

    cv2.ellipse(mask, center, axes, 0, 0, 360, 255, -1)
    return mask


def _extract_foreground_mask(product_bgr: np.ndarray, category: str = "clothing") -> np.ndarray:
    gray = cv2.cvtColor(product_bgr, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(product_bgr, cv2.COLOR_BGR2HSV)

    _, non_bright = cv2.threshold(gray, 246, 255, cv2.THRESH_BINARY_INV)
    sat_mask = cv2.inRange(hsv[:, :, 1], 35, 255)
    grab_mask = _grabcut_mask(product_bgr)
    focus_mask = _category_focus_mask(product_bgr.shape, category)

    mask = cv2.bitwise_or(cv2.bitwise_and(non_bright, grab_mask), cv2.bitwise_and(sat_mask, focus_mask))
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)

    visible_ratio = float(np.count_nonzero(mask)) / float(mask.size)
    if visible_ratio < 0.03 or visible_ratio > 0.62:
        mask = cv2.bitwise_and(focus_mask, cv2.bitwise_or(non_bright, sat_mask))
        if float(np.count_nonzero(mask)) / float(mask.size) < 0.03:
            mask = focus_mask

    return mask


def _crop_to_mask(image: np.ndarray, mask: np.ndarray):
    coords = cv2.findNonZero(mask)
    if coords is None:
        return image, mask

    x, y, w, h = cv2.boundingRect(coords)
    pad_x = int(w * 0.08)
    pad_y = int(h * 0.08)
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(image.shape[1], x + w + pad_x)
    y2 = min(image.shape[0], y + h + pad_y)
    return image[y1:y2, x1:x2], mask[y1:y2, x1:x2]


def _target_region(user_shape, category: str):
    h_user, w_user = user_shape[:2]
    category = (category or "clothing").strip().lower()
    if category == "dress":
        return int(w_user * 0.19), int(h_user * 0.18), int(w_user * 0.81), int(h_user * 0.9)
    if category == "bottom":
        return int(w_user * 0.21), int(h_user * 0.44), int(w_user * 0.79), int(h_user * 0.95)
    if category in {"top", "clothing", "shirt", "upper_body"}:
        return int(w_user * 0.22), int(h_user * 0.2), int(w_user * 0.78), int(h_user * 0.64)
    if category == "glasses":
        return int(w_user * 0.3), int(h_user * 0.14), int(w_user * 0.7), int(h_user * 0.3)
    if category == "shoes":
        return int(w_user * 0.18), int(h_user * 0.78), int(w_user * 0.82), int(h_user * 0.98)
    return int(w_user * 0.2), int(h_user * 0.22), int(w_user * 0.8), int(h_user * 0.76)


def create_simple_overlay(user_image_path: str, product_image_path: str, product_category: str = "clothing") -> str:
    user_img = cv2.imread(user_image_path)
    product_img = cv2.imread(product_image_path, cv2.IMREAD_UNCHANGED)
    if user_img is None or product_img is None:
        raise ValueError("Cannot read input images")

    if len(product_img.shape) == 3 and product_img.shape[2] == 4:
        product_bgr = product_img[:, :, :3]
        alpha_src = product_img[:, :, 3]
    else:
        product_bgr = product_img if len(product_img.shape) == 3 else cv2.cvtColor(product_img, cv2.COLOR_GRAY2BGR)
        alpha_src = _extract_foreground_mask(product_bgr, product_category)

    product_bgr, alpha_src = _crop_to_mask(product_bgr, alpha_src)

    x1, y1, x2, y2 = _target_region(user_img.shape, product_category)
    box_w = max(1, x2 - x1)
    box_h = max(1, y2 - y1)
    ph, pw = product_bgr.shape[:2]
    scale = min(box_w / max(pw, 1), box_h / max(ph, 1))
    render_w = max(1, int(pw * scale))
    render_h = max(1, int(ph * scale))

    product_resized = cv2.resize(product_bgr, (render_w, render_h), interpolation=cv2.INTER_AREA)
    alpha_resized = cv2.resize(alpha_src, (render_w, render_h), interpolation=cv2.INTER_LINEAR)

    paste_x1 = max(0, x1 + (box_w - render_w) // 2)
    paste_y1 = max(0, y1 + (box_h - render_h) // 2)
    paste_x2 = min(user_img.shape[1], paste_x1 + render_w)
    paste_y2 = min(user_img.shape[0], paste_y1 + render_h)

    product_resized = product_resized[: paste_y2 - paste_y1, : paste_x2 - paste_x1]
    alpha_resized = alpha_resized[: paste_y2 - paste_y1, : paste_x2 - paste_x1]

    body_clip = _category_focus_mask(alpha_resized.shape, product_category)
    alpha_resized = cv2.bitwise_and(alpha_resized, body_clip)
    alpha_resized = cv2.GaussianBlur(alpha_resized, (0, 0), sigmaX=5, sigmaY=5)
    alpha = np.expand_dims((alpha_resized.astype(np.float32) / 255.0) * 0.92, axis=2)

    result = user_img.copy()
    target_region = result[paste_y1:paste_y2, paste_x1:paste_x2].astype(np.float32)
    blended = alpha * product_resized.astype(np.float32) + (1.0 - alpha) * target_region
    result[paste_y1:paste_y2, paste_x1:paste_x2] = blended.astype(np.uint8)

    result_path = RESULTS_DIR / f"tryon_{uuid.uuid4()}.jpg"
    cv2.imwrite(str(result_path), result, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    return str(result_path)


def generate_style_analysis(user_bytes: bytes, product_bytes: bytes, product_name: str):
    if not gemini_model:
        return None

    try:
        user_pil = Image.open(io.BytesIO(user_bytes))
        product_pil = Image.open(io.BytesIO(product_bytes))
        prompt = f"""Ban la chuyen gia thoi trang. Hay phan tich ngan gon bang tieng Viet:
1. Kieu trang phuc trong anh san pham ({product_name or 'san pham'})
2. Muc do phu hop voi nguoi trong anh, khong nhan dang danh tinh
3. Goi y size S/M/L/XL/XXL neu co the
4. Goi y phoi do kem theo
Tra loi ro rang, toi da 120 tu."""
        response = gemini_model.generate_content([prompt, user_pil, product_pil])
        return response.text
    except Exception as exc:
        logger.error("Gemini analysis failed: %s", exc)
        return "Khong the phan tich AI luc nay. Vui long thu lai sau."


async def generate_tryon_result(
    user_bytes: bytes,
    user_filename: str,
    user_content_type: str,
    product_bytes: bytes,
    product_filename: str,
    product_content_type: str,
    product_name: str = "",
    product_category: str = "clothing",
    tryon_context: str = "",
):
    user_path = save_upload_bytes(user_bytes, user_filename)
    product_path = save_upload_bytes(product_bytes, product_filename)

    ai_analysis = generate_style_analysis(user_bytes, product_bytes, product_name)
    prompt_data = generate_tryon_prompt(user_bytes, product_bytes, product_name, product_category, tryon_context)
    provider_used = "opencv_fallback"
    warning = None

    try:
        local_providers = {
            "local",
            "local_idm",
            "idm-vton",
            "idm_vton",
            "catvton",
            "cat-vton",
            "stable-diffusion",
            "stable_diffusion",
            "sd-tryon",
        }
        openai_providers = {"openai", "gpt-image", "gpt_image", "gpt-image-edit", "gpt_image_edit"}
        prompt_image_providers = {"prompt-image", "prompt_image", "ai-prompt", "image-generation", "image_generation", "comfyui"}
        if TRYON_PROVIDER in openai_providers and OPENAI_API_KEY:
            result_path = await tryon_with_openai_image(
                user_path,
                product_path,
                user_content_type,
                product_content_type,
                prompt_data,
            )
            provider_used = "openai_gpt_image"
        elif TRYON_PROVIDER in openai_providers and TRYON_STRICT:
            raise RuntimeError("OPENAI_API_KEY is required for OpenAI try-on provider")
        elif TRYON_PROVIDER in prompt_image_providers:
            result_path = await tryon_with_prompt_image(user_path, product_path, prompt_data, product_name, product_category)
            provider_used = "prompt_image"
        elif TRYON_PROVIDER in local_providers and get_local_tryon_command():
            result_path = await tryon_with_local_pipeline(user_path, product_path, product_name, product_category)
            provider_used = TRYON_PROVIDER
        elif TRYON_PROVIDER == "replicate" and REPLICATE_API_TOKEN:
            result_path = await tryon_with_replicate(
                user_bytes,
                user_content_type,
                product_bytes,
                product_content_type,
                product_name,
                product_category,
            )
            provider_used = "replicate_idm_vton"
        elif OPENAI_API_KEY:
            result_path = await tryon_with_openai_image(
                user_path,
                product_path,
                user_content_type,
                product_content_type,
                prompt_data,
            )
            provider_used = "openai_gpt_image"
        elif REPLICATE_API_TOKEN:
            result_path = await tryon_with_replicate(
                user_bytes,
                user_content_type,
                product_bytes,
                product_content_type,
                product_name,
                product_category,
            )
            provider_used = "replicate_idm_vton"
        else:
            warning = "No real AI try-on provider is configured. Using OpenCV preview fallback."
            result_path = create_simple_overlay(user_path, product_path, product_category)
    except Exception as exc:
        if TRYON_STRICT:
            raise
        warning = str(exc)
        logger.error("Primary try-on provider failed, using fallback: %s", exc)
        result_path = create_simple_overlay(user_path, product_path, product_category)

    return {
        "result_path": result_path,
        "result_filename": Path(result_path).name,
        "provider": provider_used,
        "warning": warning,
        "ai_analysis": ai_analysis,
        "generation_prompt": prompt_data,
        "tryon_context": resolve_scene_context(product_category, tryon_context),
    }
