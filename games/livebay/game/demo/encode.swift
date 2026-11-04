import Foundation
import AVFoundation
import AppKit
import CoreVideo

let args = CommandLine.arguments
guard args.count >= 4 else { fputs("usage: encode <frames_dir> <out.mp4> <fps>\n", stderr); exit(1) }
let dir = URL(fileURLWithPath: args[1])
let out = URL(fileURLWithPath: args[2])
let fps = Int32(args[3]) ?? 30
let files = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
    .filter { $0.pathExtension.lowercased() == "png" }
    .sorted { $0.lastPathComponent < $1.lastPathComponent }
guard !files.isEmpty else { fputs("no frames\n", stderr); exit(1) }

let width = 1280, height = 720
try? FileManager.default.removeItem(at: out)
let writer = try AVAssetWriter(outputURL: out, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 3_200_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoMaxKeyFrameIntervalKey: 60
    ]
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let attrs: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
    kCVPixelBufferCGImageCompatibilityKey as String: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: attrs)
writer.add(input)
guard writer.startWriting() else { fputs("startWriting failed: \(String(describing: writer.error))\n", stderr); exit(1) }
writer.startSession(atSourceTime: .zero)

var index = 0
for file in files {
    guard let image = NSImage(contentsOf: file) else { continue }
    var rect = NSRect(x: 0, y: 0, width: width, height: height)
    guard let cg = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else { continue }
    var pb: CVPixelBuffer?
    guard CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32ARGB, attrs as CFDictionary, &pb) == kCVReturnSuccess, let buffer = pb else { fputs("pixel buffer failed\n", stderr); exit(1) }
    CVPixelBufferLockBaseAddress(buffer, [])
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height,
                        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
                        space: CGColorSpaceCreateDeviceRGB(),
                        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue)!
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
    CVPixelBufferUnlockBaseAddress(buffer, [])
    while !input.isReadyForMoreMediaData { usleep(1000) }
    let time = CMTime(value: CMTimeValue(index), timescale: fps)
    if !adaptor.append(buffer, withPresentationTime: time) {
        fputs("append failed at \(index): \(String(describing: writer.error))\n", stderr); exit(1)
    }
    index += 1
}
input.markAsFinished()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }
sem.wait()
if writer.status != .completed {
    fputs("writer status \(writer.status.rawValue): \(String(describing: writer.error))\n", stderr); exit(1)
}
print("wrote \(out.path) \(index) frames @ \(fps) fps")
