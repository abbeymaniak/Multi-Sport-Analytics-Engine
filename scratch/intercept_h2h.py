import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Intercept and print all sofascore API request URLs
        def handle_request(request):
            if "sofascore.com/api/v1" in request.url:
                print(f"API Request: {request.url}")
                
        page.on("request", handle_request)
        
        print("Navigating to SofaScore match page...")
        await page.goto("https://www.sofascore.com/brighton-and-hove-albion-manchester-united/IsdsYtb")
        await asyncio.sleep(3)
        
        # Scroll down incrementally to trigger dynamic components (H2H etc.)
        for i in range(10):
            print(f"Scrolling down {i+1}/10...")
            await page.evaluate("window.scrollBy(0, 800)")
            await asyncio.sleep(1)
            
        await browser.close()

asyncio.run(test())
