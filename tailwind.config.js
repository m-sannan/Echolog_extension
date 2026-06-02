/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "inverse-primary": "#00e639", "surface-container-lowest": "#ffffff", "outline": "#6b7c65",
        "inverse-on-surface": "#f0f1f2", "surface-container-low": "#f3f4f5", "on-tertiary-container": "#5a616f",
        "surface-tint": "#006e16", "on-secondary-fixed": "#1b1b1b", "on-primary-container": "#002203",
        "on-secondary-container": "#646464", "secondary-container": "#e2e2e2", "primary-fixed": "#72ff70",
        "error": "#ba1a1a", "on-surface-variant": "#3b4b37", "surface-variant": "#e1e3e4",
        "background": "#f8f9fa", "outline-variant": "#d1d5db", "secondary-fixed": "#e2e2e2",
        "surface-container-high": "#e7e8e9", "on-error-container": "#93000a", "on-primary": "#ffffff",
        "on-background": "#191c1d", "tertiary": "#585f6c", "primary": "#006e16",
        "surface-container": "#edeeef", "surface-dim": "#f3f4f5", "surface": "#f8f9fa",
        "tertiary-fixed": "#dce2f3", "on-tertiary-fixed-variant": "#404754", "on-tertiary": "#ffffff",
        "on-primary-fixed-variant": "#00530e", "secondary-fixed-dim": "#c6c6c6", "tertiary-container": "#d6dded",
        "on-error": "#ffffff", "primary-fixed-dim": "#00e639", "on-secondary-fixed-variant": "#474747",
        "secondary": "#5e5e5e", "on-secondary": "#ffffff", "on-surface": "#191c1d",
        "surface-bright": "#f8f9fa", "on-primary-fixed": "#002203", "error-container": "#ffdad6",
        "tertiary-fixed-dim": "#c0c7d6", "surface-container-highest": "#e1e3e4", "primary-container": "#00ff41",
        "inverse-surface": "#2e3132", "on-tertiary-fixed": "#151c27"
      },
      fontFamily: {
        "headline-md": ["Geist"], "label-sm": ["Geist"], "code-md": ["JetBrains Mono"],
        "body-lg": ["Geist"], "headline-lg": ["Geist"], "body-md": ["Geist"],
        "code-sm": ["JetBrains Mono"], "label-caps": ["JetBrains Mono"],
        "headline-sm": ["Geist"], "body-sm": ["Geist"]
      },
      fontSize: {
        "code-sm": ["11px", {"lineHeight": "16px", "fontWeight": "400"}],
        "label-caps": ["10px", {"lineHeight": "12px", "letterSpacing": "0.05em", "fontWeight": "700"}],
        "headline-sm": ["18px", {"lineHeight": "24px", "fontWeight": "600"}],
        "body-sm": ["12px", {"lineHeight": "16px", "fontWeight": "400"}]
      }
    }
  }
}
