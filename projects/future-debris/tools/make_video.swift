// make_video.swift —— 把 PNG 帧序列编码成 H.264 MP4（macOS AVFoundation）。
//
// 为什么要自己写：Godot 的 Movie Maker 只能输出 **MJPEG-AVI** 或 **PNG 序列**，
// 本机没有 ffmpeg，而 macOS 自带的 avconvert 读不了 Godot 的 MJPEG-AVI
// （fourcc/索引不兼容）。Xcode 的 AVFoundation 是系统自带能力，直接用它编码最稳。
//
// 编译：swiftc -O tools/make_video.swift -o tools/make_video
// 用法：tools/make_video <帧目录> <输出.mp4> <fps> [宽] [高]
//       帧目录里按文件名排序读取 frame_*.png
// 另有一个子命令用于验收：tools/make_video --probe <视频.mp4>  打印时长/尺寸/码率

import AVFoundation
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(("[make_video] " + message + "\n").data(using: .utf8)!)
    exit(1)
}

func listFrames(_ dir: String) -> [String] {
    let fm = FileManager.default
    guard let names = try? fm.contentsOfDirectory(atPath: dir) else {
        fail("无法读取帧目录：\(dir)")
    }
    return names
        .filter { $0.lowercased().hasSuffix(".png") || $0.lowercased().hasSuffix(".jpg") }
        .sorted()
        .map { dir + "/" + $0 }
}

/// 把一帧图片画进 CVPixelBuffer（等比缩放居中，留黑边）
func makePixelBuffer(from image: CGImage, pool: CVPixelBufferPool,
                     width: Int, height: Int) -> CVPixelBuffer? {
    var maybeBuffer: CVPixelBuffer?
    guard CVPixelBufferPoolCreatePixelBuffer(nil, pool, &maybeBuffer) == kCVReturnSuccess,
          let buffer = maybeBuffer else { return nil }
    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
    guard let base = CVPixelBufferGetBaseAddress(buffer) else { return nil }
    let bytesPerRow = CVPixelBufferGetBytesPerRow(buffer)
    let bitmapInfo = CGImageAlphaInfo.premultipliedFirst.rawValue
        | CGBitmapInfo.byteOrder32Little.rawValue
    guard let ctx = CGContext(data: base, width: width, height: height,
                              bitsPerComponent: 8, bytesPerRow: bytesPerRow,
                              space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: bitmapInfo) else { return nil }
    ctx.setFillColor(CGColor(red: 0.043, green: 0.071, blue: 0.125, alpha: 1.0))
    ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
    ctx.interpolationQuality = .high
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    return buffer
}

func encode(framesDir: String, output: String, fps: Int, forcedW: Int, forcedH: Int) -> Never {
    let frames = listFrames(framesDir)
    guard !frames.isEmpty else { fail("帧目录里没有图片：\(framesDir)") }
    guard let firstSource = CGImageSourceCreateWithURL(URL(fileURLWithPath: frames[0]) as CFURL, nil),
          let firstImage = CGImageSourceCreateImageAtIndex(firstSource, 0, nil) else {
        fail("无法读取首帧：\(frames[0])")
    }
    let width = forcedW > 0 ? forcedW : firstImage.width
    let height = forcedH > 0 ? forcedH : firstImage.height
    print("[make_video] \(frames.count) 帧 → \(output)（\(width)×\(height) @ \(fps)fps）")

    let url = URL(fileURLWithPath: output)
    try? FileManager.default.removeItem(at: url)
    guard let writer = try? AVAssetWriter(outputURL: url, fileType: .mp4) else {
        fail("无法创建 AVAssetWriter（输出路径是否可写？）")
    }
    let bitrate = max(2_000_000, width * height * fps / 8)   // 约 1 bit/像素/帧
    let settings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: bitrate,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
            AVVideoMaxKeyFrameIntervalKey: fps * 2,
        ],
    ]
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    input.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: input,
        sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: width,
            kCVPixelBufferHeightKey as String: height,
        ])
    guard writer.canAdd(input) else { fail("writer 不接受该输入配置") }
    writer.add(input)
    guard writer.startWriting() else {
        fail("startWriting 失败：\(writer.error?.localizedDescription ?? "未知错误")")
    }
    writer.startSession(atSourceTime: .zero)
    guard let pool = adaptor.pixelBufferPool else { fail("无法创建像素缓冲池") }

    var index = 0
    for path in frames {
        guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
            fail("无法读取帧：\(path)")
        }
        while !input.isReadyForMoreMediaData {
            Thread.sleep(forTimeInterval: 0.004)
        }
        guard let buffer = makePixelBuffer(from: image, pool: pool, width: width, height: height) else {
            fail("无法创建像素缓冲：\(path)")
        }
        let time = CMTime(value: CMTimeValue(index), timescale: CMTimeScale(fps))
        if !adaptor.append(buffer, withPresentationTime: time) {
            fail("写入第 \(index) 帧失败：\(writer.error?.localizedDescription ?? "未知错误")")
        }
        index += 1
        if index % 300 == 0 {
            print("  ... 已写入 \(index)/\(frames.count) 帧")
        }
    }
    input.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting { semaphore.signal() }
    semaphore.wait()
    if writer.status != .completed {
        fail("编码未完成：\(writer.error?.localizedDescription ?? "未知错误")")
    }
    let size = (try? FileManager.default.attributesOfItem(atPath: output)[.size] as? Int) ?? 0
    print(String(format: "[make_video] 完成：%@（%.1f MB，%.1f 秒）",
                 output, Double(size ?? 0) / 1_048_576.0, Double(frames.count) / Double(fps)))
    exit(0)
}

func probe(_ path: String) -> Never {
    let asset = AVURLAsset(url: URL(fileURLWithPath: path))
    let semaphore = DispatchSemaphore(value: 0)
    var duration = 0.0
    var size = CGSize.zero
    var fps = 0.0
    Task {
        if let d = try? await asset.load(.duration) { duration = CMTimeGetSeconds(d) }
        if let tracks = try? await asset.loadTracks(withMediaType: .video), let track = tracks.first {
            if let s = try? await track.load(.naturalSize) { size = s }
            if let r = try? await track.load(.nominalFrameRate) { fps = Double(r) }
        }
        semaphore.signal()
    }
    semaphore.wait()
    let attrs = try? FileManager.default.attributesOfItem(atPath: path)
    let bytes = (attrs?[.size] as? Int) ?? 0
    print(String(format: "文件：%@\n时长：%.2f 秒\n尺寸：%.0f×%.0f\n帧率：%.2f fps\n大小：%.2f MB",
                 path, duration, size.width, size.height, fps, Double(bytes) / 1_048_576.0))
    exit(0)
}

/// 抽帧核对：make_video --frames <视频> <输出目录> <秒,秒,...>
func extractFrames(_ path: String, _ outDir: String, _ stamps: [Double]) -> Never {
    let asset = AVURLAsset(url: URL(fileURLWithPath: path))
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.requestedTimeToleranceBefore = .zero
    generator.requestedTimeToleranceAfter = .zero
    try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
    for stamp in stamps {
        let time = CMTime(seconds: stamp, preferredTimescale: 600)
        guard let cg = try? generator.copyCGImage(at: time, actualTime: nil) else {
            print("  [skip] \(stamp)s 取帧失败")
            continue
        }
        let name = String(format: "%@/t%06.1f.png", outDir, stamp)
        let url = URL(fileURLWithPath: name)
        guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
            fail("无法创建输出：\(name)")
        }
        CGImageDestinationAddImage(dest, cg, nil)
        CGImageDestinationFinalize(dest)
        print("  已抽帧 \(stamp)s → \(name)")
    }
    exit(0)
}

let args = CommandLine.arguments
if args.count >= 3 && args[1] == "--probe" {
    probe(args[2])
}
if args.count >= 5 && args[1] == "--frames" {
    let stamps = args[4].split(separator: ",").compactMap { Double($0) }
    extractFrames(args[2], args[3], stamps)
}
guard args.count >= 4 else {
    fail("用法：make_video <帧目录> <输出.mp4> <fps> [宽] [高] ｜ make_video --probe <视频.mp4>")
}
let fps = Int(args[3]) ?? 30
encode(framesDir: args[1],
       output: args[2],
       fps: fps,
       forcedW: args.count > 4 ? (Int(args[4]) ?? 0) : 0,
       forcedH: args.count > 5 ? (Int(args[5]) ?? 0) : 0)
