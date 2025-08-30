import os
from playwright.sync_api import sync_playwright, Page, expect

def test_delete_modal_server(page: Page):
    """
    This test verifies that the delete confirmation modal appears
    when the delete button is clicked on the proveedores page,
    when served from a local web server.
    """
    try:
        # 1. Arrange: Go to the proveedores.html page served by the local server.
        page.goto("http://localhost:8000/proveedores.html")

        # 2. Act: Find the first delete button and click it.
        # We need to wait for the table to be populated.
        page.wait_for_selector("#proveedoresTableBody tr")

        first_delete_button = page.locator('button[title="Eliminar Proveedor"]').first
        first_delete_button.click()

        # 3. Assert: Confirm the modal is visible.
        confirm_modal = page.locator("#confirmDeleteModal")
        expect(confirm_modal).to_be_visible()

        # 4. Screenshot: Capture the modal for visual verification.
        page.screenshot(path="jules-scratch/verification/delete_modal.png")
    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

# Boilerplate to run the test
if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        test_delete_modal_server(page)
        browser.close()
