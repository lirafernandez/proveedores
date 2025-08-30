import os
from playwright.sync_api import sync_playwright, Page, expect

def test_simple_load(page: Page):
    """
    This test verifies that the proveedores table is populated with at least one row.
    """
    # 1. Arrange: Go to the simplified proveedores.html page.
    page.goto("http://localhost:8000/proveedores.html")

    # 2. Assert: Wait for the table to have at least one row.
    # This will confirm that the data is being loaded and rendered.
    expect(page.locator("#proveedoresTableBody tr")).to_have_count(1, timeout=10000)

    # 3. Screenshot: Capture the page for visual verification.
    page.screenshot(path="jules-scratch/verification/simple_load.png")

# Boilerplate to run the test
if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        test_simple_load(page)
        browser.close()
