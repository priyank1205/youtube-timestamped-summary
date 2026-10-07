// Reference captures of the real NSOpenPanel sheet, configured the way Chrome's
// "Load unpacked" configures it. The panel's contents are drawn out of process
// and only appear in a screen capture, so we capture the panel's own rectangle,
// and only when no other app's window overlaps it.
//   panelcap3 anim <dark|light> <dir> <outPrefix>
//   panelcap3 shot <dark|light> <dir> <outPrefix> [private]
// "private" keeps only the panel's sidebar, toolbar and bottom bar, plus a heavily
// pixelated whole, so a real folder's contents are never stored.
import AppKit
import Foundation

setvbuf(stdout, nil, _IOLBF, 0)
let args = CommandLine.arguments.filter { !$0.hasPrefix("-") && !$0.hasPrefix("{") }
let mode = args.count > 1 ? args[1] : "shot"
let dark = args.count > 2 && args[2] == "dark"
let dir = args.count > 3 ? args[3] : NSHomeDirectory()
let out = args.count > 4 ? args[4] : "/tmp/panel"
let privateMode = args.count > 5 && args[5] == "private"

typealias CreateImageFn = @convention(c) (CGRect, UInt32, UInt32, UInt32) -> Unmanaged<CGImage>?
let cgh = dlopen("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics", RTLD_NOW)
let createImage = unsafeBitCast(dlsym(cgh, "CGWindowListCreateImage"), to: CreateImageFn.self)

func savePNG(_ img: CGImage, _ path: String) {
  try! NSBitmapImageRep(cgImage: img).representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
}

class App: NSObject, NSApplicationDelegate {
  var window: NSWindow!
  var panel: NSOpenPanel!
  var frames: [(Double, CGImage)] = []
  var t0 = Date()

  func applicationDidFinishLaunching(_ n: Notification) {
    NSApp.appearance = NSAppearance(named: dark ? .darkAqua : .aqua)
    let screen = NSScreen.main!.visibleFrame
    let w: CGFloat = 1300, h: CGFloat = 760
    window = NSWindow(contentRect: NSRect(x: screen.midX - w / 2, y: screen.midY - h / 2, width: w, height: h),
                      styleMask: [.titled, .closable, .resizable, .miniaturizable], backing: .buffered, defer: false)
    window.title = ""
    window.makeKeyAndOrderFront(nil)
    NSApp.activate(ignoringOtherApps: true)
    _ = createImage(CGRect(x: 0, y: 0, width: 4, height: 4), 1, 0, 0) // warm up
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { self.open() }
  }

  // The rectangle the sheet will occupy (global, top-left origin), plus a margin.
  func captureRect(_ margin: CGFloat) -> CGRect {
    let mainH = NSScreen.screens[0].frame.height
    let f = panel.frame
    return CGRect(x: f.minX - margin, y: mainH - f.maxY - margin, width: f.width + 2 * margin, height: f.height + 2 * margin)
  }

  // True only if every window in front of our parent window misses `r`.
  func safe(_ r: CGRect) -> Bool {
    let info = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
    for w in info {
      let id = (w[kCGWindowNumber as String] as? NSNumber)?.uint32Value ?? 0
      if id == CGWindowID(window.windowNumber) { return true }
      var b = CGRect.zero
      if let d = w[kCGWindowBounds as String] as? NSDictionary { CGRectMakeWithDictionaryRepresentation(d, &b) }
      let alpha = (w[kCGWindowAlpha as String] as? NSNumber)?.doubleValue ?? 1
      if alpha > 0.01 && b.intersects(r) {
        let owner = w[kCGWindowOwnerName as String] as? String ?? "?"
        let pid = (w[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value ?? 0
        // The panel's own contents are hosted by the system's open/save panel service.
        if owner.localizedCaseInsensitiveContains("Open and Save") || owner.localizedCaseInsensitiveContains("openAndSave") || pid == ProcessInfo.processInfo.processIdentifier { continue }
        print("unsafe: window \(id) of \(owner) overlaps the capture (bounds \(b))"); return false
      }
    }
    print("unsafe: our window is not in the on-screen list")
    return false
  }

  func parentRect() -> CGRect {
    let mainH = NSScreen.screens[0].frame.height
    let f = window.frame
    return CGRect(x: f.minX, y: mainH - f.maxY, width: f.width, height: f.height)
  }
  func open() {
    if mode == "anim" && !safe(parentRect()) { NSApp.terminate(nil); return }
    panel = NSOpenPanel()
    panel.canChooseFiles = false
    panel.canChooseDirectories = true
    panel.canCreateDirectories = true
    panel.allowsMultipleSelection = false
    panel.prompt = "Select"
    panel.message = "Select the extension directory."
    panel.directoryURL = URL(fileURLWithPath: dir)
    t0 = Date()
    panel.beginSheetModal(for: window) { _ in }
    if mode == "anim" {
      let r = parentRect()
      func grab() {
        let t = Date().timeIntervalSince(t0)
        if let img = createImage(r, 1, 0, 16) { frames.append((t, img.takeRetainedValue())) }
        if t < 0.9 { DispatchQueue.main.async { grab() } } else { finishAnim() }
      }
      grab()
    } else {
      DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { self.shot() }
    }
  }

  func finishAnim() {
    if safe(parentRect()) {
      for (i, (t, img)) in frames.enumerated() { savePNG(img, String(format: "%@-anim-%03d-%04.0fms.png", out, i, t * 1000)) }
    }
    print("anim frames: \(frames.count); panel \(panel.frame) parent \(window.frame)")
    dismiss()
  }

  func shot() {
    let margin: CGFloat = 24
    let r = captureRect(margin)
    print("panel \(panel.frame) parent \(window.frame) capture \(r)")
    guard safe(r), let img = createImage(r, 1, 0, 8)?.takeRetainedValue() else { print("no capture"); dismiss(); return }
    let s = CGFloat(img.width) / r.width
    let pf = panel.frame
    print(String(format: "scale %.1f; panel at px (%.0f, %.0f) size %.0fx%.0f", s, margin * s, margin * s, pf.width * s, pf.height * s))
    if privateMode {
      func crop(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ name: String) {
        if let c = img.cropping(to: CGRect(x: (margin + x) * s, y: (margin + y) * s, width: w * s, height: h * s)) { savePNG(c, out + "-" + name + ".png") }
      }
      crop(0, 0, 176, pf.height, "sidebar")
      crop(176, 0, pf.width - 176, 62, "toolbar")
      crop(176, pf.height - 64, pf.width - 176, 64, "bottom")
      // structure only: 1/14 scale, nothing legible
      let k: CGFloat = 14
      let small = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(pf.width * s / k), pixelsHigh: Int(pf.height * s / k), bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
      NSGraphicsContext.saveGraphicsState()
      NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: small)
      NSGraphicsContext.current?.imageInterpolation = .high
      if let c = img.cropping(to: CGRect(x: margin * s, y: margin * s, width: pf.width * s, height: pf.height * s)) {
        NSImage(cgImage: c, size: .zero).draw(in: NSRect(x: 0, y: 0, width: small.pixelsWide, height: small.pixelsHigh))
      }
      NSGraphicsContext.restoreGraphicsState()
      try? small.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out + "-structure.png"))
    } else {
      savePNG(img, out + ".png")
    }
    dismiss()
  }

  func dismiss() {
    NSApp.endSheet(panel)
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { NSApp.terminate(nil) }
  }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = App()
app.delegate = delegate
app.run()
