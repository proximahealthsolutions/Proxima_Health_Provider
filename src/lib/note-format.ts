const ALLOWED_TAGS = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "P",
  "BR",
  "UL",
  "OL",
  "LI",
  "H2",
  "H3",
  "BLOCKQUOTE",
  "DIV",
  "SPAN",
]);

const ALLOWED_STYLES = new Set(["font-size", "font-family", "text-align", "color"]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeStyle(style: string) {
  return style
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const [rawName, ...rawValue] = rule.split(":");
      const name = rawName?.trim().toLowerCase();
      const value = rawValue.join(":").trim();
      if (!name || !value || !ALLOWED_STYLES.has(name)) return "";
      if (/url|expression|javascript/i.test(value)) return "";
      return `${name}: ${value}`;
    })
    .filter(Boolean)
    .join("; ");
}

export function sanitizeClinicalNoteHtml(value?: string | null) {
  if (!value) return "";
  if (typeof window === "undefined" || !value.includes("<")) {
    return escapeHtml(value).replace(/\n/g, "<br />");
  }

  const doc = new DOMParser().parseFromString(value, "text/html");
  doc.body.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach((node) => node.remove());

  function clean(node: Node) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;
        if (!ALLOWED_TAGS.has(element.tagName)) {
          element.replaceWith(...Array.from(element.childNodes));
          return;
        }

        Array.from(element.attributes).forEach((attr) => {
          if (attr.name === "style") {
            const safeStyle = sanitizeStyle(attr.value);
            if (safeStyle) element.setAttribute("style", safeStyle);
            else element.removeAttribute("style");
          } else {
            element.removeAttribute(attr.name);
          }
        });
      }
      clean(child);
    });
  }

  clean(doc.body);
  return doc.body.innerHTML;
}

export function clinicalNotePreview(value?: string | null, maxLength = 180) {
  if (!value) return "No note content.";
  const text =
    typeof window === "undefined"
      ? value.replace(/<[^>]+>/g, " ")
      : new DOMParser().parseFromString(value, "text/html").body.textContent ?? value;
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}...` : normalized;
}
