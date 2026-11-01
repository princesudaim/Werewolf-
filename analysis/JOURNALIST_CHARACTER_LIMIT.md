# Journalist headline correction — 2026-11-01

Owner clarified that “10 words” meant **10 characters**, e.g. `helloooooo`. This supersedes the earlier word-limit implementation.

The editor now limits both typing and paste to ten Unicode code points, including spaces and punctuation, and applies the limit again at submission. The counter and role descriptions say characters. Newspaper test fixtures were shortened rather than leaving assertions that could pass trivially after truncation. Drawings are unchanged.

Verified: TypeScript, production build, all 195 non-main-UI tests, seven focused Journalist/Mayor UI flows, and real Chromium sequential typing/paste followed by newspaper publication. Updated built Website and live preview. No Drive save requested for this change; last Drive backup still predates the Friends-message and headline changes.
