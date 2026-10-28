"""Live floating WhatsApp bubble regression: run with python3 src/test/whatsapp-float.browser.py."""
import asyncio
from playwright.async_api import async_playwright

ARENA = '556992707000'

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 393, 'height': 852})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))

        await page.goto('http://localhost:8080', wait_until='networkidle')
        bubble = page.get_by_role('link', name='Falar no WhatsApp com a Arena Elsinho')
        await bubble.wait_for()
        assert await bubble.is_visible(), 'WhatsApp bubble must be visible'
        assert ARENA in (await bubble.get_attribute('href')), 'Bubble must open the arena number'
        size = await bubble.evaluate("""(e)=>{const b=e.getBoundingClientRect();
            return [Math.round(innerHeight-b.bottom), Math.round(innerWidth-b.right)]}""")
        assert size[0] >= 12 and size[0] <= 40, f'Bubble must sit clear of the screen edge: {size}'
        assert size[1] >= 12 and size[1] <= 40, f'Bubble must sit clear of the screen edge: {size}'
        assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile page must fit'

        await page.goto('http://localhost:8080/admin', wait_until='networkidle')
        assert await page.get_by_role('link', name='Falar no WhatsApp com a Arena Elsinho').count() == 0, \
            'Bubble must stay out of the admin panel'
        assert not errors, errors
        print('PASS: floating WhatsApp bubble opens 556992707000, sits in the corner, mobile fits, hidden on admin')
        await browser.close()

asyncio.run(main())
