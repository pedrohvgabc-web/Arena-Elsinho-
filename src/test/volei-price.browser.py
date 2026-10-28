"""Live price regression: run with python3 src/test/volei-price.browser.py."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 393, "height": 852})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto('http://localhost:8080', wait_until='networkidle')
        card = page.locator('article').filter(has_text='Vôlei')
        await card.scroll_into_view_if_needed()
        assert 'R$ 55,00' in (await card.inner_text()).replace('\xa0', ' '), 'Home must show R$55 hourly volleyball price'
        logo = page.locator('header img')
        assert await logo.evaluate('(e)=>e.complete && e.naturalWidth > 0'), 'Logo must load'
        await page.locator('header').screenshot(path='/tmp/browser/arena-logo-header.png')
        assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile page must fit'
        await card.get_by_role('link', name='Reservar', exact=True).click()
        await page.wait_for_load_state('networkidle')
        assert 'R$ 55,00' in (await page.locator('main').inner_text()).replace('\xa0', ' '), 'Booking must use R$55 volleyball price'
        await page.wait_for_timeout(1500)
        await page.screenshot(path='/tmp/browser/arena-logo-booking.png')
        await page.locator('header').get_by_role('link', name='Administrador', exact=True).click()
        await page.get_by_label('Senha', exact=True).wait_for()
        assert not errors, errors
        print('PASS: volleyball R$55 on home and booking; logo loaded; discreet Admin opens login; mobile fits; no runtime errors')
        await browser.close()

asyncio.run(main())
