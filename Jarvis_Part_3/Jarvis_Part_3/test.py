from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By
import time

# Path to msedgedriver.exe
edge_driver_path = r"msedgedriver.exe"

# Start Edge browser
service = Service(edge_driver_path)
driver = webdriver.Edge(service=service)

# Open a website
driver.get("https://www.google.com")

# Wait a bit
time.sleep(2)

# Example: Search something
search_box = driver.find_element(By.NAME, "q")
search_box.send_keys("Python automation with Edge")
search_box.submit()

time.sleep(5)

# Close browser
driver.quit()
