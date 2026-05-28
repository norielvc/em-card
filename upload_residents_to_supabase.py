"""
EM Card - Secure Bulk Upload Residents to Supabase

This script authenticates as an admin user first, then uploads residents.
With RLS enabled, ONLY authenticated users can insert into ValidResidents.

Usage:
    1. Set your admin credentials below
    2. Run: python upload_residents_to_supabase.py
"""

import pandas as pd
from supabase import create_client
import os
import sys
import getpass

# ============================================================
# CONFIGURATION - UPDATE THESE VALUES
# ============================================================

# Supabase project credentials
SUPABASE_URL = "https://azxkcjkbimgigmwggpkj.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eGtjamtiaW1naWdtd2dncGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTIxNTgsImV4cCI6MjA5NTUyODE1OH0.d31_pc6KTiWsHY7VmGg5VfzIzg0K9-9oNSIZHXVyXh8"

# Your Supabase admin credentials (same as you log into /admin with)
ADMIN_EMAIL = "admin@em-card.com"  # <-- UPDATE THIS
# ADMIN_PASSWORD = "your_password_here"  # You will be prompted interactively

# Path to your residents Excel/CSV file
FILE_PATH = r"c:\Users\SCREENS\OneDrive\Desktop\EM-CARD\borol1st_residents_database.xlsx"

# Upload batch size (max 1000 per batch for Supabase)
BATCH_SIZE = 1000


def login(supabase, email, password):
    """Authenticate with Supabase and return the session."""
    print(f"\nAuthenticating as {email}...")
    result = supabase.auth.sign_in_with_password({
        "email": email,
        "password": password
    })
    if result.user is None:
        print("FAILED: Invalid email or password.")
        return None
    print(f"  Logged in successfully! User ID: {result.user.id[:8]}...")
    return result.session


def main():
    print("=" * 65)
    print("  EM CARD - SECURE BULK UPLOAD TO SUPABASE")
    print("  (Requires admin authentication due to RLS security)")
    print("=" * 65)

    # Check file exists
    if not os.path.exists(FILE_PATH):
        print(f"\n  ERROR: File not found:\n    {FILE_PATH}")
        print("  Please update the FILE_PATH in this script.")
        sys.exit(1)

    # Prompt for admin password securely
    print(f"\n  Admin Email: {ADMIN_EMAIL}")
    password = getpass.getpass("  Admin Password: ")
    if not password:
        print("  ERROR: Password cannot be empty.")
        sys.exit(1)

    # Initialize Supabase client
    print(f"\n  Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

    # Login as admin (required for INSERT permission with RLS)
    session = login(supabase, ADMIN_EMAIL, password)
    if not session:
        sys.exit(1)

    # Read the file
    print(f"\n  Reading file: {os.path.basename(FILE_PATH)}")
    if FILE_PATH.endswith('.csv'):
        df = pd.read_csv(FILE_PATH)
    else:
        df = pd.read_excel(FILE_PATH)

    print(f"  Total rows in file: {len(df)}")
    print(f"  Columns: {list(df.columns)}")

    # Prepare records for Supabase
    records = []
    skipped = 0
    for _, row in df.iterrows():
        last = str(row.get("Last Name", row.get("last_name", ""))).strip()
        first = str(row.get("First Name", row.get("first_name", ""))).strip()
        middle = str(row.get("Middle Name", row.get("middle_name", ""))).strip() if pd.notna(row.get("Middle Name", row.get("middle_name", ""))) else ""
        barangay = str(row.get("Barangay", row.get("barangay", "Borol 1st"))).strip() or "Borol 1st"
        precinct = str(row.get("Precinct", row.get("precinct", ""))).strip() if pd.notna(row.get("Precinct", row.get("precinct", ""))) else ""

        if last and first:
            records.append({
                "last_name": last,
                "first_name": first,
                "middle_name": middle,
                "barangay": barangay,
                "precinct": precinct,
                "status": "Verified"
            })
        else:
            skipped += 1

    print(f"  Valid records ready to upload: {len(records)}")
    if skipped:
        print(f"  Skipped (missing name): {skipped}")

    if len(records) == 0:
        print("\n  ERROR: No valid records found. Check column names.")
        sys.exit(1)

    # Upload in batches
    total_uploaded = 0
    total_batches = (len(records) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        print(f"\n  Uploading batch {batch_num}/{total_batches} ({len(batch)} records)...")

        try:
            response = supabase.table("ValidResidents").insert(batch).execute()
            total_uploaded += len(batch)
            print(f"    SUCCESS: {len(batch)} records uploaded.")
        except Exception as e:
            print(f"    ERROR: {e}")
            print(f"    Retrying individually for this batch...")
            success = 0
            for record in batch:
                try:
                    supabase.table("ValidResidents").insert(record).execute()
                    success += 1
                except Exception as e2:
                    print(f"      FAILED: {record['last_name']}, {record['first_name']} - {str(e2)[:60]}")
            total_uploaded += success
            print(f"    Individual insert: {success}/{len(batch)} succeeded.")

    # Logout
    supabase.auth.sign_out()

    # Summary
    print("\n" + "=" * 65)
    print("  UPLOAD COMPLETE")
    print("=" * 65)
    print(f"  Total uploaded:  {total_uploaded} / {len(records)}")
    print(f"  Failed:          {len(records) - total_uploaded}")
    print("=" * 65)

    # Verify count
    try:
        response = supabase.table("ValidResidents").select("*", count="exact").execute()
        print(f"\n  Verification: {response.count} total residents now in Supabase.")
    except Exception as e:
        print(f"\n  Could not verify count: {e}")


if __name__ == "__main__":
    main()
