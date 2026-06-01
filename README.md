# EchoLog

EchoLog is a powerful, lightweight Chrome extension designed to seamlessly capture and log background API traffic. Built for developers, product managers, and QA engineers, it acts as a dedicated logging panel that lets you monitor, format, and copy XHR/Fetch payloads and responses instantly—without ever needing to open the native browser DevTools.

## Installation Guide

To install EchoLog on your browser, follow these steps:
1. Open Google Chrome and navigate to `chrome://extensions/` in your address bar.
2. In the top right corner, toggle on **Developer mode**.
3. Click the **Load unpacked** button that appears in the top left.
4. Select the `Echolog_extension` folder (the directory containing this README file).
5. EchoLog will now appear in your extensions list. We recommend pinning it to your toolbar for quick access!

## Initial Setup

By design, EchoLog is highly optimized and respects your privacy by only tracking traffic on domains you explicitly allow.

1. Click the EchoLog icon in your Chrome toolbar to open the extension popup.
2. Click the **Domains** button in the top right corner of the popup toolbar.
3. In the Settings modal, enter the domains you want to monitor (one per line). 
   - *Example:* `localhost` or `example.com`
4. Click **Save**.
5. Navigate to your target website and **Refresh the page**. You will see a small banner confirming that EchoLog has attached to the browser. 
6. Start interacting with the page, and your API calls will automatically populate the timeline!

## Key Features
- **Silent Background Logging:** Automatically captures API traffic in the background for your allowed domains.
- **Timeline View:** A clean, sequential timeline of all network events as you navigate through your app.
- **Instant Formatting:** Automatically parses and pretty-prints JSON payloads and responses for effortless reading.
- **One-Click Copy:** Easily copy headers, payloads, and responses directly to your clipboard.
- **Smart Filtering:** Filter by endpoints and instantly toggle between data APIs (Fetch/XHR) and static assets.

## About the Creator

Created and designed by **Mohammed Sannan**.

If you found this tool helpful, have any feedback, or just want to connect, I would love to hear from you!

🔗 **[Connect with me on LinkedIn](https://www.linkedin.com/in/mohammedsannan/)**
