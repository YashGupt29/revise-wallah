"""Supabase client for Python — used by Modal to write results back."""

import os
from supabase import create_client, Client


def get_supabase() -> Client:
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SECRET_KEY"]
    return create_client(url, key)
