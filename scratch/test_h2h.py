import asyncio
import json
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://www.sofascore.com/")
        await asyncio.sleep(2)
        
        event_id = 14023959 # Brighton vs Man Utd
        
        endpoints = [
            f"https://www.sofascore.com/api/v1/event/{event_id}/h2h/events",
            f"https://www.sofascore.com/api/v1/event/{event_id}/h2h-events",
            f"https://www.sofascore.com/api/v1/event/{event_id}/h2h/matches",
            f"https://www.sofascore.com/api/v1/event/{event_id}/h2h/history"
        ]
        
        for url in endpoints:
            print(f"\nTrying: {url}")
            await page.goto(url)
            content = await page.evaluate("() => document.body.innerText")
            try:
                data = json.loads(content)
                if data and "error" not in data:
                    print(f"SUCCESS! Keys: {data.keys()}")
                    print(json.dumps(data, indent=2)[:500])
                    break
                else:
                    print(f"Failed (JSON error/not found): {content[:100]}")
            except Exception as e:
                print(f"Failed: {e}")
                
        await browser.close()

asyncio.run(test())
