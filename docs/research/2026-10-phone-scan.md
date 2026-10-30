# Phone card scan (G5): approach, Oct 29 2026

Goal: open the site on a phone, point at a card, get live framing hints, auto-capture front and back at full resolution, run the condition check.

## Options looked at
| Option | What it is | Verdict |
|---|---|---|
| scanic (MIT, ~100 KB, Rust/WASM, Canny + contour) | Browser document-corner detection, built for repeated frames | **Chosen** for live corner detection on a 640 px preview |
| jscanify (OpenCV.js) | Same idea on OpenCV.js | ~31 MB download, ~200 ms per warp: too heavy for a phone loop |
| Dynamsoft Document Normalizer | Commercial SDK with auto-capture | Paid licence; not needed |
| ML card segmentation (jslok/card-scanner, RTM-Det) | Robust on glare/busy backgrounds | Python/TFLite proof of concept; overkill for one card on a dark mat |
| `<input capture>` camera | Native camera, full sensor resolution | No live guidance; kept as the existing upload path |

## Camera facts that shaped it
- iOS Safari historically gives 720p video from getUserMedia; ask for 4K with `ideal` and read back what you get.
- `ImageCapture.takePhoto()` (full sensor still) is supported on Chrome Android and Safari 18.4+; fall back to the video frame elsewhere.
- Glare check counts solid blown-out patches (16x16 grid cells mostly >= 250), not bright pixels: foil parallels (sparkle, mojo) are full of bright specks.

## Sources
- scanic README: https://cdn.jsdelivr.net/npm/scanic@1.0.8/README.md
- OpenCV.js web scanner: https://dynamsoft.com/codepool/web-document-scanner-with-opencvjs.html
- ImageCapture.takePhoto support: https://caniuse.com/mdn-api_imagecapture_takephoto
- iOS getUserMedia resolution thread: https://developer.apple.com/forums/thread/113532
- Browser pre-grading approach (vendor blog): https://pregradecards.com/blog/card-scanner-app-no-download-browser-grading-2026
- ML card scanner: https://github.com/jslok/card-scanner
