"""
Google Gemini API client utilities
Adapted from parcel_gens.py safe_generate function
"""
import time
import traceback
import os
from typing import Optional
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions


def get_gemini_client(api_key: Optional[str] = None):
    """
    Create and return a Gemini API client.
    
    Args:
        api_key: Optional API key. If not provided, uses GOOGLE_GEMINI_API_KEY env var
        
    Returns:
        Configured genai module (google.generativeai)
    """
    if api_key is None:
        api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
        
    if not api_key:
        raise ValueError("GOOGLE_GEMINI_API_KEY not found in environment variables")
    
    genai.configure(api_key=api_key)
    return genai


def safe_generate(client, model, contents, max_retries=3, backoff=2.0):
    """
    Safely generate content with retry logic and error handling.
    
    Args:
        client: Configured genai module (google.generativeai)
        model: Model name (e.g., 'gemini-2.0-flash-exp')
        contents: Content to send to the model
        max_retries: Maximum number of retry attempts
        backoff: Exponential backoff base (in seconds)
        
    Returns:
        Dictionary with keys:
        - ok: Boolean indicating success
        - response: The API response (if successful)
        - error: Error type string (if failed)
        - message: Error message (if failed)
    """
    attempt = 1
    while attempt <= max_retries:
        try:
            print(f"Sending request to {model} (attempt {attempt}/{max_retries})...")
            t0 = time.perf_counter()

            model_instance = client.GenerativeModel(model)
            response = model_instance.generate_content(contents)

            dt = time.perf_counter() - t0
            print(f"✓ Request succeeded in {dt:.2f}s")
            return {"ok": True, "response": response}

        except google_exceptions.ResourceExhausted as e:
            # Rate limit / quota exceeded
            print(f"🚫 Rate limit / quota exceeded: {e.message}")
            if attempt == max_retries:
                return {"ok": False, "error": "rate_limit", "message": str(e)}

        except google_exceptions.DeadlineExceeded as e:
            # Timeout
            print(f"⏳ Request timed out: {e.message}")
            if attempt == max_retries:
                return {"ok": False, "error": "timeout", "message": str(e)}

        except google_exceptions.ServiceUnavailable as e:
            # Temporary backend issue
            print(f"⚠️ Service unavailable: {e.message}")
            if attempt == max_retries:
                return {"ok": False, "error": "unavailable", "message": str(e)}

        except google_exceptions.GoogleAPIError as e:
            # Other Google API errors
            print(f"❌ API Error: {e.message}")
            return {"ok": False, "error": "api_error", "message": str(e)}

        except Exception as e:
            # Anything else
            print("❗ Unexpected error:")
            traceback.print_exc()
            return {
                "ok": False,
                "error": "unexpected",
                "message": str(e),
                "traceback": traceback.format_exc(),
            }

        # Backoff and retry
        sleep_time = backoff ** attempt
        print(f"Retrying in {sleep_time:.1f}s...\n")
        time.sleep(sleep_time)
        attempt += 1

    # Should never reach here, but just in case
    return {"ok": False, "error": "max_retries", "message": "Maximum retries exceeded"}
