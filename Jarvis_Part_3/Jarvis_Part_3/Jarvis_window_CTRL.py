import os
import subprocess
import logging
import sys
import asyncio
from fuzzywuzzy import process

try:
    from livekit.agents import function_tool
except ImportError:
    def function_tool(func): 
        return func

try:
    import win32gui
    import win32con
except ImportError:
    win32gui = None
    win32con = None

try:
    import pygetwindow as gw
except ImportError:
    gw = None

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.edge.service import Service
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
except ImportError:
    webdriver = None

# Setup encoding and logger
sys.stdout.reconfigure(encoding='utf-8')
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global browser driver instance (can be Edge or Chrome)
browser_driver = None

# Website shortcuts
WEBSITE_MAPPINGS = {
    "youtube": "https://www.youtube.com",
    "google": "https://www.google.com",
    "facebook": "https://www.facebook.com",
    "instagram": "https://www.instagram.com",
    "twitter": "https://www.twitter.com",
    "netflix": "https://www.netflix.com",
    "amazon": "https://www.amazon.com",
    "github": "https://www.github.com",
    "whatsapp": "https://web.whatsapp.com",
    "gmail": "https://mail.google.com"
}

# App command map
APP_MAPPINGS = {
    "notepad": "notepad",
    "calculator": "calc",
    "chrome": "chrome",
    "edge": "msedge",
    "vlc": "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe",
    "command prompt": "cmd",
    "edge": "msedge",
    "control panel": "control",
    "settings": "start ms-settings:",
    "paint": "mspaint",
    "vs code": "C:\\Users\\gaura\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
    "postman": "C:\\Users\\gaura\\AppData\\Local\\Postman\\Postman.exe"
}

# -------------------------
# Global focus utility
# -------------------------
async def focus_window(title_keyword: str) -> bool:
    if not gw:
        logger.warning("⚠ pygetwindow")
        return False

    await asyncio.sleep(1.5)  # Give time for window to appear
    title_keyword = title_keyword.lower().strip()

    for window in gw.getAllWindows():
        if title_keyword in window.title.lower():
            if window.isMinimized:
                window.restore()
            window.activate()
            return True
    return False

# -------------------------
# Edge Web Control Functions
# -------------------------
async def init_edge_driver():
    """Initialize Edge driver using the exact working method"""
    global browser_driver
    if browser_driver is None and webdriver:
        try:
            # Use the exact same approach as your working test
            service = Service(r"msedgedriver.exe")
            browser_driver = webdriver.Edge(service=service)
            
            # Test with a simple page first
            browser_driver.get("about:blank")
            browser_driver.maximize_window()
            browser_driver.implicitly_wait(10)
            
            logger.info("✅ Edge driver initialized successfully using Service")
            return True
            
        except Exception as e:
            logger.error(f"❌ Edge initialization failed: {e}")
            if browser_driver:
                try:
                    browser_driver.quit()
                except:
                    pass
                browser_driver = None
            return False
                
    return browser_driver is not None

@function_tool
async def open_website(website_or_url: str) -> str:
    """Open a website in browser"""
    website_or_url = website_or_url.lower().strip()
    
    # Check if it's a known website
    url = WEBSITE_MAPPINGS.get(website_or_url, website_or_url)
    
    # Add https if not present
    if not url.startswith(('http://', 'https://')):
        url = f"https://www.{url}.com"
    
    if not await init_edge_driver():
        return "❌ Browser driver not available. Opening with default browser."
    
    try:
        browser_driver.get(url)
        await asyncio.sleep(2)
        return f"✅ Opened {website_or_url} in browser"
    except Exception as e:
        return f"❌ Failed to open {website_or_url}: {e}"

@function_tool
async def search_on_website(search_query: str, website: str = "google") -> str:
    """Search for something on a website"""
    if not browser_driver:
        return "❌ Browser not initialized. Please open browser first."
    
    try:
        if website.lower() == "google":
            browser_driver.get("https://www.google.com")
            await asyncio.sleep(2)
            search_box = browser_driver.find_element(By.NAME, "q")
            search_box.send_keys(search_query)
            search_box.submit()
            
        elif website.lower() == "youtube":
            browser_driver.get("https://www.youtube.com")
            await asyncio.sleep(3)
            search_box = browser_driver.find_element(By.NAME, "search_query")
            search_box.send_keys(search_query)
            search_box.submit()
            
        return f"✅ Searched for '{search_query}' on {website}"
        
    except Exception as e:
        return f"❌ Search failed: {e}"

@function_tool
async def youtube_control(action: str) -> str:
    """Control YouTube playback (play, pause, next, previous, volume up/down)"""
    if not browser_driver:
        return "❌ Browser not initialized."
    
    try:
        current_url = browser_driver.current_url
        if "youtube.com" not in current_url:
            return "❌ Not on YouTube. Please open YouTube first."
        
        action = action.lower().strip()
        
        if action in ["play", "pause", "play pause"]:
            browser_driver.find_element(By.TAG_NAME, "body").send_keys(Keys.SPACE)
            return f"✅ YouTube {action} executed"
            
        elif action in ["next", "next video"]:
            browser_driver.find_element(By.TAG_NAME, "body").send_keys(Keys.SHIFT + "n")
            return "✅ Playing next video"
            
        elif action in ["previous", "prev", "previous video"]:
            browser_driver.find_element(By.TAG_NAME, "body").send_keys(Keys.SHIFT + "p")
            return "✅ Playing previous video"
            
        elif action in ["volume up", "louder"]:
            browser_driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ARROW_UP)
            return "✅ Volume increased"
            
        elif action in ["volume down", "quieter", "lower volume"]:
            browser_driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ARROW_DOWN)
            return "✅ Volume decreased"
            
        elif action in ["mute", "unmute"]:
            browser_driver.find_element(By.TAG_NAME, "body").send_keys("m")
            return f"✅ YouTube {action} executed"
            
        elif action in ["fullscreen", "full screen"]:
            browser_driver.find_element(By.TAG_NAME, "body").send_keys("f")
            return "✅ Toggled fullscreen"
            
        elif action in ["forward", "skip forward"]:
            browser_driver.find_element(By.TAG_NAME, "body").send_keys("l")
            return "✅ Skipped forward 10 seconds"
            
        elif action in ["backward", "skip backward", "rewind"]:
            browser_driver.find_element(By.TAG_NAME, "body").send_keys("j")
            return "✅ Skipped backward 10 seconds"
            
        else:
            return f"❌ Unknown YouTube action: {action}"
            
    except Exception as e:
        return f"❌ YouTube control failed: {e}"

@function_tool
async def click_first_video() -> str:
    """Click the first video in YouTube search results"""
    if not browser_driver:
        return "❌ Browser not initialized."
    
    try:
        current_url = browser_driver.current_url
        if "youtube.com" not in current_url:
            return "❌ Not on YouTube."
        
        await asyncio.sleep(3)
        
        video_selectors = [
            "a#video-title",
            "a.ytd-video-renderer",
            "#dismissible a",
            "ytd-video-renderer a#thumbnail"
        ]
        
        for selector in video_selectors:
            try:
                video_elements = browser_driver.find_elements(By.CSS_SELECTOR, selector)
                if video_elements:
                    video_elements[0].click()
                    await asyncio.sleep(2)
                    return "✅ Playing first video"
            except:
                continue
                
        return "❌ Could not find video to play"
        
    except Exception as e:
        return f"❌ Failed to click video: {e}"

@function_tool
async def close_edge() -> str:
    """Close browser"""
    global browser_driver
    if browser_driver:
        try:
            browser_driver.quit()
            browser_driver = None
            return "✅ Browser closed"
        except Exception as e:
            return f"❌ Error closing browser: {e}"
    return "❌ Browser not running"

@function_tool
async def open_edge() -> str:
    """Open Microsoft Edge browser"""
    try:
        await asyncio.create_subprocess_shell('start "" "msedge"', shell=True)
        focused = await focus_window("edge")
        if focused:
            return "🚀 Edge launched and focused"
        else:
            return "🚀 Edge launched"
    except Exception as e:
        return f"❌ Failed to launch Edge: {e}"

# Index files/folders
async def index_items(base_dirs):
    item_index = []
    for base_dir in base_dirs:
        for root, dirs, files in os.walk(base_dir):
            for d in dirs:
                item_index.append({"name": d, "path": os.path.join(root, d), "type": "folder"})
            for f in files:
                item_index.append({"name": f, "path": os.path.join(root, f), "type": "file"})
    logger.info(f"✅ Indexed {len(item_index)} items.")
    return item_index

async def search_item(query, index, item_type):
    filtered = [item for item in index if item["type"] == item_type]
    choices = [item["name"] for item in filtered]
    if not choices:
        return None
    best_match, score = process.extractOne(query, choices)
    logger.info(f"🔍 Matched '{query}' to '{best_match}' with score {score}")
    if score > 70:
        for item in filtered:
            if item["name"] == best_match:
                return item
    return None

# File/folder actions
async def open_folder(path):
    try:
        os.startfile(path) if os.name == 'nt' else subprocess.call(['xdg-open', path])
        await focus_window(os.path.basename(path))
    except Exception as e:
        logger.error(f"❌ फ़ाइल open करने में error आया। {e}")

async def play_file(path):
    try:
        os.startfile(path) if os.name == 'nt' else subprocess.call(['xdg-open', path])
        await focus_window(os.path.basename(path))
    except Exception as e:
        logger.error(f"❌ फ़ाइल open करने में error आया।: {e}")

async def create_folder(path):
    try:
        os.makedirs(path, exist_ok=True)
        return f"✅ Folder create हो गया।: {path}"
    except Exception as e:
        return f"❌ फ़ाइल create करने में error आया।: {e}"

async def rename_item(old_path, new_path):
    try:
        os.rename(old_path, new_path)
        return f"✅ नाम बदलकर {new_path} कर दिया गया।"
    except Exception as e:
        return f"❌ नाम बदलना fail हो गया: {e}"

async def delete_item(path):
    try:
        if os.path.isdir(path):
            os.rmdir(path)
        else:
            os.remove(path)
        return f"🗑️ Deleted: {path}"
    except Exception as e:
        return f"❌ Delete नहीं हुआ।: {e}"

# App control
@function_tool
async def open(app_title: str) -> str:
    app_title = app_title.lower().strip()
    app_command = APP_MAPPINGS.get(app_title, app_title)
    try:
        await asyncio.create_subprocess_shell(f'start "" "{app_command}"', shell=True)
        focused = await focus_window(app_title)
        if focused:
            return f"🚀 App launch हुआ और focus में है: {app_title}."
        else:
            return f"🚀 {app_title} Launch किया गया, लेकिन window पर focus नहीं हो पाया।"
    except Exception as e:
        return f"❌ {app_title} Launch नहीं हो पाया।: {e}"

@function_tool
async def close(window_title: str) -> str:
    if not win32gui:
        return "❌ win32gui"

    def enumHandler(hwnd, _):
        if win32gui.IsWindowVisible(hwnd):
            if window_title.lower() in win32gui.GetWindowText(hwnd).lower():
                win32gui.PostMessage(hwnd, win32con.WM_CLOSE, 0, 0)

    win32gui.EnumWindows(enumHandler, None)
    return f"❌ Window बंद हो गई है।: {window_title}"

# Jarvis command logic
@function_tool
async def folder_file(command: str) -> str:
    folders_to_index = ["D:/"]
    index = await index_items(folders_to_index)
    command_lower = command.lower()

    if "create folder" in command_lower:
        folder_name = command.replace("create folder", "").strip()
        path = os.path.join("D:/", folder_name)
        return await create_folder(path)

    if "rename" in command_lower:
        parts = command_lower.replace("rename", "").strip().split("to")
        if len(parts) == 2:
            old_name = parts[0].strip()
            new_name = parts[1].strip()
            item = await search_item(old_name, index, "folder")
            if item:
                new_path = os.path.join(os.path.dirname(item["path"]), new_name)
                return await rename_item(item["path"], new_path)
        return "❌ rename command valid नहीं है।"

    if "delete" in command_lower:
        item = await search_item(command, index, "folder") or await search_item(command, index, "file")
        if item:
            return await delete_item(item["path"])
        return "❌ Delete करने के लिए item नहीं मिला।"

    if "folder" in command_lower or "open folder" in command_lower:
        item = await search_item(command, index, "folder")
        if item:
            await open_folder(item["path"])
            return f"✅ Folder opened: {item['name']}"
        return "❌ Folder नहीं मिला।."

    item = await search_item(command, index, "file")
    if item:
        await play_file(item["path"])
        return f"✅ File opened: {item['name']}"

    return "⚠ कुछ भी match नहीं हुआ।"
