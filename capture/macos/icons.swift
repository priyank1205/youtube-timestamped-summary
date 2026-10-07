// Exports the real macOS 26 artwork the folder picker uses: SF Symbols (as
// white-on-transparent masks with their alignment metrics) and Finder file icons.
//   icons <outDir>
import AppKit
import UniformTypeIdentifiers

let outDir = CommandLine.arguments[1]
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

func writePNG(_ rep: NSBitmapImageRep, _ name: String) {
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: outDir + "/" + name + ".png"))
}

func bitmap(_ w: Int, _ h: Int) -> NSBitmapImageRep {
  NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .calibratedRGB, bytesPerRow: 0, bitsPerPixel: 0)!
}

// Private symbols (Finder's sidebar uses some) need AppKit's private constructor.
func symbol(_ name: String) -> NSImage? {
  if let i = NSImage(systemSymbolName: name, accessibilityDescription: nil) { return i }
  for sel in ["_imageWithPrivateSystemSymbolName:accessibilityDescription:", "imageWithPrivateSystemSymbolName:accessibilityDescription:"] {
    let s = NSSelectorFromString(sel)
    if NSImage.responds(to: s), let r = NSImage.perform(s, with: name, with: nil)?.takeUnretainedValue() as? NSImage { return r }
  }
  return nil
}

// Draw a symbol at `pt` points, `scale`x, white, into a canvas padded around its
// bounds; report where its alignment rect sits so layout can match AppKit's.
var meta: [String: Any] = [:]
func exportSymbol(_ name: String, pt: CGFloat, weight: NSFont.Weight = .regular, scale: CGFloat = 8, file: String? = nil) {
  guard let base = symbol(name) else { print("missing symbol \(name)"); return }
  let cfg = NSImage.SymbolConfiguration(pointSize: pt, weight: weight, scale: .medium)
  guard let img = base.withSymbolConfiguration(cfg) else { return }
  let size = img.size
  let ar = img.alignmentRect
  let w = Int(ceil(size.width * scale)), h = Int(ceil(size.height * scale))
  let rep = bitmap(w, h)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  let tinted = NSImage(size: size, flipped: false) { r in
    img.draw(in: r)
    NSColor.white.set()
    r.fill(using: .sourceAtop)
    return true
  }
  tinted.draw(in: NSRect(x: 0, y: 0, width: w, height: h))
  NSGraphicsContext.restoreGraphicsState()
  let key = file ?? name
  writePNG(rep, "sym-" + key)
  meta[key] = ["pt": pt, "w": size.width, "h": size.height, "align": [ar.minX, ar.minY, ar.width, ar.height]]
}

// Sidebar (13 pt body text, symbols at the sidebar's medium size)
for n in ["clock", "folder.badge.person.crop", "appstore", "arrow.down.circle", "folder", "doc", "document", "menubar.dock.rectangle", "icloud", "house", "desktopcomputer", "compass.drawing", "internaldrive", "network"] {
  exportSymbol(n, pt: 15)
}
// Toolbar
for n in ["chevron.left", "chevron.right", "rectangle.split.3x1", "square.grid.3x1.below.line.grid.1x2", "square.grid.3x2", "chevron.down", "chevron.up.chevron.down", "magnifyingglass", "list.bullet", "rectangle.grid.2x2", "square.grid.2x2"] {
  exportSymbol(n, pt: 13)
}
exportSymbol("chevron.right", pt: 10, weight: .regular, file: "chevron.right.small")
exportSymbol("chevron.down", pt: 9, weight: .bold, file: "chevron.down.small")

// File icons from Finder, at 256 px.
func exportIcon(_ img: NSImage, _ name: String, px: Int = 256) {
  let rep = bitmap(px, px)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  img.draw(in: NSRect(x: 0, y: 0, width: px, height: px))
  NSGraphicsContext.restoreGraphicsState()
  writePNG(rep, "icon-" + name)
}
let ws = NSWorkspace.shared
exportIcon(ws.icon(for: .folder), "folder")
exportIcon(ws.icon(forFile: NSHomeDirectory() + "/Downloads"), "downloads")
exportIcon(ws.icon(for: .zip), "zip")
exportIcon(ws.icon(for: .json), "json")
exportIcon(ws.icon(for: .plainText), "text")
exportIcon(ws.icon(for: .data), "data")
exportIcon(ws.icon(forFile: "/Library"), "library")
exportIcon(ws.icon(for: .pdf), "pdf")
exportIcon(ws.icon(for: .heic), "heic")
exportIcon(ws.icon(for: .jpeg), "jpeg")
exportIcon(ws.icon(for: .png), "png")
exportIcon(ws.icon(forFile: "/System"), "system")
exportIcon(ws.icon(forFile: "/Users"), "users")
// small-size reps matter: a 16 pt icon has its own artwork
exportIcon(ws.icon(for: .folder), "folder-32", px: 32)
exportIcon(ws.icon(for: .folder), "folder-64", px: 64)
exportIcon(ws.icon(for: .zip), "zip-64", px: 64)
exportIcon(ws.icon(for: .json), "json-64", px: 64)
exportIcon(ws.icon(for: .plainText), "text-64", px: 64)
exportIcon(ws.icon(forFile: NSHomeDirectory() + "/Downloads"), "downloads-64", px: 64)

let data = try! JSONSerialization.data(withJSONObject: meta, options: [.prettyPrinted, .sortedKeys])
try! data.write(to: URL(fileURLWithPath: outDir + "/symbols.json"))
print("done")
