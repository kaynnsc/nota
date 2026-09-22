// Uses the browser's built-in Contact Picker API — no app, no plugin, no server.
// Currently only supported on Chrome/Chromium-based browsers on Android, over HTTPS.
// Feature-detected: contactPickerSupported() returns false everywhere else,
// so the "pick from contacts" button simply doesn't show up on unsupported browsers.

export function contactPickerSupported() {
  return typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
}

/**
 * Opens the device's native contact picker (a real OS UI, not anything we build).
 * Returns { name, phone } for the picked contact, or null if cancelled/unsupported/denied.
 */
export async function pickContact() {
  if (!contactPickerSupported()) return null;
  try {
    const results = await navigator.contacts.select(["name", "tel"], { multiple: false });
    if (!results || results.length === 0) return null;
    const c = results[0];
    return {
      name: (c.name && c.name[0]) || "",
      phone: (c.tel && c.tel[0]) || "",
    };
  } catch (e) {
    // user cancelled, or permission denied — either way, just no result
    return null;
  }
}
