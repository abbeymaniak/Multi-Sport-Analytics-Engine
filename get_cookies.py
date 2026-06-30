#!/usr/bin/env python3
import asyncio
import os
import shutil
from playwright.async_api import async_playwright

async def main():
    profile_dir = os.path.join(os.getcwd(), ".chrome_profile")
    print("=" * 60)
    print("  SofaScore Browser Session Primer")
    print("=" * 60)
    print(f"Using profile directory: {profile_dir}")
    print("This will open a visible browser window.")
    print("1. Please solve any Cloudflare/Turnstile captcha if it appears.")
    print("2. Wait for the SofaScore homepage to fully load.")
    print("3. Once the page is fully loaded and you see the matches,")
    print("   come back here and press Enter to save the session.")
    print("=" * 60)

    async with async_playwright() as p:
        ext_path = os.path.join(os.getcwd(), "urban_vpn")
        
        # Launch with persistent context and load the VPN extension
        context = await p.chromium.launch_persistent_context(
            user_data_dir=profile_dir,
            headless=False,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                f"--disable-extensions-except={ext_path}",
                f"--load-extension={ext_path}",
            ],
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        )
        
        page = await context.new_page()
        
        # Go to the football page directly
        await page.goto("https://www.sofascore.com/")
        
        # Wait for user to confirm they solved it
        await asyncio.get_event_loop().run_in_executor(None, input, "Press Enter here once the page is fully loaded and matches are visible...")
        
        # Double check if we have cookies
        cookies = await context.cookies()
        print(f"\n[SUCCESS] Session primed! Persisted {len(cookies)} cookies to .chrome_profile.")
        await context.close()

if __name__ == "__main__":
    asyncio.run(main())
