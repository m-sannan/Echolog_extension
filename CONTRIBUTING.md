# Contributing to EchoLog

First off, thank you for considering contributing to EchoLog! It's people like you that make open source such a great community to learn, inspire, and create.

## How to Contribute

### 1. Set Up Locally
1. Fork the repository on GitHub.
2. Clone your fork locally: `git clone https://github.com/YOUR-USERNAME/Echolog_extension.git`
3. Open Chrome and navigate to `chrome://extensions/`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the cloned directory.

### 2. Make Changes
- We use Vanilla HTML, CSS, and JS to keep the extension extremely lightweight and fast.
- The UI is styled with a clean, modern pill-shaped aesthetic and specific color variables defined at the top of `popup.html`. Please try to maintain this design language!
- Ensure that you are not adding any unnecessary permissions to `manifest.json`.

### 3. Test Your Changes
Refresh the extension in Chrome (`chrome://extensions/`) and test your updates on a local or public API to ensure the logging (or your new feature) works as expected.

### 4. Submit a Pull Request
- Create a new branch: `git checkout -b feature/your-feature-name`
- Commit your changes with a clear commit message.
- Push the branch to your fork.
- Open a Pull Request from your fork to our `main` branch.

## Getting Help
If you need any help or want to discuss a major feature before building it, feel free to open an issue or reach out to the creator directly!
