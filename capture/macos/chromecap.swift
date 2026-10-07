// Captures the Chrome for Testing window (with its native sheet) as a heavily
// pixelated layout image, only if no other app's window overlaps it.
import AppKit
typealias CreateImageFn = @convention(c) (CGRect, UInt32, UInt32, UInt32) -> Unmanaged<CGImage>?
let cgh = dlopen("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics", RTLD_NOW)
let createImage = unsafeBitCast(dlsym(cgh, "CGWindowListCreateImage"), to: CreateImageFn.self)
let out = CommandLine.arguments[1]
let info = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
func rect(_ w: [String: Any]) -> CGRect { var b = CGRect.zero; if let d = w[kCGWindowBounds as String] as? NSDictionary { CGRectMakeWithDictionaryRepresentation(d, &b) }; return b }
func owner(_ w: [String: Any]) -> String { w[kCGWindowOwnerName as String] as? String ?? "" }
// the largest normal-layer CFT window
let cft = info.filter { owner($0).contains("Chrome for Testing") && (($0[kCGWindowLayer as String] as? NSNumber)?.intValue ?? 1) == 0 }.max { rect($0).width * rect($0).height < rect($1).width * rect($1).height }
guard let win = cft else { print("no CFT window"); exit(1) }
let r = rect(win)
print("CFT window bounds \(r)")
for w in info {
  if (w[kCGWindowNumber as String] as? NSNumber) == (win[kCGWindowNumber as String] as? NSNumber) { break }
  let o = owner(w); let a = (w[kCGWindowAlpha as String] as? NSNumber)?.doubleValue ?? 1
  if a > 0.01 && rect(w).intersects(r) && !o.contains("Chrome for Testing") && !o.localizedCaseInsensitiveContains("Open and Save") { print("unsafe: \(o) overlaps"); exit(2) }
}
guard let img = createImage(r, 1, 0, 16)?.takeRetainedValue() else { print("capture failed"); exit(3) }
let k = 6
let small = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: img.width / k, pixelsHigh: img.height / k, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: small)
NSImage(cgImage: img, size: .zero).draw(in: NSRect(x: 0, y: 0, width: small.pixelsWide, height: small.pixelsHigh))
NSGraphicsContext.restoreGraphicsState()
try! small.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
print("saved \(small.pixelsWide)x\(small.pixelsHigh) (1/\(k) of \(img.width)x\(img.height))")
