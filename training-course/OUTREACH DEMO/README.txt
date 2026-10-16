STEADY HANDS - ORIGINAL SITE OVERLAY TRAINING

This is an UPDATE ONLY patch (two new assets and one local installer).

1. Extract this ZIP.
2. On Mac, open Terminal and run:
   bash ~/Downloads/outreach-overlay-patch/INSTALL.command ~/Desktop/demo.steadyhandsop.com
   (adjust the unzipped folder path if needed)
3. In Terminal:
   cd ~/Desktop/demo.steadyhandsop.com
   python3 -m http.server 8000
4. In your browser open http://localhost:8000/index.html?training=first-call

This patches your REAL existing index.html, call.html, and sales.html files in place.
It deletes the old standalone training.html / training.js / training.css files.
It does NOT change GitHub or connect to live data.
No login required for training, and other controls are blocked during the lesson.

NOTE: The walkthrough uses the current pages' actual targets, but substitutes
training-safe popup content and transcript so no real action is taken.
If your local demo has different IDs than the current repo version, the selectors
might need adjustment.
