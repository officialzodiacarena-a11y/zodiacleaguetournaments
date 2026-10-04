const fs = require('fs');
const file = 'app/spectator/control/[match_id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = {/* Add Video Form */}\\s*<div className="space-y-1.5 pt-1">\\s*<input[\\s\\S]*?<div className="flex gap-1.5">[\\s\\S]*?<input[\\s\\S]*?<button[\\s\\S]*?<Plus className="w-3.5 h-3.5" /> เพิ่มในคิว\\s*</button>\\s*</div>\\s*</div>;

const replacement = {/* Add Video Form */}
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="text"
                        value={playlistTitleInput}
                        onChange={(e) => setPlaylistTitleInput(e.target.value)}
                        placeholder="ชื่อคลิป (เช่น เพลงเปิดตัว / Intro Highlight)"
                        className="w-full bg-black/60 border border-white/10 rounded px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-amber-400 text-white placeholder-gray-500"
                        disabled={uploadingVdo}
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={playlistUrlInput}
                          onChange={(e) => setPlaylistUrlInput(e.target.value)}
                          placeholder="URL (YouTube / Twitch / Kick / Web)"
                          className="flex-1 bg-black/60 border border-white/10 rounded px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-amber-400 text-white placeholder-gray-500"
                          disabled={uploadingVdo}
                        />
                        <button
                          onClick={handleAddPlaylistItem}
                          disabled={uploadingVdo}
                          className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 rounded font-mono text-xs font-bold transition flex items-center gap-1 shrink-0 disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" /> เพิ่มในคิว
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className={\cursor-pointer px-3 py-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 rounded font-mono text-[10px] font-bold transition flex items-center gap-1 shrink-0 \\}>
                          <Video className="w-3.5 h-3.5" /> {uploadingVdo ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์วิดีโอ (.mp4)'}
                          <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleUploadVideo} disabled={uploadingVdo} />
                        </label>
                      </div>
                    </div>;

if (new RegExp(target).test(content)) {
  content = content.replace(new RegExp(target), replacement);
  fs.writeFileSync(file, content);
  console.log('Replaced successfully.');
} else {
  console.log('Target not found in file.');
}
